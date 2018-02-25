import { observable, action } from 'mobx';
import { ipcRenderer } from 'electron';
import socket from 'socket';

const debug = require('debug')('app:mobx:globalState');
export const DEFAULT_TOAST_TIMEOUT = 4000;

export type Toast = {
  message: string;
  type: 'danger' | 'warning' | 'notify';
  timeout?: number;
  closable?: boolean;
};

export class GlobalState {
  connectionTimeout?: number;
  connectionPromise?: Promise<void>;
  connectionResolve?: () => void;

  @observable minerPort?: number;
  @observable socketConnected: boolean = false;
  @observable socketCantConnect: boolean = false;
  @observable userShare: number = 0.7;

  @observable toast?: Toast;

  public constructor() {
    this.waitTilSocket();
    this.waitForPort();
  }

  @action
  waitForPort() {
    ipcRenderer.on('miner-server-port', (e: any, port: number) => {
      this.setMinerPort(port);
    });
  }

  @action
  waitTilSocket() {
    this.setSocketState(false); // start our timeout

    this.connectionPromise = new Promise(resolve => {
      this.connectionResolve = resolve;

      socket.on('connect', () => {
        debug('Socket.io is connected');

        this.setSocketState();
        this.connectionResolve!();
      });
      socket.on('disconnect', () => {
        debug('Socket.io disconnected');

        this.setSocketState(false);
        this.connectionPromise = new Promise(
          resolve => (this.connectionResolve = resolve),
        );
      });
    });
  }

  setMinerPort(port: number) {
    this.minerPort = port;
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
      message:
        'Failed to connect to server, probably no internet. Trying again...',
      type: 'danger',
      timeout: Infinity,
    });
  }

  @action
  setToast(toast: Toast) {
    this.toast = toast;
    if (toast.timeout !== Infinity)
      setTimeout(
        () => (this.toast = undefined),
        toast.timeout || DEFAULT_TOAST_TIMEOUT,
      );
  }

  @action
  closeToast() {
    this.toast = undefined;
  }
}

export default new GlobalState();
