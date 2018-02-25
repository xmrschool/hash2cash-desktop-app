"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queryString = require("querystring");
const lodash_1 = require("lodash");
const GlobalState_1 = require("../mobx-store/GlobalState");
const CurrenciesService_1 = require("../mobx-store/CurrenciesService");
class Worker {
    constructor(json) {
        this.data = json;
    }
    get name() {
        return this.data.name;
    }
    get running() {
        return this.data.running;
    }
    get customParameters() {
        return this.data.options;
    }
    async setCustomParameter(id, value) {
        const resp = await minerApi.fetch(`/miners/${this.data.name}/setCustomParameter`, { id, value });
        this.data.parameters[id] = value;
        return resp;
    }
    // Daemon management
    async start() {
        const resp = await minerApi.fetch(`/workers/${this.data.name}/start`);
        this.data.running = true;
        return resp;
    }
    async stop() {
        const resp = await minerApi.fetch(`/workers/${this.data.name}/stop`);
        this.data.running = false;
        return resp;
    }
    async reload() {
        const resp = await minerApi.fetch(`/workers/${this.data.name}/reload`);
        this.data.running = !!this.data.running;
        return resp;
    }
    async getSpeed() {
        return minerApi.fetch(`/workers/${this.data.name}/getSpeed`);
    }
}
exports.Worker = Worker;
class Api {
    constructor() {
        this.workers = [];
    }
    get host() {
        return 'http://127.0.0.1:' + GlobalState_1.default.minerPort;
    }
    // What does this algorithm do? Sorts by usedHardware, orders by profitability
    findMostProfitableWorkers() {
        const ticker = CurrenciesService_1.default.ticker;
        console.log('workers are: ', this.workers);
        const groupedWorkers = lodash_1.groupBy(this.workers, object => {
            console.log('obj is : ', object);
            return object.data.usesHardware[0];
        });
        console.log('Workers are grouped: ', groupedWorkers);
        const keys = Object.keys(groupedWorkers);
        keys.forEach(hardware => {
            groupedWorkers[hardware] = lodash_1.sortBy(groupedWorkers[hardware], [
                (worker) => {
                    return ticker[worker.data.usesAccount].profitability;
                },
            ]);
        });
        return groupedWorkers;
    }
    async getWorkers() {
        const response = (await this.fetch('/workers?asArray=true'));
        this.workers = response.map(d => new Worker(d));
        return this.workers;
    }
    workerByName(name) {
        return this.workers.find(d => d.name === name);
    }
    stopAll() {
        return this.fetch('/workers/stop');
    }
    async fetch(resource, query = {}) {
        const querified = queryString.stringify(query);
        const resp = await fetch(`${this.host}${resource}${querified.length > 0 ? `?${querified}` : ''}`);
        const json = await resp.json();
        if (json.error)
            throw new Error(json.error);
        return json;
    }
}
exports.Api = Api;
const minerApi = new Api();
exports.default = minerApi;
//# sourceMappingURL=MinerApi.js.map