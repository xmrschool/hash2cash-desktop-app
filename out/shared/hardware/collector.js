"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const systeminformation_1 = require("systeminformation");
function checkVendor(vendor, type) {
    const lowerCased = vendor.toLowerCase();
    if (lowerCased.includes('amd'))
        return 'amd';
    else if (type === 'gpu' && lowerCased.includes('nvidia'))
        // amd can be both cpu's and gpu's
        return 'nvidia';
    else if (type === 'cpu' && lowerCased.includes('intel'))
        // nvidia have only gpu
        return 'intel';
    else
        throw new Error(`Your ${type.toUpperCase()} vendor (${vendor}) is unsupported. If you think that is mistake, try to update your drivers`);
}
async function collectHardware() {
    console.time('hardwareCollecting');
    const { controllers } = await systeminformation_1.graphics();
    const collectedCpu = await systeminformation_1.cpu();
    const uuid = (await systeminformation_1.system()).uuid.toLowerCase();
    const report = { devices: [], warnings: [], uuid };
    if (['win32', 'darwin', 'linux'].includes(process.platform)) {
        report.platform = process.platform;
    }
    else
        throw new Error("Your platform (OS) is unsupported. It's strange, we will try to investigate your problem.");
    controllers.forEach((gpu, index) => {
        try {
            const platform = checkVendor(gpu.vendor, 'gpu');
            report.devices.push({
                type: 'gpu',
                platform,
                deviceID: index.toString(),
                model: gpu.model,
                collectedInfo: gpu,
            });
        }
        catch (e) {
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
        const cpuVendor = checkVendor(collectedCpu.vendor, 'cpu');
        report.devices.push({
            type: 'cpu',
            platform: cpuVendor,
            model: collectedCpu.brand,
            driverVersion: null,
            collectedInfo: collectedCpu,
        });
    }
    catch (e) {
        report.warnings.push(e.message);
    }
    console.timeEnd('hardwareCollecting');
    return report;
}
exports.default = collectHardware;
//# sourceMappingURL=collector.js.map