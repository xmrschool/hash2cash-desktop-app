import { defineMessages } from 'react-intl';
import { machineId } from 'node-machine-id';
import getCudaDevices from 'cuda-detector';
import getOpenCLDevices from 'opencl-detector';
import { cpu, graphics } from 'systeminformation';
import { arch, release } from 'os';

import { Architecture } from '../../renderer/api/Api';
import trackError from '../raven';
import getDevices from 'cpuid-detector';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { intl } from '../../renderer/intl';

const debug = require('debug')('app:detector');

const messages = defineMessages({
  unsupported: {
    id: 'core.hardwareCollector.unsupported',
    defaultMessage:
      'Your GPU vendor ({vendor}) is unsupported. Contact us if you think that is mistake, or update your drivers',
  },
  cudaFailed: {
    id: 'core.hardwareCollector.cudaFailed',
    defaultMessage: 'Driver for GPU is outdated, download new from nvidia.com',
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

// What this function do? In case exception throwed, it reports and returns null
export async function safeGetter<T>(
  callback: () => Promise<T>,
  name: String,
  errCallback?: (err: Error) => void
): Promise<T | null> {
  try {
    const result = await callback();
    debug(`safeGetter(${name}): `, result);
    return result;
  } catch (e) {
    errCallback && errCallback(e);
    console.error(`Failed in safeGetter(${name}): `, e);
    e.message = `safeGetter(${name}): ${e.message}`;
    trackError(e);
    return null;
  }
}

export default async function collectHardware(): Promise<Architecture> {
  console.time('hardwareCollecting');
  // Retrieve it natively. Works fine, everywhere
  const cpuInfo = await safeGetter(getDevices, 'cpuid');

  let collectedCpu = null;
  if (collectedCpu) {
    collectedCpu = await safeGetter(cpu, 'systeminformation');
  }

  const uuid = await machineId(true);

  const detectedArch = arch();

  const report: Architecture = {
    devices: [],
    warnings: [],
    uuid,
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
    const cpuVendor = checkVendor(
      collectedCpu.vendor,
      'cpu',
      collectedCpu.model
    ) as any;

    report.devices.push({
      type: 'cpu',
      platform: cpuVendor,
      model: collectedCpu.brand,
      driverVersion: null,
      collectedInfo: collectedCpu,
    });
  }

  /** An openCL and cuda devices.
   * ToDo Works almost fine, but fails somewhere. So, we should provide ability to disable this.
   * I dunno how to fix it, maybe, include OpenCL.dll somehow?
   */
  const openCl =
    !localStorage.skipOpenCl && process.arch !== 'ia32'
      ? await safeGetter(getOpenCLDevices, 'openCl')
      : null;
  // CudaFailReason - is a variable to pass `unavailableReason` later.
  let cudaFailReason: string | undefined;
  const cuda =
    process.arch !== 'ia32'
      ? await safeGetter(
          getCudaDevices,
          'cuda',
          err => (cudaFailReason = err.message)
        )
      : null;

  if (cudaFailReason) {
    console.warn(
      'Failed to get CUDA devices through native extension: ',
      cudaFailReason
    );
  }
  // This is a fallback for opencl getter.
  if (!openCl) {
    const graphicsResult = await graphics();
    if (graphicsResult && graphicsResult.controllers) {
      const { controllers } = graphicsResult;

      controllers.forEach((gpu, index) => {
        try {
          const platform = checkVendor(
            gpu.vendor,
            'gpu',
            gpu.model,
            cuda === null
          ) as any;

          if (platform === false) return; // Do not emit nvidia gpu's, let deviceCollector do that thing
          const merge =
            cuda === null
              ? { unavailableReason: intl.formatMessage(messages.cudaFailed) }
              : {};

          report.devices.push({
            type: 'gpu',
            platform,
            deviceID: report.devices.length.toString(),
            model: gpu.model,
            collectedInfo: gpu as any,
            ...merge,
          });
        } catch (e) {
          trackError(new Error('Unsupported gpu'), { gpu });
          report.devices.push({
            type: 'gpu',
            platform: gpu.vendor as any,
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
    // We have OpenCL devices available (Ya-hoo!)

    // Emit devices which aren't Cuda powered
    openCl.devices
      .filter(
        d =>
          !d.deviceVersion.includes('CUDA') &&
          d.vendor.toLowerCase() !== 'nvidia'
      )
      .forEach(device => {
        report.devices.push({
          type: 'gpu',
          platform: 'opencl',
          deviceID: device.index ? `opencl-${device.index}` : '',
          model: device.name,
          collectedInfo: device,
        });
      });

    // Then, if it failed too, emit it too
    if (cudaFailReason) {
      // If cuda has been failed, we emit messages about it
      openCl.devices
        .filter(d => d.deviceVersion.includes('CUDA'))
        .forEach(device => {
          report.devices.push({
            type: 'gpu',
            platform: 'opencl',
            deviceID: device.index ? `opencl-${device.index}` : '',
            model: device.name,
            collectedInfo: device,
            unavailableReason: intl.formatMessage(messages.cudaFailed),
          });
        });
    }
  }

  // Then emit cuda devices
  if (cuda) {
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
