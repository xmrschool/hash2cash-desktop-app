import { observable, action } from 'mobx';
import {
  default as Api,
  Architecture,
  Manifest,
  Downloadable,
} from '../api/Api';
import * as fs from 'fs-extra';
import * as path from 'path';
const config = require('../../config.js');
import FileDownloader, { DownloadError } from '../utils/FileDownloader';
import minerApi, { Worker } from '../api/MinerApi';
import minerObserver from './MinerObserver';
import { sleep } from '../utils/sleep';

const debug = require('debug')('app:mobx:initialization');

export const TOTAL_BENCHMARK_TIME = 60; // Seconds, default set to 60

export class InitializationState {
  @observable hardware?: Architecture;
  @observable manifest?: Manifest;
  @observable unexpectedError?: string | null;
  @observable status: string = 'Collecting hardware information...';
  @observable step: number = 0; // A progress bar step
  @observable progressText?: string;
  @observable downloadError?: DownloadError & { miner: Downloadable };

  @observable bechmarking = false;
  @observable benchmarkSecsLeft = 0;
  benchmarkCountDown: any;

  // Used for downloader
  @observable speed: number = 0;
  @observable downloaded: number = 0;
  @observable totalSize: number = 0;
  @observable downloading: boolean = false;

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

  formatBytes(bytes: number, decimals: number = 2) {
    if (bytes === 0) return '0';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (
      parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
    );
  }

  // We set up a countdown for 60 seconds since speed is emitted
  @action
  async benchmark() {
    if (!this.manifest || this.manifest.success === false) {
      throw new Error('Manifest not fetched');
    }

    await minerApi.stopAll();
    // Wait till all workers are done
    await sleep(200);
    await minerApi.getWorkers();
    if (minerApi.workers.length === 0) {
      throw new Error('Failed to get any of workers. Seems to be strange!');
    }
    const profitableWorkers = minerApi.findMostProfitableWorkers();
    const workersKeys = Object.keys(profitableWorkers);

    debug('Most profitable workers: ', profitableWorkers);
    let leftSignals = workersKeys.map(d => profitableWorkers[d][0].name);
    this.benchmarkSecsLeft = TOTAL_BENCHMARK_TIME;

    Object.keys(profitableWorkers).forEach(async hardware => {
      const miner = profitableWorkers[hardware][0];

      await miner.start();

      minerObserver.observe(miner);

      const speedListener = ({ worker, speed }: any) => {
        debug('Received speed event: ', worker, speed);
        // What we do here? If current speed is 0, we do nothing
        if (speed[0] === 0) return;
        // We only need average minute speed
        if (speed[1] > 0) this.considerAsDone(worker._data);

        leftSignals = leftSignals.filter(d => d !== worker.name);

        // Once every miner is on, we start count down
        if (leftSignals.length === 0 && !this.benchmarkCountDown) {
          this.startBenchmarkCountDown();
        }
      };
      // We listen for speed and delete signal once any speed is received
      minerObserver.on('speed', speedListener);
    });
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
    this.benchmarkSecsLeft = this.benchmarkSecsLeft - 1;
    const difference = 1 - 4 / 7;
    const percents =
      difference * (this.benchmarkSecsLeft / TOTAL_BENCHMARK_TIME);

    this.setStep(1 - percents);
    this.setText(
      `${this.formatPercents(1 - percents)}%, ${
        this.benchmarkSecsLeft
      } secs left`
    );
  }

  @action
  async considerAsDone(worker: Worker) {
    await worker.stop();
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
        `${this.formatPercents(3 / 7 + percents)}%, ${this.formatBytes(
          downloaded || 0
        )} / ${this.formatBytes(totalSize || 0)} @ ${this.formatBytes(
          speed || 0
        )}/s`
      );
      this.setStep(3 / 7 + percents);

      Object.assign(this, stats);
    });

    try {
      await uploader.fetch();
      localStorage.manifest = JSON.stringify(this.manifest);
      await fs.outputFile(
        path.join(config.MINERS_PATH, 'manifest.json'),
        JSON.stringify(this.manifest.downloadable)
      );
    } catch (e) {
      console.error('Failed to download binaries: ', e);
      this.downloadError = e;
      this.downloading = false;
      throw e;
    }

    this.downloading = false;
  }

  @action
  setStatus(status: string) {
    this.status = status;
  }
}

export default new InitializationState();
