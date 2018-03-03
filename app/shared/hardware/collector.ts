import { graphics, cpu, system } from 'systeminformation';
import { arch } from 'os';
import { Architecture } from '../../renderer/api/Api';

function checkVendor(
  vendor: string,
  type: 'gpu' | 'cpu',
  model: string
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
      `Your ${type.toUpperCase()} vendor (${vendor}) is unsupported. If you think that is mistake, try to update your drivers`
    );
}

export default async function collectHardware(): Promise<Architecture> {
  console.time('hardwareCollecting');
  const { controllers } = await graphics();
  const collectedCpu = await cpu();
  const uuid = (await system()).uuid.toLowerCase();

  const report: Architecture = {
    devices: [],
    warnings: [],
    uuid,
    cpuArch: arch() as 'x32' | 'x64',
  };
  if (['win32', 'darwin', 'linux'].includes(process.platform)) {
    report.platform = process.platform as any;
  } else
    throw new Error(
      "Your platform (OS) is unsupported. It's strange, we will try to investigate your problem."
    );

  controllers.forEach((gpu, index) => {
    try {
      const platform = checkVendor(gpu.vendor, 'gpu', gpu.model) as any;

      if (platform === false) return; // Do not emit nvidia gpu's, let deviceCollector do that thing
      report.devices.push({
        type: 'gpu',
        platform,
        deviceID: report.devices.length.toString(),
        model: gpu.model,
        collectedInfo: gpu,
      });
    } catch (e) {
      report.devices.push({
        type: 'gpu',
        platform: gpu.vendor as any,
        deviceID: report.devices.length.toString(),
        model: gpu.model,
        unavailableReason: e.message,
        collectedInfo: gpu,
      });

      report.warnings.push(e.message);
    }
  });

  try {
    const cudaGpus = [] as any;

    // We dont care about systeminformation gpu's, instead we collect from our build library
    if (cudaGpus.error) {
      console.error('Failed to get any cuda devices: ', cudaGpus.error);
    } else {
      cudaGpus.devices.forEach((device: any) =>
        report.devices.push({
          type: 'gpu',
          deviceID: report.devices.length.toString(),
          platform: 'nvidia',
          model: device.name,
          collectedInfo: device,
        })
      );
    }
  } catch (e) {
    console.error('failed to get cuda devices: ', e);
  }

  try {
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
  } catch (e) {
    report.warnings.push(e.message);
  }

  localStorage.collectedReport = JSON.stringify(report);

  console.timeEnd('hardwareCollecting');

  return report;
}
