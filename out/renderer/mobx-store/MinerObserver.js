"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const CurrenciesService_1 = require("./CurrenciesService");
const GlobalState_1 = require("./GlobalState");
// This class observes speed of miner
class MinerObserver {
    constructor() {
        this.workers = [];
    }
    async updateWorkerData(name) {
        const worker = this.workers.find(w => w.name === name);
        if (!worker) {
            throw new Error('Worker not found');
        }
        if (!worker._data.running)
            return;
        const speed = await worker._data.getSpeed();
        worker.latestSpeed = speed[0];
        worker.speedPerMinute = speed[1];
    }
    observe(worker) {
        if (!worker.data || !worker.data.running) {
            throw new Error('To observe this worker you must run it');
        }
        if (this.workers.find(w => w.name === worker.name)) {
            throw new Error('This worker is already observing');
        }
        this.workers.push({
            name: worker.name,
            latestSpeed: null,
            speedPerMinute: null,
            _interval: setInterval(() => this.updateWorkerData(worker.name), 10000),
            _data: worker,
        });
    }
    dailyProfit(worker) {
        const currency = worker._data.data.usesAccount;
        const service = CurrenciesService_1.default.ticker[currency];
        const speed = worker.speedPerMinute || worker.latestSpeed || 0;
        const hashesPerDay = speed * 60 * 60 * 24; // speed per day, non-stop of course
        // What does formule looks like? (<solved_hashes>/<global_difficulty>) * <block_reward> * 0.7
        const localCurrency = hashesPerDay /
            service.difficulty *
            service.blockReward *
            GlobalState_1.default.userShare;
        return localCurrency;
    }
}
__decorate([
    mobx_1.observable
], MinerObserver.prototype, "workers", void 0);
__decorate([
    mobx_1.action
], MinerObserver.prototype, "updateWorkerData", null);
__decorate([
    mobx_1.action
], MinerObserver.prototype, "observe", null);
exports.MinerObserver = MinerObserver;
exports.default = new MinerObserver();
//# sourceMappingURL=MinerObserver.js.map