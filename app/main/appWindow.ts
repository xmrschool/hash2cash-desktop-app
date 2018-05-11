import { BrowserWindow, ipcMain, Menu, app } from 'electron';
import { now } from './now';
import * as path from 'path';
import { EventEmitter } from 'events';

let windowStateKeeper: any | null = null;

export let RENDERER_PATH: string;
export class AppWindow {
  private readonly window: Electron.BrowserWindow;
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
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        backgroundThrottling: false,
      },
      frame: false,
    };
    this.window = new BrowserWindow(windowOptions);
    savedWindowState.manage(this.window);

    this.window.setClosable(true);
    let quitting = false;
    app.on('before-quit', () => {
      quitting = true;
    });

    ipcMain.on('will-quit', (event: Electron.IpcMessageEvent) => {
      quitting = true;
      event.returnValue = true;
    });

    this.window.setAutoHideMenuBar(true);
    this.window.setMenuBarVisibility(false);
    // on macOS, when the user closes the window we really just hide it. This
    // lets us activate quickly and keep all our interesting logic in the
    // renderer.
    this.window.on('close', e => {
      if (!quitting) {
        e.preventDefault();
        this.hide();
      }
    });

    this.window.setMenu(null);
  }

  public load(suffix: string = '') {
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
        this.window.webContents.openDevTools({
          mode: 'detach',
        });
      }

      this._loadTime = now() - startLoad;
    });

    this.window.webContents.on('did-finish-load', () => {
      console.log('did-finish-load');
      this.window.webContents.setVisualZoomLevelLimits(1, 1);
      this.bindCrash();
      this.maybeEmitDidLoad();
    });

    this.window.webContents.on('did-fail-load', (e, th) => {
      this.window.webContents.openDevTools({
        mode: 'detach',
      });
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

    RENDERER_PATH = `file://${path.join(__dirname, '../renderer/app.html')}`;
    this.window.loadURL(
      `file://${path.join(__dirname, '../renderer/app.html') + suffix}`
    );
  }

  // Helps you to inspect element
  public bindContextMenu() {
    this.window.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          role: 'copy',
        },
        {
          role: 'paste',
        },
        {
          label: 'Inspect element',
          click: () => {
            this.window.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.window });
    });
  }
  /**
   * Emit the `onDidLoad` event if the page has loaded and the renderer has
   * signalled that it's ready.
   */
  private maybeEmitDidLoad() {
    this.emitter.emit('did-load', null);
  }

  public destroyed() {
    return this.window.isDestroyed();
  }

  public onClose(fn: () => void) {
    this.window.on('closed', fn);
  }

  public beforeClose(fn: (event: Electron.Event) => void) {
    this.window.on('close', fn);
  }

  public onMinimize(fn: (event: Electron.Event) => void) {
    this.window.on('minimize', fn);
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
    try {
      return this.window.isVisible();
    } catch (e) {
      return false;
    }
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
    console.log('gonna send port: ', port);

    this.onDidLoad(() => {
      console.log('sending port repeatedly: ', port);
      this.window.webContents.send('miner-server-port', port);
    });

    if (this.window.isDestroyed()) {
      return;
    }

    this.window.webContents.send('miner-server-port', port);
    setTimeout(
      () => this.window.webContents.send('miner-server-port', port),
      200
    ); // Send immediately and after 200ms
    setTimeout(
      () => this.window.webContents.send('miner-server-port', port),
      1000
    ); // And after sec
  }

  public bindCrash() {
    this.window.webContents.once('crashed', evt => {
      console.log('Renderer has crashed: ', evt);

      this.load('#/crashed');
    })
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

  public resetBenchmark() {
    this.window.webContents.emit('resetBenchmark', 'can you please?');
  }

  public hide() {
    this.window.destroy();
  }
}
