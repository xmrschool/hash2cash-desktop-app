import { ipcRenderer } from 'electron';
import * as PQueue from 'p-queue';
import { defineMessages } from 'react-intl';
import { machineId } from 'node-machine-id';
import detectCuda, { Response as CudaResponse } from 'cuda-detector';
import detectOpencl, { Response as OpenCLResponse } from 'opencl-detector';
import cpuId, { CpuInfo } from 'cpuid-detector';
import { cpu } from 'systeminformation';
import { arch, release } from 'os';

import { Architecture } from '../../renderer/api/Api';
import trackError from '../raven';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { intl } from '../../renderer/intl';
import { sleep } from '../../renderer/utils/sleep';
import getMergedGpus, { PNPDevice } from '../windows/wmic';
// import getMergedGpus from '../windows/wmic';

export type Vendor = string;
export const gpuVendors = {
  NVIDIA: 'nvidia',
  AMD: 'amd',
  UNKNOWN: 'unknown',
};
const APP_VERSION = require('../../config.js').APP_VERSION;
const debug = require('debug')('app:detector');

const messages = defineMessages({
  unsupported: {
    id: 'core.hardwareCollector.unsupported',
    defaultMessage:
      "Your GPU vendor {vendor} is unsupported. There's nothing we can do with this.",
  },
  failedToGetOpenCl: {
    id: 'core.hardwareCollector.failedToGetOpenCl',
    defaultMessage:
      "Most likely this GPU won't work: try to update your drivers.",
  },
  cudaFailed: {
    id: 'core.hardwareCollector.cudaFailed',
    defaultMessage:
      'There is a problem with your Nvidia drivers, update them: nvidia.com/drivers',
  },
  cudaArchTooLow: {
    id: 'core.hardwareCollector.archTooLow',
    defaultMessage:
      'GPU architecture is too low, minimal required is sm_20, got sm_{major}{minor}',
  },
});

function determineGpuVendor(device: PNPDevice): Vendor {
  if (
    device.AdapterCompatibility === 'NVIDIA' ||
    device.Name.includes('NVIDIA')
  ) {
    return gpuVendors.NVIDIA;
  }

  if (
    device.AdapterCompatibility === 'Advanced Micro Devices, Inc.' ||
    device.Name.includes('AMD')
  ) {
    return gpuVendors.AMD;
  }

  return gpuVendors.UNKNOWN;
}

function determineOpenclVendor(vendor: string): Vendor {
  if (vendor.includes('NVIDIA')) return gpuVendors.NVIDIA;
  if (vendor === 'Advanced Micro Devices, Inc.') return gpuVendors.AMD;

  return gpuVendors.UNKNOWN;
}
// @ts-ignore
function checkVendor(
  vendor: string,
  type: 'gpu' | 'cpu',
  model: string,
  allowNvidia: boolean = false
): string | false {
  const lowerCased = vendor.toLowerCase();
  const lowerCasedModel = model.toLowerCase();

  if (lowerCased.includes('amd') || lowerCasedModel.includes('amd'))
    return 'amd';
  else if (type === 'gpu' && lowerCased.includes('nvidia'))
    // amd can be both cpu's and gpu's
    return allowNvidia ? 'nvidia' : false;
  else if (type === 'cpu' && lowerCased.includes('intel'))
    // nvidia have only gpu
    return 'intel';
  else {
    const messsage = intl.formatMessage(messages.unsupported, { vendor });
    throw new Error(messsage);
  }
}

export async function remoteCall(command: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    debug('Executing command: ', command);
    ipcRenderer.send('execute', command);
    ipcRenderer.once('execution-result', (_: any, result: any) => {
      debug('Received response for command %s: ', command, result);

      if (result.error) {
        return reject(new Error(result.error as any));
      }

      return resolve(result.result);
    });
  });
}

// @ts-ignore
const queue = new PQueue({ concurrency: 1 });

// What this function do? In case exception throwed, it reports and returns null
export async function safeGetter<T>(
  callback: () => Promise<T>,
  fallbackGetter: (() => Promise<T | false>) | undefined,
  name: String,
  errCallback?: (err: Error) => void
): Promise<T | null> {
  try {
    let result = await queue.add(() => Promise.race([callback(), sleep(6000)]));
    debug(`safeGetter(${name})(main getter) => `, result);
    // We noticed a guy who have "Unknown error" message...
    // That never happened, maybe it some kind of ipc error?
    if (
      fallbackGetter &&
      (!result ||
        (result &&
          (result as any).error &&
          (result as any).error.includes('unknown error')))
    ) {
      console.log(
        '[safeGetter] main getter has been failed, so using a fallback'
      );

      const temp = await Promise.race([fallbackGetter(), sleep(2000)]);
      if (temp === false) {
        throw new Error('Fallback action failed');
      }

      result = temp;
      debug(`safeGetter(${name})(fallback getter) => `, result);
    }
    return result || null;
  } catch (e) {
    if (errCallback) errCallback(e);
    const isOpenClMissing =
      e.message &&
      (e.message.includes('The specified module could not be found') ||
        e.message.includes('The specified procedure could not be found') ||
        e.message.includes('insufficient for CUDA runtime version'));

    console.error(`Failed in safeGetter(${name}): `, e);
    e.message = `safeGetter(${name}): ${e.message}`;
    if (!isOpenClMissing) trackError(e);
    return null;
  }
}

export default async function collectHardware(): Promise<Architecture> {
  console.time('hardwareCollecting');
  // Retrieve it natively. Works fine, everywhere
  const cpuInfo = await safeGetter<CpuInfo>(
    () => remoteCall("require('cpuid-detector')()"),
    () => cpuId(),
    'cpuid'
  );

  const wmicDevices = await safeGetter(
    () => getMergedGpus(),
    undefined,
    'wmic-gpus'
  );

  let collectedCpu = null;
  if (!cpuInfo) {
    collectedCpu = await safeGetter(cpu, undefined, 'systeminformation');
  }

  let uuid = await safeGetter(() => machineId(true), undefined, 'machineid');
  if (uuid === null) {
    if (localStorage.generatedUuid) {
      uuid = localStorage.generatedUuid as string;
    } else {
      uuid = (+new Date()).toString();
      localStorage.generatedUuid = uuid;
    }
  }
  const detectedArch = arch();

  const report: Architecture = {
    devices: [],
    warnings: [],
    uuid: uuid,
    appVersion: APP_VERSION,
    reportVersion: 3,
    cpuArch: (detectedArch === 'ia32' ? 'x32' : arch()) as 'x32' | 'x64',
    platformVersion: release(),
    wmicDevices,
  };

  if (cpuInfo) {
    report.devices.push({
      type: 'cpu',
      // Doesn't actually cared about vendor
      platform: cpuInfo.vendorName as 'amd' | 'intel',
      model: cpuInfo.brand,
      driverVersion: null,
      collectedInfo: cpuInfo,
    });
  } else if (collectedCpu) {
    report.devices.push({
      type: 'cpu',
      platform: collectedCpu.vendor,
      model: collectedCpu.brand,
      driverVersion: null,
      collectedInfo: collectedCpu,
    } as any);
  }

  /** An openCL and cuda devices.
   */
  const openCl =
    process.arch !== 'ia32'
      ? await safeGetter<OpenCLResponse>(
          () => remoteCall('require("opencl-detector")()'),
          async () => (localStorage.skipOpenCl ? false : detectOpencl()),
          'openCl',
          err => {
            // Disable OpenCL if its been crashed
            if (err && err.message && err.message.includes('crashed')) {
              localStorage.skipOpenCl = true;
            }
          }
        )
      : null;
  // CudaFailReason - is a variable to pass `unavailableReason` later.
  let cudaFailReason: string | undefined;
  const cuda =
    process.arch !== 'ia32'
      ? await safeGetter<CudaResponse>(
          () => detectCuda(),
          undefined,
          'cuda',
          err => (cudaFailReason = err.message)
        )
      : null;

  if (cuda && cuda.error) {
    cudaFailReason = cuda.error;
  }
  if (cudaFailReason) {
    console.warn(
      'Failed to get CUDA devices through native extension: ',
      cudaFailReason
    );
  }

  const doesCudaFailed =
    cuda === null ||
    typeof cuda.error !== 'undefined' ||
    cuda.driverVersion === 0 ||
    (cuda.devices && cuda.devices.length === 0);

  // Check if there is no error and there are devices
  const doesOpenClFailed = !openCl || !!openCl.error || !openCl.devices;

  debug('Collected raw devices: ', { openCl, cuda, wmicDevices, cpuInfo });
  // This is a fallback for opencl getter.
  if (doesOpenClFailed) {
    if (wmicDevices)
      wmicDevices.forEach(device => {
        const vendor = determineGpuVendor(device);

        // We don't want to have unknown vendors in our list. Also, we don't
        // want to have NVIDIA in case we correctly can handle it.
        if (
          vendor === gpuVendors.UNKNOWN ||
          (!doesCudaFailed && vendor === gpuVendors.NVIDIA)
        ) {
          return;
        }

        try {
          report.devices.push({
            type: 'gpu',
            platform: vendor === gpuVendors.NVIDIA ? 'cuda' : 'opencl',
            deviceID: device.DeviceId,
            model: device.Name,
            collectedInfoType: 'wmic',
            wmic: device,
            collectedInfo: {} as any,
            warning: intl.formatMessage(messages.failedToGetOpenCl),
          } as any); // ToDo not really fitting typings
        } catch (e) {
          console.error('Failed to emit device: ', e);
        }
      });
  } else {
    localStorage.removeItem('skipOpenCl');
    // We have OpenCL devices available (Ya-hoo!)
    openCl!.devices.forEach(device => {
      try {
        const vendor = determineOpenclVendor(device.vendor);
        const wmicDevice = wmicDevices
          ? wmicDevices.find(
              d =>
                typeof d.Location !== 'undefined' &&
                d.Location.bus === device.busId
            )
          : null;

        if (
          vendor === gpuVendors.UNKNOWN ||
          (vendor === gpuVendors.NVIDIA && !doesCudaFailed)
        )
          return; // Do not emit nvidia gpu's, let deviceCollector do that thing
        const merge =
          vendor === gpuVendors.NVIDIA
            ? { warning: intl.formatMessage(messages.cudaFailed) }
            : {};

        report.devices.push({
          type: 'gpu',
          platform: 'opencl',
          // We have to implicitly set the memory. AMD are stupid, so they are declaring integrated GPU memory as discrete GPU.
          memory: wmicDevice
            ? Number(wmicDevice.AdapterRam) / 1024 / 1024
            : device.memory,
          deviceID: device.index ? `opencl-${device.index}` : '',
          wmic: wmicDevice || undefined,
          model: wmicDevice ? wmicDevice.Name : device.name,
          collectedInfo: device,
          ...merge,
        });
      } catch (e) {
        console.error('Failed to emit OpenCL device: ', e);
        report.devices.push({
          type: 'gpu',
          platform: 'opencl',
          deviceID: report.devices.length.toString(),
          model: device.name,
          warning: e.message,
          collectedInfo: device,
        });

        report.warnings.push(e.message);
      }
    });
  }

  // Then emit cuda devices
  if (!doesCudaFailed && cuda) {
    cuda.devices.forEach(device => {
      try {
        const wmicDevice = wmicDevices
          ? wmicDevices.find(
              d =>
                typeof d.Location !== 'undefined' &&
                d.Location.bus === device.pciBusId
            )
          : null;

        if (device.major < 2) {
          return report.devices.push({
            type: 'gpu',
            platform: 'cuda',
            deviceID: device.pciDeviceID ? device.pciDeviceID.toString() : '',
            model: wmicDevice ? wmicDevice.Name : device.name,
            collectedInfo: device,
            wmic: wmicDevice,
            unavailableReason: intl.formatMessage(messages.cudaArchTooLow, {
              major: device.major,
              minor: device.minor,
            }),
          } as any);
        }

        return report.devices.push({
          type: 'gpu',
          platform: 'cuda',
          wmic: wmicDevice,
          deviceID: device.pciDeviceID ? device.pciDeviceID.toString() : '',
          model: device.name,
          collectedInfo: device,
        } as any);
      } catch (e) {
        console.error('Failed to emit CUDA device', e);

        return null;
      }
    });
  }

  if (['win32', 'darwin', 'linux'].includes(process.platform)) {
    report.platform = process.platform as any;
  } else {
    const error = new Error(
      `Your platform (OS) is unsupported [${
        process.platform
      }]. It's strange, we will investigate this error`
    );

    trackError(error);
    throw error;
  }

  LocalStorage.collectedReport = report;
  LocalStorage.rawCollectedReport = {
    openCl,
    cuda,
  } as any;

  console.timeEnd('hardwareCollecting');

  return report;
}
