import { app, ipcMain, Menu } from 'electron';

import { AppWindow } from './appWindow';
import { now } from './now';
import buildDefaultMenu from './menu';
import { Server, serverPort } from './server';
import * as path from 'path';
import buildTray from './tray';

require('source-map-support').install();

let mainWindow: AppWindow | null = null;

const launchTime = now();

let readyTime: number | null = null;
let server: Server | null = null;
const quitting = false;

type OnDidLoadFn = (window: AppWindow) => void;
/** See the `onDidLoad` function. */
let onDidLoadFns: Array<OnDidLoadFn> | null = [];

function handleUncaughtException(error: Error) {
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }

  const isLaunchError = !mainWindow;
  console.log('Error is: ', error, isLaunchError);
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
  app.quit();
}


app.on('ready', () => {
  if (isDuplicateInstance) {
    return;
  }

  buildTray();
  readyTime = now() - launchTime;

  ipcMain.on(
    'resolveUtil',
    (event: Electron.IpcMessageEvent, message: string) => {
      // Asar have limitations for executing binaries. See: https://electronjs.org/docs/tutorial/application-packaging#executing-binaries-inside-asar-archive
      const basePath = !__DEV__
        ? path.join(__dirname, '..')
        : path.join(__dirname, '../../../app.asar.unpacked/app');
      // Base path must refer to app folder
      return event.sender.send(
        'resolveUtil',
        path.join(basePath, 'compiledUtils', message)
      );
    }
  );

  ipcMain.on('quit', quit);

  createWindow();
  createServer();

  const menu = buildDefaultMenu();
  Menu.setApplicationMenu(menu);
});

export function openMainWindow() {
  onDidLoad(window => {
    if (quitting) return;

    window!.destroyed() && createWindow();
    onDidLoad(() => {
      !window.isVisible() && mainWindow!.show();
      mainWindow!.focus();
    });
  });
}
app.on('activate', () => {
  openMainWindow();
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

  server.load(mainWindow!);
}

function createWindow() {
  const window = new AppWindow();

  console.log('Is dev?', __DEV__);
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
}

/**
 * Register a function to be called once the window has been loaded. If the
 * window has already been loaded, the function will be called immediately.
 */
function onDidLoad(fn: OnDidLoadFn) {
  if (onDidLoadFns) {
    onDidLoadFns.push(fn);
  } else {
    if (mainWindow) {
      fn(mainWindow);
    }
  }
}
