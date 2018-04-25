import * as queryString from 'querystring';
import { groupBy, sortBy } from 'lodash';
import { EventEmitter } from 'events';
import { action, observable } from 'mobx';

import globalState, { default as GlobalState } from 'mobx-store/GlobalState';
import { OuterJSON } from '../../miner/app/workers/BaseWorker';
import accountService from '../mobx-store/CurrenciesService';
import { connectionPromise, onceMinerReady } from '../socket';
import RuntimeError from '../mobx-store/RuntimeError';
import { sleep } from '../utils/sleep';

const debug = require('debug');

export type Workers = OuterJSON<any>;

export class Worker extends EventEmitter {
  @observable data: Workers;
  @observable httpRequest: boolean = false;
  debug: any;

  constructor(json: Workers) {
    super();
    this.data = json;
    this.debug = debug('app:worker:' + this.name);

    this.listenForEvents();
    this.bindEvents();
  }

  listenForEvents() {
    onceMinerReady(localSocket => {
      localSocket.on('state', ({ name, _data, ...params }: any) => {
        debug('Received new state: ', { name, _data, ...params });

        if (name === this.name) {
          this.data = Object.assign(this.data, params);

          this.emit('state', this);

          if (_data) {
            console.error(
              'There is error happened switching inside state: \n',
              _data,
            );

            this.emit('runtimeError', _data);
          }
        }
      });
    });
  }

  bindEvents() {
    this.on('runtimeError', err => {
      if (err.grateful) {
        GlobalState.setToast({
          message: err.message,
          type: 'danger',
          timeout: 5000,
          closable: true,
        });
      } else RuntimeError.handleError(err);
    });
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
  async start(commit = true) {
    this.httpRequest = true;
    try {
      const resp = await minerApi.fetch(`/workers/${this.data.name}/start${minerApi.getQuery(commit)}`);
      this.httpRequest = false;

      return resp;
    } catch (e) {
      RuntimeError.handleError(e);
      this.httpRequest = false;

      throw e;
    }
  }

  @action
  async stop(commit = true) {
    // Feel free to ignore errors happening in there
    try {
      if (!this.data.running) {
        return;
      }
      this.httpRequest = true;
      const resp = await minerApi.fetch(`/workers/${this.data.name}/stop${minerApi.getQuery(commit)}`);
      this.httpRequest = false;
      return resp;
    } catch (e) {
      console.error('Failed to stop miner!', e);

      return;
    }
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
    try {
      const response = (await this.fetch(
        '/workers?asArray=true&updateCache=' + updateCache,
      )) as Workers[];

      this.workers = response.map(d => new Worker(d));

      return this.workers;
    } catch (e) {
      // Repeat request if it has been failed
      await sleep(700);
      return this.getWorkers(updateCache);
    }
  }

  workerByName(name: string): Worker | undefined {
    return this.workers.find(d => d.name === name);
  }

  getQuery(commit = true) {
    return commit ? '' : '?dontCommit=true'
  }

  async stopAll(commit = true) {
    return await this.fetch(`/workers/stop${this.getQuery(commit)}`);
  }

  async fetch(
    resource: string,
    query: { [st: string]: any } = {},
  ): Promise<any> {
    const querified = queryString.stringify(query);

    await connectionPromise;
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
