import { EventEmitter } from 'events';
import { BrowserWindow, ipcMain, globalShortcut, app } from 'electron';
import * as path from 'path';
import { AppWindow } from './appWindow';

let serverPort: number | null = null;
let server: Server | null = null;

export { serverPort, server };
export class Server extends EventEmitter {
  private window: Electron.BrowserWindow;

  constructor() {
    super();

    this.window = new BrowserWindow({
      show: false,
    });

    server = this;
    this.bindClose();
  }

  openDevTools() {
    this.window.webContents.openDevTools({
      mode: 'detach',
    });
  }

  bindClose() {
    this.window.on('close', async event => {
      console.log('Server wanted to leave');
      event.preventDefault();

      return await this.quit();
    });
  }

  toggleState() {
    this.window.webContents.send('toggleState');
  }

  load(appWindow: AppWindow | null) {
    this.window.loadURL(
      `file://${path.join(__dirname, '../miner/app/index.html')}`
    );
    this.window.webContents.once('did-finish-load', () => {
      if (__DEV__) {
        this.window.webContents.openDevTools();
      }
    });
    ipcMain.on('miner-server-port', (e: any, port: number) => {
      console.log(`Miner server is listening on ${port} port`)
      if (appWindow) appWindow.sendMinerPort(port);
      serverPort = port;
    });
  }

  quit() {
    if (this.window.isDestroyed()) return;
    this.window.webContents.send('quit');

    return new Promise(resolve => this.window.on('close', resolve));
  }
}

app.on('ready', () => {
  globalShortcut.register('Ctrl+Shift+M', () => {
    console.log('Shortcut has been pressed');
    if (server) {
      server.toggleState();
    }
  });
})

