"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const lodash_1 = require("lodash");
const workers_1 = require("./workers");
const workersCache_1 = require("./workersCache");
const algorithms_1 = require("./constants/algorithms");
const config = require('../../config.js');
const debug = require('debug')('app:server:utils');
class RuntimeError extends Error {
    constructor(displayError, originalError) {
        super(displayError);
        this.stack = new Error().stack;
        this.message = displayError;
        this.originalError = originalError;
    }
    toJSON() {
        return {
            error: {
                message: this.message,
                raw: this.originalError,
                stack: this.stack,
            },
        };
    }
}
exports.RuntimeError = RuntimeError;
async function getManifest() {
    try {
        debug('Full path to manifest: %s', path.join(config.MINERS_PATH, 'manifest.json'));
        const content = await fs.readFile(path.join(config.MINERS_PATH, 'manifest.json'));
        return JSON.parse(content.toString());
    }
    catch (e) {
        throw new RuntimeError('Manifest is unavailable. Try to reinit app', e);
    }
}
exports.getManifest = getManifest;
async function updateWorkersInCache() {
    try {
        const manifest = await getManifest();
        const outerWorkers = workers_1.default.filter(worker => {
            return (lodash_1.difference(worker.requiredModules, manifest.map(d => d.name)).length ===
                0);
        });
        outerWorkers.forEach(worker => {
            workersCache_1.default.set(worker.name, new worker());
        });
        console.log('cache is :', workersCache_1.default);
        for (const [key, value] of workersCache_1.default) {
            console.log('key is', key);
            await value.init();
        }
    }
    catch (e) {
        if (e instanceof RuntimeError)
            throw e;
        throw new RuntimeError('Unexpected error', e);
    }
}
exports.updateWorkersInCache = updateWorkersInCache;
async function getWorkers(updateCache = false) {
    if (updateCache || workersCache_1.default.size === 0) {
        for (const workerName in workersCache_1.default.keys()) {
            await workersCache_1.default.get(workerName).stop();
        }
        workersCache_1.default.clear();
        await updateWorkersInCache();
    }
    return workersCache_1.default;
}
exports.getWorkers = getWorkers;
function getLogin(algorithm) {
    return `${localStorage.userId}+${getDifficulty(algorithm)}`;
}
exports.getLogin = getLogin;
function getDifficulty(algorithm) {
    try {
        const benchmark = JSON.parse(localStorage.benchmark).data;
        return benchmark[algorithm].speed * 60;
    }
    catch (e) {
        const fallback = algorithms_1.algorithmsDefaultDiff[algorithm];
        console.error(`Failed to get benchmark... Using ${fallback} as fallback`, e);
        return fallback;
    }
}
exports.getDifficulty = getDifficulty;
//# sourceMappingURL=utils.js.map