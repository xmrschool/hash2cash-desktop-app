import { app, Menu } from 'electron';

import { AppWindow } from './appWindow';
import { now } from './now';
import buildDefaultMenu from './menu';
import { Server } from './server';

require('source-map-support').install();
let mainWindow: AppWindow | null = null;

const launchTime = now();

let preventQuit = false;
let readyTime: number | null = null;

type OnDidLoadFn = (window: AppWindow) => void;
/** See the `onDidLoad` function. */
let onDidLoadFns: Array<OnDidLoadFn> | null = [];

function handleUncaughtException(error: Error) {
  preventQuit = true;

  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }

  const isLaunchError = !mainWindow;
  console.log('Error is: ', error, isLaunchError);
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

  readyTime = now() - launchTime;

  createWindow();
  createServer();

  const menu = buildDefaultMenu();
  Menu.setApplicationMenu(menu);

  mainWindow!.bindContextMenu();
});

app.on('activate', () => {
  onDidLoad(window => {
    window.show();
  });
});

function createServer() {
  const server = new Server();

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

  window.onClose(() => {
    mainWindow = null;
    if (!__DARWIN__ && !preventQuit) {
      app.quit();
    }
  });

  window.onDidLoad(() => {
    if (onDidLoadFns === null) return;
    window.show();
    window.sendLaunchTimingStats({
      mainReadyTime: readyTime!,
      loadTime: window.loadTime!,
      rendererReadyTime: window.rendererReadyTime!,
    });

    console.log('onload fns: ', onDidLoadFns);
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
