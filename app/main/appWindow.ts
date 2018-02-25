import { BrowserWindow, ipcMain, Menu, app } from 'electron';
import { now } from './now';
import * as path from 'path';
import { EventEmitter } from 'events';

let windowStateKeeper: any | null = null;

export const RENDERER_PATH = 'file://' + path.join(__dirname, '..', 'renderer', 'app.html');
export class AppWindow {
  private window: Electron.BrowserWindow;
  private emitter = new EventEmitter();

  private _loadTime: number | null = null;
  private _rendererReadyTime: number | null = null;

  private minWidth = 540;
  private minHeight = 735;

  public constructor() {
    if (!windowStateKeeper) {
      // `electron-window-state` requires Electron's `screen` module, which can
      // only be required after the app has emitted `ready`. So require it
      // lazily.
      windowStateKeeper = require('electron-window-state');
    }

    const savedWindowState = windowStateKeeper({
      defaultWidth: this.minWidth,
      defaultHeight: this.minHeight,
    });

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      x: savedWindowState.x,
      y: savedWindowState.y,
      width: 540,
      height: 735,
      show: false,
      // This fixes subpixel aliasing on Windows
      // See https://github.com/atom/atom/commit/683bef5b9d133cb194b476938c77cc07fd05b972
      backgroundColor: '#181C21',
      resizable: false,
      darkTheme: true,
      title: 'Hash to Cash',
      titleBarStyle: __DARWIN__ ? 'hiddenInset' : 'default',
      webPreferences: {
        backgroundThrottling: false,
      },
    };

    if (__WIN32__) {
      windowOptions.frame = false;
    } else if (__LINUX__) {
    }

    this.window = new BrowserWindow(windowOptions);
    savedWindowState.manage(this.window);

    let quitting = false;
    app.on('before-quit', () => {
      quitting = true;
    });

    ipcMain.on('will-quit', (event: Electron.IpcMessageEvent) => {
      quitting = true;
      event.returnValue = true;
    });

    // on macOS, when the user closes the window we really just hide it. This
    // lets us activate quickly and keep all our interesting logic in the
    // renderer.
    if (__DARWIN__) {
      this.window.on('close', e => {
        console.log('e is: ', e, quitting);
        if (!quitting) {
          e.preventDefault();
          Menu.sendActionToFirstResponder('hide:');
        }
      });
    }

    this.window.setMenu(null);
  }

  public load() {
    let startLoad = 0;
    // We only listen for the first of the loading events to avoid a bug in
    // Electron/Chromium where they can sometimes fire more than once. See
    // See
    // https://github.com/desktop/desktop/pull/513#issuecomment-253028277. This
    // shouldn't really matter as in production builds loading _should_ only
    // happen once.
    this.window.webContents.once('did-start-loading', () => {
      this._rendererReadyTime = null;
      this._loadTime = null;

      startLoad = now();
    });

    this.window.webContents.once('did-finish-load', () => {
      if (__DEV__) {
        this.window.webContents.openDevTools();
      }

      this._loadTime = now() - startLoad;

      this.maybeEmitDidLoad();
    });

    this.window.webContents.on('did-finish-load', () => {
      console.log('Load is finished');
      this.window.webContents.setVisualZoomLevelLimits(1, 1);
      this.maybeEmitDidLoad();
    });

    this.window.webContents.on('did-fail-load', (e, th) => {
      console.log('failed to load: ', e, th);
      this.window.webContents.openDevTools();
      this.window.show();
    });

    ipcMain.once(
      'renderer-ready',
      (event: Electron.IpcMessageEvent, readyTime: number) => {
        this._rendererReadyTime = readyTime;

        this.maybeEmitDidLoad();
      }
    );

    this.window.on('focus', () => this.window.webContents.send('focus'));
    this.window.on('blur', () => this.window.webContents.send('blur'));

    console.log(
      'URL is being loaded',
      path.join(__dirname, '..', 'renderer', 'app.html')
    );
    this.window.loadURL(RENDERER_PATH);
  }

  // Helps you to inspect element
  public bindContextMenu() {
    this.window.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      console.log('coordinats: ', x, y);

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.window.webContents.inspectElement(x, y);
          },
        },
      ]).popup(this.window);
    });
  }
  /**
   * Emit the `onDidLoad` event if the page has loaded and the renderer has
   * signalled that it's ready.
   */
  private maybeEmitDidLoad() {
    this.emitter.emit('did-load', null);
  }

  public onClose(fn: () => void) {
    this.window.on('closed', fn);
  }

  /**
   * Register a function to call when the window is done loading. At that point
   * the page has loaded and the renderer has signalled that it is ready.
   */
  public onDidLoad(fn: () => void) {
    return this.emitter.on('did-load', fn);
  }

  public isMinimized() {
    return this.window.isMinimized();
  }

  /** Is the window currently visible? */
  public isVisible() {
    return this.window.isVisible();
  }

  public restore() {
    this.window.restore();
  }

  public focus() {
    this.window.focus();
  }

  /** Show the window. */
  public show() {
    this.window.show();
  }

  /** Send the app launch timing stats to the renderer. */
  public sendMinerPort(port: number) {
    this.onDidLoad(() =>
      this.window.webContents.send('miner-server-port', port)
    );
  }

  /** Send the app launch timing stats to the renderer. */
  public sendLaunchTimingStats(stats: any) {
    this.window.webContents.send('launch-timing-stats', { stats });
  }

  /**
   * Get the time (in milliseconds) spent loading the page.
   *
   * This will be `null` until `onDidLoad` is called.
   */
  public get loadTime(): number | null {
    return this._loadTime;
  }

  /**
   * Get the time (in milliseconds) elapsed from the renderer being loaded to it
   * signaling it was ready.
   *
   * This will be `null` until `onDidLoad` is called.
   */
  public get rendererReadyTime(): number | null {
    return this._rendererReadyTime;
  }

  public destroy() {
    this.window.destroy();
  }
}
