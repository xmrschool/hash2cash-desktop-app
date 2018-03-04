import { EventEmitter } from 'events';
import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { AppWindow } from './appWindow';

let serverPort: number | null = null;

export { serverPort };
export class Server extends EventEmitter {
  private window: Electron.BrowserWindow;

  constructor() {
    super();

    this.window = new BrowserWindow({
      show: false,
    });

    this.bindClose();
  }

  openDevTools() {
    this.window.webContents.openDevTools();
  }

  bindClose() {
    this.window.on('close', async event => {
      event.preventDefault();

      return await this.quit();
    });
  }

  load(appWindow: AppWindow) {
    this.window.loadURL(
      `file://${path.join(__dirname, '../miner/app/index.html')}`
    );
    this.window.webContents.once('did-finish-load', () => {
      if (__DEV__) {
        this.window.webContents.openDevTools();
      }
    });
    ipcMain.on('miner-server-port', (e: any, port: number) => {
      console.log('received port: ', port);
      appWindow.sendMinerPort(port);
      serverPort = port;
    });
  }

  quit() {
    if (this.window.isDestroyed()) return;
    this.window.webContents.send('quit');

    return new Promise(resolve => this.window.on('close', resolve));
  }
}
