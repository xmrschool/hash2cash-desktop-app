"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const path = require("path");
const config = require('../../../config.js');
/**
 * Every worker must extend this class.
 * <P> is Enum allowed parameters
 *
 * @extends {EventEmitter}
 */
class BaseWorker extends events_1.EventEmitter {
    constructor() {
        super();
    }
    getValue(id, value) {
        const findProperty = this.getCustomParameters().find(d => d.id === id);
        if (!findProperty)
            throw new Error("ID of this param doesn't exist");
        const findValue = findProperty.values.find(d => d.value === value);
        if (!findValue)
            throw new Error("Specified value doesn't exist");
        return findValue;
    }
    getPool(algorithm) {
        try {
            const parsed = JSON.parse(localStorage.appInfo).pools;
            return parsed[algorithm].url || null;
        }
        catch (e) {
            console.error('Failed to get an pool URL: ', e);
            return null;
        }
    }
    async reload() {
        await this.stop();
        await this.start();
    }
    get workerKey() {
        return 'storage:' + this.workerName;
    }
    commit() {
        localStorage.setItem(this.workerKey, JSON.stringify({
            parameters: this.parameters,
            running: this.running,
        }));
    }
    async init() {
        console.log('init is called');
        try {
            console.log(config.MINERS_PATH, this.requiredModules[0]);
            this.path = path.join(config.MINERS_PATH, this.requiredModules[0]);
            const possibleJson = await localStorage.getItem(this.workerKey);
            if (possibleJson) {
                const parsed = JSON.parse(possibleJson);
                if (parsed.parameters) {
                    this.parameters = parsed.parameters;
                }
                if (parsed.running) {
                    await this.start();
                }
            }
        }
        catch (e) {
            console.error('Failed to initialize worker! ', e);
            // Rollback
            localStorage.removeItem(this.workerKey);
        }
        this.emit('inited');
    }
    updateCache() {
        const value = {
            parameters: this.parameters,
            running: this.running,
        };
        localStorage.setItem(this.workerKey, JSON.stringify(value));
    }
}
exports.BaseWorker = BaseWorker;
//# sourceMappingURL=BaseWorker.js.map