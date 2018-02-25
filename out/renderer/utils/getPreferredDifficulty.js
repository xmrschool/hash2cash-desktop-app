"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Hashrate per second multiplied by 60 seconds
function getDifficulty(algorithm) {
    try {
        const benchmarks = JSON.parse(localStorage.benchmarks).data;
        return benchmarks[algorithm].hashrate * 60;
    }
    catch (e) {
        // 3000 is default
        return 3000;
    }
}
exports.default = getDifficulty;
//# sourceMappingURL=getPreferredDifficulty.js.map