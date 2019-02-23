import { observable, action, computed } from 'mobx';
import { ipcRenderer } from 'electron';
import socket, { connectToLocalMiner } from '../socket';
import { intl, LocaleWithData } from '../intl';
import { LocalStorage } from '../utils/LocalStorage';
import { defineMessages } from 'react-intl';

const debug = require('debug')('app:mobx:globalState');
export const DEFAULT_TOAST_TIMEOUT = 4000;

const messages = defineMessages({
  connectionFail: {
    id: 'mobx.global.connectionFail',
    description: 'Message emitted when connection failed',
    defaultMessage:
      'Failed to connect to server, probably no internet. Trying again...',
  },
});

export type Toast = {
  message: string;
  type: 'danger' | 'warning' | 'notify';
  timeout?: number;
  closable?: boolean;
};

export type BenchmarkMiner = {
  speed: number;
  name: string;
};

export type Benchmark = {
  data: BenchmarkMiner[];
  time: Date;
};

export type Notify = {
  type: 'danger' | 'notify';
  short: string;
  long: string;
};

export class GlobalState {
  connectionTimeout?: number;
  connectionPromise?: Promise<void>;
  connectionResolve?: () => void;

  @observable.ref currentLocale: LocaleWithData | null = LocalStorage.currentLocale;
  @observable minerPort?: number;
  @observable socketConnected: boolean = false;
  @observable socketCantConnect: boolean = false;
  @observable userShare: number = 0.6;
  @observable.ref benchmark?: Benchmark;
  @observable.ref currentNotify?: Notify;

  @observable.ref toast?: Toast;
  @observable.ref openedLayer: 'settings' | 'tips' | null = null;
  @observable layerOpened: boolean = false;
  @observable layerAnimating: boolean = false;

  public constructor() {
    this.waitTilSocket();
    this.waitForPort();
    this.setBenchmark();
    this.bindEvents();
  }

  @action
  requestFrame(callback: any) {
    setTimeout(() => {
      const id = window.requestAnimationFrame(callback);
      setTimeout(() => {
        window.cancelAnimationFrame(id);
        this.layerAnimating = false;
      }, 1100);
    }, this.layerAnimating ? 0 : 10);
    this.layerAnimating = true;
  }

  @action
  showLayer(layer: 'settings' | 'tips') {
    this.requestFrame(() => {
      this.openedLayer = layer;
      this.layerOpened = true;
    });

    return true;
  }

  @action
  hideLayer() {
    this.requestFrame(() => {
      this.layerOpened = false;
      setTimeout(() => (this.openedLayer = null), 130);
    });
  }

  @action
  waitForPort() {
    ipcRenderer.on('miner-server-port', (e: any, port: number) => {
      this.setMinerPort(port);
    });
  }

  bindEvents() {
    ipcRenderer.on('resetBenchmark', () => {
      this.benchmark = undefined;
      localStorage.removeItem('benchmark');
    });
  }

  @action
  setBenchmark(
    benchmark: string | undefined | object = localStorage.benchmark
  ) {
    if (typeof benchmark === 'undefined') return;

    const parsed =
      typeof benchmark === 'string' ? JSON.parse(benchmark) : benchmark;

    this.benchmark = {
      data: parsed.data,
      time: new Date(parsed.time),
    };

    return this.benchmark;
  }

  getBenchmarkHashrate(miner: string): number | null {
    if (this.benchmark) {
      const possible = this.benchmark.data.find(d => d.name === miner);

      return possible ? possible.speed : null;
    }

    return null;
  }

  @action
  waitTilSocket() {
    this.setSocketState(false); // start our timeout

    this.connectionPromise = new Promise(resolve => {
      this.connectionResolve = resolve;

      socket.on('connect', () => {
        debug('Socket.io is connected');

        this.setSocketState();
        socket.emit('metrics', this.metrics);
        this.connectionResolve!();
        this.listenForNotify();
      });
      socket.on('disconnect', () => {
        debug('Socket.io disconnected');

        this.setSocketState(false);
        this.connectionPromise = new Promise(
          resolve => (this.connectionResolve = resolve)
        );
      });
    });
  }

  @action
  listenForNotify() {
    socket.on('notify', (notify: any) => {
      this.currentNotify = notify;
    });
  }

  @action
  setMinerPort(port: number) {
    // ToDo ports are being emitted more than once if reloaded
    console.log(`Current miner port: ${this.minerPort}\nOffered port: ${port}`);
    if (this.minerPort === port) return;
    this.minerPort = port;

    connectToLocalMiner(this.minerPort);
  }

  @action
  setSocketState(state = true) {
    this.socketConnected = state;

    if (state) {
      clearTimeout(this.connectionTimeout!);
      this.socketCantConnect = false;
      this.closeToast();
    } else {
      this.connectionTimeout = setTimeout(
        () => this.unableToConnect(),
        5000
      ) as any;
    }
  }

  @action
  unableToConnect() {
    this.socketCantConnect = true;
    this.setToast({
      message: intl.formatMessage(messages.connectionFail),
      type: 'danger',
      timeout: Infinity,
    });
  }

  @action
  setToast(toast: Toast) {
    this.toast = toast;
    if (toast.timeout !== Infinity)
      setTimeout(
        () => this.closeToast(),
        toast.timeout || DEFAULT_TOAST_TIMEOUT
      );
  }

  @action
  closeToast() {
    if (this.toast) {
      this.toast = undefined;
    }
  }

  @computed
  get metrics() {
    return {
      language: this.currentLocale,
      realLanguage: navigator.language,
      platform: navigator.platform,
      release: __RELEASE__,
      userAgent: navigator.userAgent,
    };
  }
}

export default new GlobalState();
