import * as queryString from 'querystring';
import { groupBy, sortBy } from 'lodash';

import globalState from '../mobx-store/GlobalState';
import { OuterJSON } from '../../miner/app/workers/BaseWorker';
import accountService from '../mobx-store/CurrenciesService';

export type Workers = OuterJSON<any>;

export class Worker {
  data: Workers;

  constructor(json: Workers) {
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

  async setCustomParameter(id: string, value: string) {
    const resp = await minerApi.fetch(
      `/miners/${this.data.name}/setCustomParameter`,
      { id, value }
    );

    this.data.parameters![id] = value;

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

  async getSpeed(): Promise<(number | null)[]> {
    return minerApi.fetch(`/workers/${this.data.name}/getSpeed`);
  }
}

export class Api {
  workers: Worker[] = [];

  get host() {
    return 'http://127.0.0.1:' + globalState.minerPort;
  }

  // What does this algorithm do? Sorts by usedHardware, orders by profitability
  findMostProfitableWorkers(): { [hardware: string]: Worker[] } {
    const ticker = accountService.ticker;
    console.log('workers are: ', this.workers);
    const groupedWorkers = groupBy(this.workers, object => {
      console.log('obj is : ', object);

      return object.data!.usesHardware![0];
    });

    console.log('Workers are grouped: ', groupedWorkers);

    const keys = Object.keys(groupedWorkers);

    keys.forEach(hardware => {
      groupedWorkers[hardware] = sortBy<Worker>(groupedWorkers[hardware], [
        (worker: Worker) => {
          return ticker[worker.data.usesAccount!].profitability;
        },
      ]);
    });

    return groupedWorkers;
  }
  async getWorkers(): Promise<Worker[]> {
    const response = (await this.fetch('/workers?asArray=true')) as Workers[];

    this.workers = response.map(d => new Worker(d));

    return this.workers;
  }

  workerByName(name: string): Worker | undefined {
    return this.workers.find(d => d.name === name);
  }

  async stopAll() {
    return await this.fetch('/workers/stop');
  }

  async fetch(
    resource: string,
    query: { [st: string]: any } = {}
  ): Promise<any> {
    const querified = queryString.stringify(query);

    const resp = await fetch(
      `${this.host}${resource}${querified.length > 0 ? `?${querified}` : ''}`
    );
    const json = await resp.json();

    if (json.error) throw new Error(json.error);

    return json;
  }
}

const minerApi = new Api();

export default minerApi;
