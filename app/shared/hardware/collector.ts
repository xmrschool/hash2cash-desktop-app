import getCudaDevices from 'cuda-detector';
import getOpenCLDevices from 'opencl-detector';
import { cpu, graphics, system } from 'systeminformation';
import { arch } from 'os';

import { Architecture } from '../../renderer/api/Api';
import trackError from '../raven';

function checkVendor(
  vendor: string,
  type: 'gpu' | 'cpu',
  model: string,
): string | false {
  const lowerCased = vendor.toLowerCase();
  const lowerCasedModel = model.toLowerCase();

  if (lowerCased.includes('amd') || lowerCasedModel.includes('amd'))
    return 'amd';
  else if (type === 'gpu' && lowerCased.includes('nvidia'))
    // amd can be both cpu's and gpu's
    return false;
  else if (type === 'cpu' && lowerCased.includes('intel'))
    // nvidia have only gpu
    return 'intel';
  else
    throw new Error(
      `Your ${type.toUpperCase()} vendor (${vendor}) is unsupported. If you think that is mistake, try to update your drivers`,
    );
}

export default async function collectHardware(): Promise<Architecture> {
  console.time('hardwareCollecting');
  const collectedCpu = await cpu();
  const uuid = (await system()).uuid.toLowerCase();

  let openCl;
  try {
    openCl = await getOpenCLDevices();
  } catch (e) {
    // ToDo Shit happens, sometimes can't get openCL devices
    console.error(
      'Failed to get OpenCL devices\n',
      '\nUsing default given as fallback',
    );

    const { controllers } = await graphics();

    controllers.forEach((gpu, index) => {
      try {
        const platform = checkVendor(gpu.vendor, 'gpu', gpu.model) as any;

        if (platform === false) return; // Do not emit nvidia gpu's, let deviceCollector do that thing
        report.devices.push({
          type: 'gpu',
          platform,
          deviceID: report.devices.length.toString(),
          model: gpu.model,
          collectedInfo: gpu as any,
        });
      } catch (e) {
        trackError(new Error('unsupported gpu'), { extra: { gpu } });
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
  }

  let cuda;
  let cudaFailReason: string | undefined;
  try {
    cuda = await getCudaDevices();
  } catch (e) {
    cudaFailReason = e.message;
  }

  const detectedArch = arch();

  const report: Architecture = {
    devices: [],
    warnings: [],
    uuid,
    cpuArch: (detectedArch === 'ia32' ? 'x32' : arch()) as 'x32' | 'x64',
  };
  if (['win32', 'darwin', 'linux'].includes(process.platform)) {
    report.platform = process.platform as any;
  } else {
    const error = new Error(
      `Your platform (OS) is unsupported [${
        process.platform
      }]. It's strange, we will try to investigate your problem.`,
    );

    trackError(error);
    throw error;
  }

  console.log('Collected cuda devices: ', cuda, '\nOpenCL: ', openCl);

  cuda &&
    cuda.devices.forEach(device => {
      report.devices.push({
        type: 'gpu',
        platform: 'cuda',
        deviceID: device.pciDeviceID ? device.pciDeviceID.toString() : '',
        model: device.name,
        collectedInfo: device,
      });
    });

  openCl &&
    openCl.devices
      .filter(d => !d.deviceVersion.includes('CUDA'))
      .forEach(device => {
        report.devices.push({
          type: 'gpu',
          platform: 'opencl',
          deviceID: device.index ? `opencl-${device.index}` : '',
          model: device.name,
          collectedInfo: device,
        });
      });

  if (cudaFailReason && openCl) {
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
          unavailableReason: cudaFailReason,
        });
      });
  }

  try {
    const cpuVendor = checkVendor(
      collectedCpu.vendor,
      'cpu',
      collectedCpu.model,
    ) as any;

    report.devices.push({
      type: 'cpu',
      platform: cpuVendor,
      model: collectedCpu.brand,
      driverVersion: null,
      collectedInfo: collectedCpu,
    });
  } catch (e) {
    trackError(e);
    report.warnings.push(e.message);
  }

  localStorage.collectedReport = JSON.stringify(report);
  localStorage._rawCollectedReport = JSON.stringify({
    openCl,
    cuda,
  });

  console.timeEnd('hardwareCollecting');

  return report;
}
