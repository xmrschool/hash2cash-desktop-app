import { ipcRenderer } from 'electron';
import { defineMessages } from 'react-intl';
import { machineId } from 'node-machine-id';
import detectCuda, { Response as CudaResponse } from 'cuda-detector';
import detectOpencl, { Response as OpenCLResponse } from 'opencl-detector';
import cpuId, { CpuInfo } from 'cpuid-detector';
import { cpu, graphics } from 'systeminformation';
import { arch, release } from 'os';

import { Architecture } from '../../renderer/api/Api';
import trackError from '../raven';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { intl } from '../../renderer/intl';
import { sleep } from '../../renderer/utils/sleep';

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
    ipcRenderer.send('execute', command);
    ipcRenderer.once('execution-result', (_: any, result: any) => {
      debug('Received response: ', result);

      if (result.error) {
        return reject(new Error(result.error as any));
      }

      return resolve(result.result);
    });
  });
}

// What this function do? In case exception throwed, it reports and returns null
export async function safeGetter<T>(
  callback: () => Promise<T>,
  fallbackGetter: (() => Promise<T | false>) | undefined,
  name: String,
  errCallback?: (err: Error) => void
): Promise<T | null> {
  try {
    let result = await Promise.race([callback(), sleep(2000)]);
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

  debug('cpu info: ', cpuInfo);
  let collectedCpu = null;
  if (!cpuInfo) {
    collectedCpu = await safeGetter(cpu, undefined, 'systeminformation');
  }

  debug('collected cpu: ', collectedCpu);

  let uuid = await safeGetter(() => machineId(true), undefined, 'machineid');
  if (uuid === null) {
    if (localStorage.generatedUuid) {
      uuid = localStorage.generatedUuid as string;
    } else {
      uuid = (+new Date()).toString();
      localStorage.generatedUuid = uuid;
    }
  }

  debug('uuid: ', uuid);
  const detectedArch = arch();

  const report: Architecture = {
    devices: [],
    warnings: [],
    uuid: uuid,
    appVersion: APP_VERSION,
    reportVersion: 2,
    cpuArch: (detectedArch === 'ia32' ? 'x32' : arch()) as 'x32' | 'x64',
    platformVersion: release(),
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
          () => remoteCall('require("cuda-detector")()'),
          () => detectCuda(),
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

  // This is a fallback for opencl getter.
  if (doesOpenClFailed) {
    const graphicsResult = await graphics();
    if (graphicsResult && graphicsResult.controllers) {
      const { controllers } = graphicsResult;

      controllers.forEach((gpu, index) => {
        try {
          const platform = checkVendor(
            gpu.vendor,
            'gpu',
            gpu.model,
            doesCudaFailed
          ) as any;

          if (platform === false) return; // Do not emit nvidia gpu's, let deviceCollector do that thing

          report.devices.push({
            type: 'gpu',
            platform: 'opencl',
            deviceID: report.devices.length.toString(),
            model: gpu.model,
            collectedInfo: gpu as any,
            warning: intl.formatMessage(messages.failedToGetOpenCl),
          });
        } catch (e) {
          report.devices.push({
            type: 'gpu',
            platform: 'opencl',
            deviceID: report.devices.length.toString(),
            model: gpu.model,
            unavailableReason: e.message,
            collectedInfo: gpu as any,
          });

          report.warnings.push(e.message);
        }
      });
    } else {
      console.error(
        'Failed to even get from system information...',
        graphicsResult
      );
      trackError(new Error('Failed to get from system-information'), {
        graphicsResult,
        openCl,
      });
    }
  } else {
    localStorage.removeItem('skipOpenCl');
    // We have OpenCL devices available (Ya-hoo!)
    openCl!.devices.forEach(device => {
      try {
        const platform = checkVendor(
          device.vendor,
          'gpu',
          device.name,
          doesCudaFailed
        ) as any;

        if (platform === false) return; // Do not emit nvidia gpu's, let deviceCollector do that thing
        const merge =
          platform === 'nvidia'
            ? { warning: intl.formatMessage(messages.cudaFailed) }
            : {};
        report.devices.push({
          type: 'gpu',
          platform: 'opencl',
          deviceID: device.index ? `opencl-${device.index}` : '',
          model: device.name,
          collectedInfo: device,
          ...merge,
        });
      } catch (e) {
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
      if (device.major < 2) {
        return report.devices.push({
          type: 'gpu',
          platform: 'cuda',
          deviceID: device.pciDeviceID ? device.pciDeviceID.toString() : '',
          model: device.name,
          collectedInfo: device,
          unavailableReason: intl.formatMessage(messages.cudaArchTooLow, {
            major: device.major,
            minor: device.minor,
          }),
        });
      }

      return report.devices.push({
        type: 'gpu',
        platform: 'cuda',
        deviceID: device.pciDeviceID ? device.pciDeviceID.toString() : '',
        model: device.name,
        collectedInfo: device,
      });
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
