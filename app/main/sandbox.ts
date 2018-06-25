import { EventEmitter } from 'events';
import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import trackError from '../core/raven';

let sandbox: Sandbox | null = null;

export { sandbox };
export class Sandbox extends EventEmitter {
  private window: Electron.BrowserWindow;
  // Resolve function or reject it
  // Current executing command
  private command?: string;
  private promise?: Promise<any>;
  private _resolve?: Function;
  private _reject?: Function;

  constructor() {
    super();

    this.window = new BrowserWindow({
      show: false,
    });

    sandbox = this;
  }

  openDevTools() {
    this.window.webContents.openDevTools({
      mode: 'detach',
    });
  }

  load() {
    this.window.loadURL(
      `file://${path.join(__dirname, '../sandbox/index.html')}`
    );
    this.bindCrash();
    this.window.webContents.once('did-finish-load', () => {
      if (__DEV__) {
        this.window.webContents.openDevTools();
      }
    });
  }

  createPromise() {
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  async execute(command: string) {
    if (this.promise) {
      // Wait until parent command executes
      await this.promise;
    }

    this.promise = this.createPromise();
    this.bindEvents();

    this.window.webContents.send('execute', command);

    return this.promise;
  }

  bindEvents() {
    ipcMain.once(
      'execution-result',
      (event: Electron.IpcMessageEvent, message: any) => {
        if (message.error) {
          this._reject && this._reject(message.error);
        } else {
          this._resolve && this._resolve(message.result);
        }
      }
    );
  }

  forward() {
    ipcMain.on(
      'execute',
      async (event: Electron.IpcMessageEvent, message: any) => {
        this.command = message;

        try {
          event.sender.send('execution-result', {
            result: await this.execute(message),
          });
        } catch (e) {
          event.sender.send('execution-result', {
            error: e,
          });
        }
      }
    );
  }

  public bindCrash() {
    this.window.webContents.once('crashed', evt => {
      trackError(new Error('Sandbox has crashed on executing ' + this.command));

      if (this._reject) this._reject(new Error('Sandbox has been crashed'));
      this.load();
    });
  }
}
