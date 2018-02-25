import { graphics, cpu, system } from 'systeminformation';
import { Architecture } from '../../renderer/api/Api';

function checkVendor(vendor: string, type: 'gpu' | 'cpu') {
  const lowerCased = vendor.toLowerCase();

  if (lowerCased.includes('amd')) return 'amd';
  else if (type === 'gpu' && lowerCased.includes('nvidia'))
    // amd can be both cpu's and gpu's
    return 'nvidia';
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
  const { controllers } = await graphics();
  const collectedCpu = await cpu();
  const uuid = (await system()).uuid.toLowerCase();

  const report: Architecture = { devices: [], warnings: [], uuid };
  if (['win32', 'darwin', 'linux'].includes(process.platform)) {
    report.platform = process.platform as any;
  } else
    throw new Error(
      "Your platform (OS) is unsupported. It's strange, we will try to investigate your problem.",
    );

  controllers.forEach((gpu, index) => {
    try {
      const platform = checkVendor(gpu.vendor, 'gpu') as any;

      report.devices.push({
        type: 'gpu',
        platform,
        deviceID: index.toString(),
        model: gpu.model,
        collectedInfo: gpu,
      });
    } catch (e) {
      report.devices.push({
        type: 'gpu',
        deviceID: index.toString(),
        model: gpu.model,
        unavailableReason: e.message,
        collectedInfo: gpu,
      });

      report.warnings.push(e.message);
    }
  });

  try {
    const cpuVendor = checkVendor(collectedCpu.vendor, 'cpu') as any;

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

  console.timeEnd('hardwareCollecting');

  return report;
}
