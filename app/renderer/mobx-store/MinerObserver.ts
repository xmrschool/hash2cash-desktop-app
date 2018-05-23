import { action, observable } from 'mobx';
import Api from '../api/Api';

import { Worker } from '../api/MinerApi';
import CurrenciesService, {
  AllowedCurrencies,
  CurrencyNumber,
} from './CurrenciesService';
import globalState from './GlobalState';
import { EventEmitter } from 'events';
import { LocalStorage } from '../utils/LocalStorage';

export const INTERVAL_TIME = 1000;

export class InternalObserver extends EventEmitter {
  @observable name: string;
  @observable latestSpeed?: number | null;
  @observable speedPerMinute?: number | null;
  @observable hashesSubmitted = 0;
  _interval: any;
  _isObserver: true = true;
  _data: Worker;
  metricsLeft: number = 0;

  constructor(worker: Worker) {
    super();

    this.name = worker.name;
    this._data = worker;
  }

  async tryToEmitMetrics(stats: { highest: number; total: number[] }) {
    try {
      const [, minute, hourly] = stats.total;

      if (!stats.highest || !minute || !this._data.isRunningOnUltimate()) {
        return;
      }

      if (this.metricsLeft === 0) {
        this.metricsLeft = 60;
      } else {
        this.metricsLeft--;
        return;
      }

      const minerIds = LocalStorage.manifest!.minerIds;

      if (minerIds.length <= 2) {
        // Cpu is first, then goes GPU
        const requiredMinerId =
          this._data.data.name === 'MoneroCryptonight' ? 0 : 1;
        const minerId = minerIds[requiredMinerId];

        if (minerId) {
          await Api.mining.submitMetrics({
            id: minerId,
            hourly: hourly,
            minute: minute,
            max: stats.highest,
          });
        }
      }
    } catch (e) {
      console.error('Failed to emit metrics: ', e);
    }
  }

  @action
  async updateWorkerData() {
    if (!this._data.running) return;

    try {
      const stats = await this._data.getStats();

      if (stats === null) return;
      const speed = stats.hashrate.total;

      this.emit('speed', speed);
      // Do not emit if not a number
      if (speed[0] && speed[0] > 0) this.latestSpeed = speed[0];
      if (speed[1] && speed[1] > 0) this.speedPerMinute = speed[1];
      this.tryToEmitMetrics(stats.hashrate);
      this.hashesSubmitted = stats.results.hashes_total;
    } catch (e) {
      console.error('Failed to get worker stats\n', e);
    }
  }

  @action
  stop() {
    if (this._interval) clearInterval(this._interval);
  }

  start() {
    if (!this._interval) {
      this._interval = setInterval(
        () => this.updateWorkerData(),
        INTERVAL_TIME
      );
      this.updateWorkerData();
    }
  }

  dailyProfit() {
    const currency = this._data.data.usesAccount!;
    const service = CurrenciesService.ticker[currency];

    const speed = Math.max(this.speedPerMinute || 0, this.latestSpeed || 0);
    const hashesPerDay = speed * 60 * 60 * 24; // speed per day, non-stop of course

    // What does formule looks like? (<solved_hashes>/<global_difficulty>) * <block_reward> * 0.7
    const localCurrency =
      hashesPerDay /
      service.difficulty *
      service.blockReward *
      globalState.userShare *
      service.modifier;

    return CurrenciesService.toLocalCurrency(
      currency as AllowedCurrencies,
      localCurrency
    );
  }

  getSpeed() {
    return Math.max(this.speedPerMinute || 0, this.latestSpeed || 0);
  }

  monthlyProfit(): CurrencyNumber {
    const currency = this._data.data.usesAccount!;
    const service = CurrenciesService.ticker[currency];

    const speed = this.getSpeed();
    const hashesPerDay = speed * 60 * 60 * 24 * 30; // speed per day, non-stop of course

    // What does formule looks like? (<solved_hashes>/<global_difficulty>) * <block_reward> * 0.7
    const localCurrency =
      hashesPerDay /
      service.difficulty *
      service.blockReward *
      globalState.userShare *
      service.modifier;

    return CurrenciesService.toLocalCurrency(
      currency as AllowedCurrencies,
      localCurrency
    );
  }
}
export function isInternalWorker(arg: any): arg is InternalObserver {
  return arg._isObserver;
}

// This class observes speed of miner
export class MinerObserver extends EventEmitter {
  @observable workers: InternalObserver[] = [];

  /**
   * Stop observing that worker
   * @param {InternalObserver | Worker} _worker
   * @param {boolean} removeWorker – if we have to remove from `this.workers`
   */
  @action
  stopObserving(_worker: InternalObserver | Worker, removeWorker = true) {
    const worker = isInternalWorker(_worker) ? _worker._data : _worker;

    if (!worker.data || !worker.data.running) {
      return;
    }

    const internalWorker = this.workers.find(w => w.name === worker.name);
    const internalWorkerIndex = this.workers.findIndex(
      w => w.name === worker.name
    );

    if (!internalWorker) {
      throw new Error('Worker is not observing');
    }

    internalWorker.stop();
    if (removeWorker) {
      this.workers.splice(internalWorkerIndex, 1);
    }
  }

  @action
  clearAll() {
    this.workers.forEach(work => work.stop());
    this.workers.splice(0);
  }

  @action
  observe(worker: Worker, instantRun = true) {
    if ((!worker.data || !worker.data.running) && instantRun) {
      throw new Error('To observe this worker you must run it');
    }

    const findWorker = this.workers.find(w => w.name === worker.name);

    const internalObserver = findWorker || new InternalObserver(worker);
    if (instantRun) internalObserver.start();

    if (!findWorker) this.workers.push(internalObserver);
    return internalObserver;
  }
}

export default new MinerObserver();
