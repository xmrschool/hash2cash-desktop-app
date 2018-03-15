import { app, ipcMain, Menu } from 'electron';
import * as fs from 'fs-extra';
import { AppWindow } from './appWindow';
import { now } from './now';
import buildDefaultMenu from './menu';
import { Server, serverPort } from './server';
import * as path from 'path';
import buildTray from './tray';
import enableUpdates from './appUpdater';
import trackError from '../shared/raven';

require('source-map-support').install();

let mainWindow: AppWindow | null = null;

const launchTime = now();

let readyTime: number | null = null;
export let server: Server | null = null;
const quitting = false;

type OnDidLoadFn = (window: AppWindow | null) => void;
/** See the `onDidLoad` function. */
let onDidLoadFns: Array<OnDidLoadFn> | null = [];

function handleUncaughtException(error: Error) {
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }

  const isLaunchError = !mainWindow;

  trackError(error);
  console.log('Error is: ', error, isLaunchError);
}

async function runInitialSetupIfNeeded(cb: any) {
  const file = path.join(app.getPath('userData'), 'initial');
  const exists = await fs.pathExists(file);

  if (!exists) {
    cb();
    await fs.writeFile(file, '');
  }
}
async function quit() {
  app.quit();
}

process.on('uncaughtException', (error: Error) => {
  handleUncaughtException(error);
});

let isDuplicateInstance = false;

// We want to let the updated instance launch and do its work. It will then quit
// once it's done.
isDuplicateInstance = app.makeSingleInstance((args, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow && !mainWindow.destroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }

    mainWindow.focus();
  } else createWindow();
});

if (isDuplicateInstance) {
  app.quit();
}

app.on('ready', () => {
  runInitialSetupIfNeeded(() => {
    //  Auto start on OS startup
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: ['--hidden'], // openAsHidden supported on OS X, but arguments are supported on Windows
    });
  });

  const startMinimized =
    (process.argv || []).indexOf('--hidden') !== -1 ||
    app.getLoginItemSettings().wasOpenedAsHidden ||
    process.env.RUN_AS_HIDDEN; // Env could be used as test

  if (startMinimized) {
    console.log(
      "Seems that app was runned on auto start, so we don't start renderer",
    );
  }

  if (isDuplicateInstance) {
    return;
  }

  enableUpdates();
  buildTray();

  readyTime = now() - launchTime;

  ipcMain.on(
    'resolveUtil',
    (event: Electron.IpcMessageEvent, message: string) => {
      // Asar have limitations for executing binaries. See: https://electronjs.org/docs/tutorial/application-packaging#executing-binaries-inside-asar-archive
      const basePath = __DEV__
        ? path.join(__dirname, '..')
        : path.join(__dirname, '../../../app.asar.unpacked/app');
      // Base path must refer to app folder
      return event.sender.send(
        'resolveUtil',
        path.join(basePath, 'compiledUtils', message),
      );
    },
  );

  ipcMain.on('quit', quit);

  if (!startMinimized) {
    createWindow();
  } else if (onDidLoadFns) {
    onDidLoadFns = null;
  }

  createServer();
});

export function openMainWindow() {
  if (quitting) return;

  if (!mainWindow || mainWindow.destroyed()) {
    createWindow();
  } else {
    onDidLoad(() => {
      try {
        mainWindow!.isVisible() && mainWindow!.show();
        mainWindow!.focus();
      } catch (e) {}
    });
  }
}
app.on('activate', () => {
  openMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
/*

app.on('before-quit', event => {
  // Double ensure if windows and miners are closed
  if (!quitting) event.preventDefault();
  console.log('before-quit');

  quit();
});
*/

function createServer() {
  server = new Server();

  server.load(mainWindow);
}

function createWindow() {
  const window = new AppWindow();

  if (!Array.isArray(onDidLoadFns)) {
    onDidLoadFns = [];
  }

  if (__DEV__) {
    const installer = require('electron-devtools-installer');
    require('electron-debug')({ showDevTools: true });

    const extensions = ['REACT_DEVELOPER_TOOLS', 'REACT_PERF'];

    for (const name of extensions) {
      try {
        installer.default(installer[name]);
      } catch (e) {}
    }
  }

  window.show();
  window.onDidLoad(() => {
    if (onDidLoadFns === null) return;
    window.sendLaunchTimingStats({
      mainReadyTime: readyTime!,
      loadTime: window.loadTime!,
      rendererReadyTime: window.rendererReadyTime!,
    });

    // Renderer doesn't keep state of port so we save it
    if (serverPort) {
      window.sendMinerPort(serverPort);
    }

    window.bindContextMenu();
    const fns = onDidLoadFns!;
    onDidLoadFns = null;
    for (const fn of fns) {
      fn(window);
    }
  });

  window.load();

  mainWindow = window;
  const menu = buildDefaultMenu();
  Menu.setApplicationMenu(menu);
}

/**
 * Register a function to be called once the window has been loaded. If the
 * window has already been loaded, the function will be called immediately.
 */
function onDidLoad(fn: OnDidLoadFn) {
  if (onDidLoadFns) {
    onDidLoadFns.push(fn);
  } else {
    fn(mainWindow);
  }
}
