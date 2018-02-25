"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const appWindow_1 = require("./appWindow");
const now_1 = require("./now");
const menu_1 = require("./menu");
const server_1 = require("./server");
require('source-map-support').install();
let mainWindow = null;
const launchTime = now_1.now();
let preventQuit = false;
let readyTime = null;
/** See the `onDidLoad` function. */
let onDidLoadFns = [];
function handleUncaughtException(error) {
    preventQuit = true;
    if (mainWindow) {
        mainWindow.destroy();
        mainWindow = null;
    }
    const isLaunchError = !mainWindow;
    console.log('Error is: ', error, isLaunchError);
}
process.on('uncaughtException', (error) => {
    handleUncaughtException(error);
});
let isDuplicateInstance = false;
// We want to let the updated instance launch and do its work. It will then quit
// once it's done.
isDuplicateInstance = electron_1.app.makeSingleInstance((args, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
        mainWindow.focus();
    }
});
if (isDuplicateInstance) {
    electron_1.app.quit();
}
electron_1.app.on('ready', () => {
    if (isDuplicateInstance) {
        return;
    }
    readyTime = now_1.now() - launchTime;
    createWindow();
    createServer();
    const menu = menu_1.default();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow.bindContextMenu();
});
electron_1.app.on('activate', () => {
    onDidLoad(window => {
        window.show();
    });
});
function createServer() {
    const server = new server_1.Server();
    server.load(mainWindow);
}
function createWindow() {
    const window = new appWindow_1.AppWindow();
    console.log('Is dev?', __DEV__);
    if (__DEV__) {
        const installer = require('electron-devtools-installer');
        require('electron-debug')({ showDevTools: true });
        const extensions = ['REACT_DEVELOPER_TOOLS', 'REACT_PERF'];
        for (const name of extensions) {
            try {
                installer.default(installer[name]);
            }
            catch (e) { }
        }
    }
    window.onClose(() => {
        mainWindow = null;
        if (!__DARWIN__ && !preventQuit) {
            electron_1.app.quit();
        }
    });
    window.onDidLoad(() => {
        if (onDidLoadFns === null)
            return;
        window.show();
        window.sendLaunchTimingStats({
            mainReadyTime: readyTime,
            loadTime: window.loadTime,
            rendererReadyTime: window.rendererReadyTime,
        });
        console.log('onload fns: ', onDidLoadFns);
        const fns = onDidLoadFns;
        onDidLoadFns = null;
        for (const fn of fns) {
            fn(window);
        }
    });
    window.load();
    mainWindow = window;
}
/**
 * Register a function to be called once the window has been loaded. If the
 * window has already been loaded, the function will be called immediately.
 */
function onDidLoad(fn) {
    if (onDidLoadFns) {
        onDidLoadFns.push(fn);
    }
    else {
        if (mainWindow) {
            fn(mainWindow);
        }
    }
}
//# sourceMappingURL=index.js.map