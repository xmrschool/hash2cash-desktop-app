import { action, observable } from 'mobx';
import Api from '../api/Api';

import { Worker } from '../api/MinerApi';
import CurrenciesService, {
  AllowedCurrencies,
  CurrencyNumber,
} from './CurrenciesService';
import { EventEmitter } from 'events';
import { LocalStorage } from '../utils/LocalStorage';
import { sleep } from '../utils/sleep';
import calculateHourlyReturn from '../utils/calculator';

export const INTERVAL_TIME = 1000;

export class InternalObserver extends EventEmitter {
  @observable name: string;
  @observable latestSpeed?: number | null;
  @observable speedPerMinute?: number | null;
  @observable hashesSubmitted = 0;

  @observable monthly: any = null;
  @observable daily: any = null;

  private isObserving = false;
  _interval: any;
  _isObserver: true = true;
  _data: Worker;
  totalSpeed: number = 0; // We summarize speed and then divide it by 1 minute. Hence we get avg speed per minute
  receivedMetrics: number = 0;
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
    if (!this._data.running) {
      this.emit('stopListening');
      return;
    }

    try {
      const stats = await this._data.getSpeed();

      if (stats === null) return;

      // It emits same speed by default, so we made a trick and calculate speed here
      if (this._data.name === 'JceCryptonight') {
        stats[1] = null;
        stats[2] = null;

        if (stats[0]) {
          this.receivedMetrics += 1;
          this.totalSpeed += stats[0]!;

          if (this.receivedMetrics >= 59) {
            stats[1] = parseFloat(
              (this.totalSpeed / this.receivedMetrics).toFixed(2)
            );
          }
        }
      }

      let hasChanged = false;
      const speed = stats;

      this.emit('speed', speed);
      // Do not emit if not a number
      if (speed[0] && speed[0]! > 0) {
        if (this.latestSpeed !== speed[0]) {
          this.latestSpeed = speed[0];
          hasChanged = true;
        }
      }
      if (speed[1] && speed[1]! > 0) {
        if (this.speedPerMinute !== speed[1]) {
          this.speedPerMinute = speed[1];
        }
        if (!this.latestSpeed) {
          this.latestSpeed = speed[1];
          hasChanged = true;
        }
      }

      if (hasChanged) {
        this.daily = this.dailyProfit().reactFormatted();
        this.monthly = this.monthlyProfit().reactFormatted();
      }
      this.tryToEmitMetrics({ total: stats, highest: speed[0] } as any);
    } catch (e) {
      console.error('Failed to get worker stats\n', {
        message: e.message,
      });
    }
  }

  @action
  stop() {
    if (this._interval) clearInterval(this._interval);
    this.isObserving = false;
  }

  start() {
    if (!this.isObserving) {
      this.isObserving = true;
      this.updateWorkerData().then(() => this.tick());
    }
  }

  async tick(): Promise<any> {
    await sleep(this._data.data.updateThrottle || INTERVAL_TIME);

    if (this.isObserving) {
      await this.updateWorkerData();
    }

    return this.tick();
  }

  dailyProfit() {
    const currency = this._data.data.usesAccount!;
    const service = CurrenciesService.ticker[currency];

    const speed = this.getSpeed();
    const localCurrency = calculateHourlyReturn(speed, service);

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
    const localCurrency = calculateHourlyReturn(speed, service) * 30;

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
