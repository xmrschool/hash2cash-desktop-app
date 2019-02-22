import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { observable, action } from 'mobx';
import { defineMessages } from 'react-intl';

import {
  default as Api,
  Architecture,
  Manifest,
  Downloadable,
} from '../api/Api';
import minerApi from '../api/MinerApi';
import FileDownloader, { DownloadError } from '../utils/FileDownloader';
import minerObserver, { InternalObserver } from './MinerObserver';
import globalState from './GlobalState';
import { sleep } from '../utils/sleep';
import { LocalStorage } from '../utils/LocalStorage';
import { downloadAndInstall, isOk } from '../../core/reload/vcRedistDetector';
import { intl } from '../intl';

const app = electron.app || electron.remote.app;
const config = require('../../config.js');

const debug = require('debug')('app:mobx:initialization');

const messages = defineMessages({
  hardwareCollecting: {
    id: 'mobx.init.status.collecting',
    defaultMessage: 'Collecting hardware information...',
  },
  vcRedistChecking: {
    id: 'mobx.init.status.vcredist.checking',
    defaultMessage: 'Checking if VCRedist installed',
  },
  vcRedistDownloading: {
    id: 'mobx.init.status.vcredist.downloading',
    defaultMessage: 'Downloading VCRedist... {status}',
  },
  vcRedistFailed: {
    id: 'mobx.init.status.vcredist.failed',
    defaultMessage:
      "Failed to install VCRedist 2017. You can do it yourself, because it's required by GPU miner.",
  },
});

export const TOTAL_BENCHMARK_TIME = 60; // Seconds, default set to 60

export class InitializationState {
  @observable
  hardware?: Architecture;
  @observable
  manifest?: Manifest;
  @observable
  unexpectedError?: string | null;
  @observable
  status: string = 'Collecting hardware';
  @observable
  step: number = 0; // A progress bar step
  @observable
  progressText?: string;
  @observable
  downloadError?: DownloadError & { miner: Downloadable };

  @observable
  bechmarking = false;
  @observable
  benchmarkQueue: InternalObserver[] = [];
  @observable
  benchmarkQueueIndex = 0;
  @observable
  benchmarkSecsLeft = 0;
  @observable
  everythingDone = false;
  benchmarkCountDown: any;

  aborted: boolean = false;

  // Used for downloader
  @observable
  speed: number = 0;
  @observable
  downloaded: number = 0;
  @observable
  totalSize: number = 0;
  @observable
  downloading: boolean = false;

  @action
  reset() {
    this.hardware = undefined;
    this.manifest = undefined;
    this.unexpectedError = null;
    this.status = 'Collecting hardware...';
    this.step = 0;
    this.progressText = undefined;
    this.downloadError = undefined;

    this.bechmarking = false;
    this.benchmarkQueue = [];
    this.benchmarkQueueIndex = 0;
    this.benchmarkSecsLeft = 0;
    this.everythingDone = false;
    this.benchmarkCountDown = undefined;

    this.aborted = false;
    this.speed = 0;
    this.downloaded = 0;
    this.totalSize = 0;
    this.downloading = false;
  }

  @action
  setUnexpectedError(error: string) {
    this.unexpectedError = error;
  }

  @action
  setHardware(hardware: Architecture) {
    this.hardware = hardware;
  }

  @action
  async fetchManifest() {
    if (!this.hardware) throw new Error('Hardware is not defined');

    const manifest = await Api.mining.manifest(this.hardware);

    if ((manifest as any).errors!) throw new Error((manifest as any).errors[0]);
    this.manifest = manifest;

    return manifest;
  }

  @action
  setStep(step: number) {
    this.step = step;
  }

  @action
  setText(progressText: string) {
    this.progressText = progressText;
  }

  formatPercents(relative: number) {
    return Math.round(relative * 100);
  }

  static formatBytes(bytes: number, decimals: number = 2) {
    if (bytes === 0) return '0';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (
      parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
    );
  }

  @action
  async checkIfVcredistInstalled() {
    if (__WIN32__ === false) return; // VCRedist only on Win

    try {
      this.setStatus(intl.formatMessage(messages.vcRedistChecking));
      const installed = await isOk();
      if (!installed) {
        this.setStatus(intl.formatMessage(messages.vcRedistDownloading));

        if (
          !(await (fs as any).exists(path.join(app.getPath('userData'), 'tmp')))
        ) {
          await fs.mkdir(path.join(app.getPath('userData'), 'tmp'));
        }
        await downloadAndInstall((stats: any) => {
          this.setStatus(
            intl.formatMessage(messages.vcRedistDownloading, {
              status: this.formatStats(stats),
            })
          );
        }, path.join(app.getPath('userData'), 'tmp', 'vcredist.exe'));
      }
    } catch (e) {
      console.error('Failed to install VCRedist: ', e);
      this.setStatus(intl.formatMessage(messages.vcRedistFailed));
      await sleep(500);
    }
  }
  // We set up a countdown for 60 seconds since speed is emitted
  @action
  async benchmark(abort: AbortController) {
    return new Promise(async (resolve, reject) => {
      if (!this.manifest || this.manifest.success === false) {
        throw new Error('Manifest not fetched');
      }

      this.aborted = false;

      abort.signal.addEventListener('abort', () => {
        console.log('Benchmark has been cancelled!');

        this.aborted = true;

        if (this.benchmarkQueue[this.benchmarkQueueIndex]) {
          this.benchmarkQueue[this.benchmarkQueueIndex]._data.stop();
        }
        resolve();
      });

      debug('[benchmark] stopping all miners...');
      await minerApi.stopAll();
      // Wait till all workers are done
      await sleep(200);

      debug('[benchmark] getting all workers...');
      const workers = await minerApi.getWorkers(true); // Force get new workers
      debug('[benchmark] retrieved workers %O', minerApi.workers);
      if (minerApi.workers.length === 0) {
        throw new Error('Failed to get any of workers. Seems to be strange!');
      }

      this.benchmarkQueue = workers.map(worker =>
        minerObserver.observe(worker, false)
      );
      debug('[benchmark] built queue %O', this.benchmarkQueue);
      this.benchmarkSecsLeft = TOTAL_BENCHMARK_TIME * workers.length;

      debug('[benchmark] starting a real benchmark');
      await this.nextMiner();

      const results = minerObserver.workers.map(result => ({
        speed: result.speedPerMinute,
        name: result._data.name,
      }));

      const benchmark = {
        data: results,
        time: new Date(),
      };

      globalState.setBenchmark(benchmark);
      LocalStorage.benchmark = benchmark;

      debug('[benchmark] benchmark has been done!', localStorage.benchmark);
    });
  }

  @action
  async nextMiner(): Promise<any> {
    if (this.aborted) return false;
    try {
      if (this.benchmarkQueue.length <= this.benchmarkQueueIndex) {
        // element doesnt exist
        debug('[benchmark] no miners anymore');
        return;
      }
      const miner = this.benchmarkQueue[this.benchmarkQueueIndex];

      debug('[benchmark] starting miner or timeout(10000)...');
      await Promise.race([sleep(10000), miner._data.start(false)]);
      miner.start();

      let stateListener: any;
      let speedListener: any;
      let errorListener: any;

      const promise = new Promise(resolve => {
        let latestSpeed: (number | null)[] = [null, null, null];
        // We listen for every speed and once minute speed was received we resolve promise
        speedListener = (speed: number[]) => {
          // We store latestSpeed to make timeout error
          latestSpeed = speed;
          // What we do here? If current speed is 0, we do nothing
          // But in case we have second speed we could ignore that behaviour
          // We only need average minute speed
          if (speed[1] > 0) {
            return resolve(speed[1]);
          }

          const outerSpeed = speed[0] || speed[1];
          if (!outerSpeed || outerSpeed === 0) return;

          // Once miner is on and benchmark is down we start benchmark
          if (!this.benchmarkCountDown) {
            this.startBenchmarkCountDown();
          }
        };

        // Miner has been stopped so we also stop benchmark
        stateListener = () => {
          if (!miner._data.running) {
            resolve(0);
          }
        };

        errorListener = () => {
          resolve(0);
        };

        // ToDo show notify if miner was stopped or when timeout error
        miner.on('stopListening', errorListener);
        miner.on('speed', speedListener);
        miner._data.on('state', stateListener);
        miner._data.on('runtimeError', errorListener);

        // If speed hasn't been ever emitted in 20 seconds, we skip miner
        sleep(20000).then(d => {
          if (latestSpeed[0] === null && latestSpeed[1] === null) {
            resolve(0);
          }
        });
      }); // wait til events are done

      await promise;

      miner.removeListener('speed', speedListener);
      miner._data.removeListener('state', stateListener);
      miner._data.removeListener('runtimeError', errorListener);

      // Once benchmark is done we shut down each things
      try {
        minerObserver.stopObserving(miner, false);
      } catch (e) {
        console.error('Failed to stop observing worker: ', e);
      }

      clearInterval(this.benchmarkCountDown);
      this.benchmarkCountDown = false;

      await miner._data.stop();

      this.benchmarkQueueIndex = this.benchmarkQueueIndex + 1;

      return this.nextMiner();
    } catch (e) {
      console.error('Failed to benchmark miner! ', e);
      // If something has broken (like antivirus shut down our miner we just continue and warn there's an error
      return this.nextMiner();
    }
  }

  // Actions to manage seconds left in benchmark
  @action
  startBenchmarkCountDown() {
    this.benchmarkCountDown = setInterval(
      () => this.countDownBenchmark(),
      1000
    );
  }

  @action
  countDownBenchmark() {
    // Shows how many minutes left at real
    const minimalTreshold =
      (this.benchmarkQueue.length - this.benchmarkQueueIndex) *
      TOTAL_BENCHMARK_TIME;

    // If left more than really left (e.g. when current speed hasn't been emitted)
    if (this.benchmarkSecsLeft > minimalTreshold) {
      this.benchmarkSecsLeft = minimalTreshold;
    } else {
      this.benchmarkSecsLeft = this.benchmarkSecsLeft - 1;
    }

    if (this.benchmarkSecsLeft <= 0) {
      clearInterval(this.benchmarkCountDown);
      return;
    }

    const difference = 1 - 4 / 7;
    const totalTime = TOTAL_BENCHMARK_TIME * this.benchmarkQueue.length;
    const percents = difference * (this.benchmarkSecsLeft / totalTime);

    this.setStep(1 - percents);
    this.setText(
      `${this.formatPercents(1 - percents)}%, ${
        this.benchmarkSecsLeft
      } secs left`
    );
  }

  formatStats(stats: any): string {
    const {
      size: { total, transferred },
      speed,
    } = stats;

    return `${InitializationState.formatBytes(
      transferred || 0
    )} / ${InitializationState.formatBytes(
      total || 0
    )} @ ${InitializationState.formatBytes(speed || 0)}/s`;
  }

  @action
  async downloadBinaries() {
    if (!this.manifest || this.manifest.success === false)
      return console.error('Manifest isnt yet fetched');

    const { downloadable } = this.manifest;

    this.downloading = true;
    const uploader = new FileDownloader(downloadable);

    uploader.on('progress', (stats: any) => {
      debug('Progress is: ', stats);
      const { downloaded, totalSize, speed } = stats;
      const difference = 5 / 7 - 3 / 7;
      const percents = difference * (downloaded / totalSize);

      this.setText(
        `${this.formatPercents(
          3 / 7 + percents
        )}%, ${InitializationState.formatBytes(
          downloaded || 0
        )} / ${InitializationState.formatBytes(
          totalSize || 0
        )} @ ${InitializationState.formatBytes(speed || 0)}/s`
      );
      this.setStep(3 / 7 + percents);

      Object.assign(this, stats);
    });

    try {
      await uploader.fetch();
      LocalStorage.manifest = this.manifest;
      // fs-extra is heavy and taking so many time to load it
      await require('fs-extra').outputFile(
        path.join(config.MINERS_PATH, 'manifest.json'),
        JSON.stringify(this.manifest.downloadable)
      );
    } catch (e) {
      console.error('Failed to download binaries: ', e);
      this.downloadError = e;
      this.downloading = false;
      throw e;
    }

    this.setText('');
    this.downloading = false;
  }

  @action
  setStatus(status: string) {
    this.status = status;
  }
}

export default new InitializationState();
