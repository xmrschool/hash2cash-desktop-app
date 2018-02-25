"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorSet = new Set();
exports.errorSet = errorSet;
function writeLog(type, context, message, additionalInfo) {
    if (process.env.NODE_ENV !== 'production')
        errorSet.add([new Date(), type, context, message, additionalInfo]);
}
exports.default = writeLog;
exports.writeLog = writeLog;
//# sourceMappingURL=eventLog.js.map