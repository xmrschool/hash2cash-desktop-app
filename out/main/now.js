"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Get the time from some arbitrary fixed starting point. The time will not be
 * based on clock time.
 *
 * Ideally we'd just use `performance.now` but that's a browser API and not
 * available in our Plain Old Node main process environment.
 */
function now() {
    const time = process.hrtime();
    return time[0] * 1000 + time[1] / 1000000;
}
exports.now = now;
//# sourceMappingURL=now.js.map