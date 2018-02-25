"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const now_1 = require("./now");
const path = require("path");
const events_1 = require("events");
let windowStateKeeper = null;
class AppWindow {
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this._loadTime = null;
        this._rendererReadyTime = null;
        this.minWidth = 540;
        this.minHeight = 735;
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
        const windowOptions = {
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
        };
        if (__WIN32__) {
            windowOptions.frame = false;
        }
        else if (__LINUX__) {
        }
        this.window = new electron_1.BrowserWindow(windowOptions);
        savedWindowState.manage(this.window);
        let quitting = false;
        electron_1.app.on('before-quit', () => {
            quitting = true;
        });
        electron_1.ipcMain.on('will-quit', (event) => {
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
                    electron_1.Menu.sendActionToFirstResponder('hide:');
                }
            });
        }
        this.window.setMenu(null);
    }
    load() {
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
            startLoad = now_1.now();
        });
        this.window.webContents.once('did-finish-load', () => {
            if (__DEV__) {
                this.window.webContents.openDevTools();
            }
            this._loadTime = now_1.now() - startLoad;
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
        electron_1.ipcMain.once('renderer-ready', (event, readyTime) => {
            this._rendererReadyTime = readyTime;
            this.maybeEmitDidLoad();
        });
        this.window.on('focus', () => this.window.webContents.send('focus'));
        this.window.on('blur', () => this.window.webContents.send('blur'));
        console.log('URL is being loaded', path.join(__dirname, '..', 'renderer', 'app.html'));
        this.window.loadURL('file://' + path.join(__dirname, '..', 'renderer', 'app.html'));
    }
    // Helps you to inspect element
    bindContextMenu() {
        this.window.webContents.on('context-menu', (e, props) => {
            const { x, y } = props;
            electron_1.Menu.buildFromTemplate([
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
    maybeEmitDidLoad() {
        this.emitter.emit('did-load', null);
    }
    onClose(fn) {
        this.window.on('closed', fn);
    }
    /**
     * Register a function to call when the window is done loading. At that point
     * the page has loaded and the renderer has signalled that it is ready.
     */
    onDidLoad(fn) {
        return this.emitter.on('did-load', fn);
    }
    isMinimized() {
        return this.window.isMinimized();
    }
    /** Is the window currently visible? */
    isVisible() {
        return this.window.isVisible();
    }
    restore() {
        this.window.restore();
    }
    focus() {
        this.window.focus();
    }
    /** Show the window. */
    show() {
        this.window.show();
    }
    /** Send the app launch timing stats to the renderer. */
    sendMinerPort(port) {
        this.onDidLoad(() => this.window.webContents.send('miner-server-port', port));
    }
    /** Send the app launch timing stats to the renderer. */
    sendLaunchTimingStats(stats) {
        this.window.webContents.send('launch-timing-stats', { stats });
    }
    /**
     * Get the time (in milliseconds) spent loading the page.
     *
     * This will be `null` until `onDidLoad` is called.
     */
    get loadTime() {
        return this._loadTime;
    }
    /**
     * Get the time (in milliseconds) elapsed from the renderer being loaded to it
     * signaling it was ready.
     *
     * This will be `null` until `onDidLoad` is called.
     */
    get rendererReadyTime() {
        return this._rendererReadyTime;
    }
    destroy() {
        this.window.destroy();
    }
}
exports.AppWindow = AppWindow;
//# sourceMappingURL=appWindow.js.map