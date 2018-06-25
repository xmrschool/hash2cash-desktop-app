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
import { intl } from '../intl';

const debug = require('debug')('app:minerApi');

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

  isRunningOnUltimate(): boolean {
    if (this.data.parameters && this.data.parameters.power) {
      return this.data.parameters.power === '100';
    } else if (this.data.parameters && this.data.parameters.main) {
      return this.data.parameters.main === 'full';
    }

    return false;
  }

  listenForEvents() {
    debug('Listening for events', this.data.name);
    onceMinerReady(localSocket => {
      debug('Miner backend was ready', localSocket);
      localSocket.on('state', ({ name, _data, ...params }: any) => {
        debug('Received new state: ', { name, _data, ...params });

        if (name === this.name) {
          this.data = Object.assign(this.data, params);

          this.emit('state', this);

          if (_data) {
            console.error(
              'There is error happened switching inside state: \n',
              _data
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
          message: intl.formatMessage(
            {
              id: err.message,
              defaultMessage: err.message,
            },
            { workerName: this.data.name }
          ),
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
      { id, value }
    );

    this.data.parameters![id] = value;

    return resp;
  }

  // It calls function, if it just function, or switches value
  @action
  async callFunc(id: string, newValue?: boolean) {
    const find = this.data.menu.find(d => d.id === id);

    if (!find) {
      throw new Error('Specified menu id not found');
    }

    if (find.type === 'pick') {
      if (typeof newValue === 'undefined') {
        throw new Error('You have to specify newValue');
      }
      find.isPicked = newValue;
    }

    const resp = await minerApi.fetch(`/workers/${this.data.name}/func/${id}`, {
      value: newValue,
    });

    return resp;
  }

  @action
  // Daemon management
  async start(commit = true) {
    this.httpRequest = true;
    try {
      const resp = await minerApi.fetch(
        `/workers/${this.data.name}/start${minerApi.getQuery(commit)}`
      );
      this.httpRequest = false;

      return resp;
    } catch (e) {
      if (e.message.includes('already running')) {
        this.data.running = true;

        return true;
      }

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
      const resp = await minerApi.fetch(
        `/workers/${this.data.name}/stop${minerApi.getQuery(commit)}`
      );
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
    try {
      return minerApi.fetch(`/workers/${this.data.name}/getStats`);
    } catch (e) {
      if (e && e.message.includes('is not running')) {
        this.data.running = false;
      }

      throw e;
    }
  }
}

export class Api {
  @observable workers: Worker[] = [];
  realHost = 'localhost';

  get host() {
    return 'http://' + this.realHost + ':' + globalState.minerPort;
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
        '/workers?asArray=true&updateCache=' + updateCache
      )) as Workers[];

      /**
       * ToDo dont update me because it will cause memory leak in future.
       * Or make something like .destroy method, which will destroy event listeners.
       */
      this.workers = response.map(d => new Worker(d));

      return this.workers;
    } catch (e) {
      console.error(e);
      // Repeat request if it has been failed
      await sleep(700);
      return this.getWorkers(updateCache);
    }
  }

  workerByName(name: string): Worker | undefined {
    return this.workers.find(d => d.name === name);
  }

  getQuery(commit = true) {
    return commit ? '' : '?dontCommit=true';
  }

  async stopAll(commit = true) {
    return await this.fetch(`/workers/stop${this.getQuery(commit)}`);
  }

  async fetch(
    resource: string,
    query: { [st: string]: any } = {},
    deep = 0
  ): Promise<any> {
    const querified = queryString.stringify(query);

    await connectionPromise;
    let resp;
    try {
      resp = await fetch(
        `${this.host}${resource}${querified.length > 0 ? `?${querified}` : ''}`
      );
    } catch (e) {
      this.realHost = 'localhost' ? '127.0.0.1' : 'localhost';

      if (deep > 1) {
        console.warn(`Failed to get resource ${resource}`, resource);
        throw e;
      }

      return this.fetch(resource, query, deep + 1);
    }

    const json = await resp.json();
    // Because it's already error
    if (json.error) throw json.error;

    return json;
  }
}

const minerApi = new Api();

export default minerApi;
