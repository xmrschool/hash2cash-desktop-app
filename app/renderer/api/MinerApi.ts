import * as queryString from 'querystring';
import { groupBy, sortBy } from 'lodash';

import globalState from '../mobx-store/GlobalState';
import { OuterJSON } from '../../miner/app/workers/BaseWorker';
import accountService from '../mobx-store/CurrenciesService';
import { action, observable } from 'mobx';

export type Workers = OuterJSON<any>;

export class Worker {
  @observable data: Workers;
  @observable httpRequest: boolean = false;

  constructor(json: Workers) {
    this.data = json;
  }

  get name() {
    return this.data.name;
  }

  get running() {
    return this.data.running;
  }

  get parameters() {
    return this.data.parameters;
  }

  get customParameters() {
    return this.data.options;
  }

  @action
  async setCustomParameter(id: string, value: string) {
    const resp = await minerApi.fetch(
      `/workers/${this.data.name}/setCustomParameter`,
      { id, value },
    );

    this.data.parameters![id] = value;

    return resp;
  }

  @action
  // Daemon management
  async start() {
    this.httpRequest = true;
    const resp = await minerApi.fetch(`/workers/${this.data.name}/start`);
    this.httpRequest = false;
    this.data.running = true;
    return resp;
  }

  @action
  async stop() {
    this.httpRequest = true;
    const resp = await minerApi.fetch(`/workers/${this.data.name}/stop`);
    this.httpRequest = false;
    this.data.running = false;
    return resp;
  }

  @action
  async reload() {
    this.httpRequest = true;
    const resp = await minerApi.fetch(`/workers/${this.data.name}/reload`);
    this.httpRequest = false;
    this.data.running = !!this.data.running;
    return resp;
  }

  async getSpeed(): Promise<(number | null)[]> {
    return minerApi.fetch(`/workers/${this.data.name}/getSpeed`);
  }

  async getStats(): Promise<any | null> {
    return minerApi.fetch(`/workers/${this.data.name}/getStats`);
  }
}

export class Api {
  @observable workers: Worker[] = [];

  get host() {
    return 'http://127.0.0.1:' + globalState.minerPort;
  }

  // What does this algorithm do? Sorts by usedHardware, orders by profitability
  findMostProfitableWorkers(): { [hardware: string]: Worker[] } {
    const ticker = accountService.ticker;
    const groupedWorkers = groupBy(this.workers, object => {
      return object.data!.usesHardware![0];
    });

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

  @action
  async getWorkers(updateCache: boolean = false): Promise<Worker[]> {
    const response = (await this.fetch(
      '/workers?asArray=true&updateCache=' + updateCache,
    )) as Workers[];

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
    query: { [st: string]: any } = {},
  ): Promise<any> {
    const querified = queryString.stringify(query);

    const resp = await fetch(
      `${this.host}${resource}${querified.length > 0 ? `?${querified}` : ''}`,
    );
    const json = await resp.json();

    if (json.error) throw new Error(json.error);

    return json;
  }
}

const minerApi = new Api();

export default minerApi;