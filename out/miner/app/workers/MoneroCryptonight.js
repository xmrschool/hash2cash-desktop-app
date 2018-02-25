"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = require("path");
const BaseWorker_1 = require("./BaseWorker");
const utils_1 = require("../utils");
const utils_2 = require("../../../shared/utils");
class MoneroCryptonight extends BaseWorker_1.BaseWorker {
    constructor() {
        super(...arguments);
        this.workerName = 'MoneroCryptonight';
        this.path = '';
        this.parameters = {
            power: 100,
            priority: 2,
        };
        this.running = false;
    }
    get requiredModules() {
        return MoneroCryptonight.requiredModules;
    }
    get usesHardware() {
        return MoneroCryptonight.usesHardware;
    }
    get usesAccount() {
        return MoneroCryptonight.usesAccount;
    }
    getSpeeds() {
        return [
            {
                name: '🔥🔥 Ultra 🔥🔥',
                value: 100,
            },
            {
                name: '🔥 High',
                value: 75,
            },
            {
                name: 'Low',
                value: 50,
            },
            {
                name: 'Lowest',
                value: 25,
            },
            {
                name: 'Lowest possible',
                value: 10,
            },
        ];
    }
    getPriorities() {
        return [
            {
                name: 'Low',
                value: 0,
            },
            {
                name: 'Below normal',
                value: 1,
            },
            {
                name: 'Normal',
                value: 2,
            },
            {
                name: 'Above normal',
                value: 3,
            },
            {
                name: 'High',
                value: 4,
            },
            {
                name: '🔥 Realtime 🔥',
                value: 5,
            },
        ];
    }
    buildConfig() {
        return {
            algo: 'cryptonight',
            background: false,
            colors: false,
            retries: 5,
            'retry-pause': 5,
            'donate-level': 0,
            syslog: false,
            'log-file': './log.txt',
            'print-time': 60,
            av: 0,
            safe: false,
            'max-cpu-usage': 100,
            'cpu-priority': null,
            threads: null,
            pools: [
                {
                    url: this.getPool('cryptonight'),
                    user: localStorage.userId,
                    pass: 'x',
                    keepalive: true,
                    nicehash: false,
                },
            ],
            api: {
                port: 5913,
                'access-token': null,
                'worker-id': 'worker',
            },
        };
    }
    async getAppArgs() {
        this.daemonPort = await utils_2.getPort(25000);
        return `-l ./log.txt --donate-level 1 --api-port ${this.daemonPort} --print-time=1000 --max-cpu-usage ${this.parameters.power} --cpu-priority ${this.parameters.priority} -o ${this.getPool('cryptonight')} -u ${utils_1.getLogin('cryptonight')} -p x -k`.split(' ');
    }
    getCustomParameters() {
        return [
            {
                id: 'power',
                name: 'Power',
                values: this.getSpeeds(),
            },
            {
                id: 'priority',
                name: 'CPU priority',
                values: this.getPriorities(),
            },
        ];
    }
    async setCustomParameter(id, value) {
        try {
            this.getValue(id, value);
            this.parameters[id] = value;
            this.commit();
            return;
        }
        catch (e) {
            throw new utils_1.RuntimeError('Cannot set a custom property', e);
        }
    }
    async getStats() {
        try {
            if (!this.running) {
                throw new Error('Worker is not running');
            }
            const resp = await fetch(`http://127.0.0.1:${this.daemonPort}`);
            const json = await resp.json();
            return json;
        }
        catch (e) {
            throw new utils_1.RuntimeError('Failed to get stats', e);
        }
    }
    async getSpeed() {
        try {
            if (!this.running) {
                throw new Error("Worker is not running, so you can't get a speed");
            }
            const stats = await this.getStats();
            return stats.hashrate.total;
        }
        catch (e) {
            console.error('Failed to get speed: ', e);
            return [null, null, null];
        }
    }
    async start() {
        if (this.running)
            throw new Error('Miner already running');
        console.log('path is: ', this.path);
        const args = await this.getAppArgs();
        console.log('args: ', args);
        this.daemon = child_process_1.spawn(path.join(this.path, __WIN32__ ? 'xmrig.exe' : 'xmrig'), args);
        this.daemon.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
        });
        this.daemon.on('close', data => {
            this.running = false;
        });
        this.running = true;
        this.commit();
        return true;
    }
    async stop() {
        if (!this.running)
            throw new Error('Miner not running');
        this.daemon.kill();
        this.running = false;
        this.commit();
        return true;
    }
    async reload() {
        await this.stop();
        await this.start();
    }
    async toJSON() {
        return {
            name: MoneroCryptonight.name,
            usesHardware: MoneroCryptonight.usesHardware,
            running: this.running,
            requiredModules: MoneroCryptonight.requiredModules,
            usesAccount: MoneroCryptonight.usesAccount,
            options: this.getCustomParameters(),
            parameters: this.parameters,
            daemonPort: this.daemonPort,
        };
    }
}
MoneroCryptonight.requiredModules = ['cryptonight'];
MoneroCryptonight.usesHardware = ['cpu'];
MoneroCryptonight.usesAccount = 'XMR';
exports.default = MoneroCryptonight;
//# sourceMappingURL=MoneroCryptonight.js.map