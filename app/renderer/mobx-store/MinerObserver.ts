import { action, observable } from 'mobx';
import { Worker } from '../api/MinerApi';
import CurrenciesService, { AllowedCurrencies, CurrencyNumber } from './CurrenciesService';
import globalState from './GlobalState';
import { EventEmitter } from 'events';
import userOptions from './UserOptions';

export const INTERVAL_TIME = 1000;

export type InternalWorker = {
  name: string;
  latestSpeed?: number | null;
  speedPerMinute?: number | null;
  _interval: any;
  _data: Worker;
};

// This class observes speed of miner
export class MinerObserver extends EventEmitter {
  @observable workers: InternalWorker[] = [];

  @action
  async updateWorkerData(name: string) {
    const worker = this.workers.find(w => w.name === name);

    if (!worker) {
      throw new Error('Worker not found');
    }

    if (!worker._data.running) return;

    const speed = await worker._data.getSpeed();

    this.emit('speed', { worker, speed });
    worker.latestSpeed = speed[0];
    worker.speedPerMinute = speed[1];
  }

  @action
  stopObserving(worker: Worker) {
    if (!worker.data || !worker.data.running) {
      throw new Error('To observe this worker you must run it');
    }

    const internalWorker = this.workers.find(w => w.name === worker.name);
    const internalWorkerIndex = this.workers.findIndex(
      w => w.name === worker.name
    );

    if (!internalWorker) {
      throw new Error('Worker is not observing');
    }

    clearInterval(internalWorker._interval);
    this.workers.splice(internalWorkerIndex, 1);
  }

  @action
  observe(worker: Worker) {
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
      _interval: setInterval(
        () => this.updateWorkerData(worker.name),
        INTERVAL_TIME
      ),
      _data: worker,
    });
  }

  dailyProfit(worker: InternalWorker) {
    const currency = worker._data.data.usesAccount!;
    const service = CurrenciesService.ticker[currency];

    const speed = Math.max(worker.speedPerMinute || 0, worker.latestSpeed || 0);
    const hashesPerDay = speed * 60 * 60 * 24; // speed per day, non-stop of course

    // What does formule looks like? (<solved_hashes>/<global_difficulty>) * <block_reward> * 0.7
    const localCurrency =
      hashesPerDay /
      service.difficulty *
      service.blockReward *
      globalState.userShare;

    return CurrenciesService.exchange(
      currency as AllowedCurrencies,
      userOptions.get('currency') as AllowedCurrencies,
      localCurrency
    );
  }

  monthlyProfit(worker: InternalWorker): CurrencyNumber {
    const currency = worker._data.data.usesAccount!;
    const service = CurrenciesService.ticker[currency];

    const speed = Math.max(worker.speedPerMinute || 0, worker.latestSpeed || 0);
    const hashesPerDay = speed * 60 * 60 * 24 * 30; // speed per day, non-stop of course

    // What does formule looks like? (<solved_hashes>/<global_difficulty>) * <block_reward> * 0.7
    const localCurrency =
      hashesPerDay /
      service.difficulty *
      service.blockReward *
      globalState.userShare;

    return CurrenciesService.exchange(
      currency as AllowedCurrencies,
      userOptions.get('currency') as AllowedCurrencies,
      localCurrency
    );
  }
}

export default new MinerObserver();
