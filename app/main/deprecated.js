const path = require('path');
const { app, BrowserWindow, Menu, shell } = require('electron');

const { RENDERER_PATH } = require('../config');
const { getRelativeLink } = require('./utils');

let menu;
let template;
let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support'); // eslint-disable-line
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development') {
  require('electron-debug')(); // eslint-disable-line global-require
  const path = require('path'); // eslint-disable-line
  const p = path.join(__dirname, '..', 'app', 'node_modules'); // eslint-disable-line
  require('module').globalPaths.push(p); // eslint-disable-line
}

app.on('window-all-closed', () => {});

const installExtensions = () => {
  if (process.env.NODE_ENV === 'development') {
    const installer = require('electron-devtools-installer'); // eslint-disable-line global-require

    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    return Promise.all(
      extensions.map(name => installer.default(installer[name], forceDownload)),
    );
  }

  return Promise.resolve([]);
};

app.on('ready', () =>
  installExtensions().then(() => {
    const rendererPath = `file://${path.join(
      __dirname,
      '../renderer/entrypoint.html'
    )}`;

    mainWindow = new BrowserWindow({
      backgroundColor: '#181C21',
      backgroundThrottling: false, // do not throttle animations/timers when page is background
      darkTheme: true,
      show: false,
      title: 'Hash to Cash',
      titleBarStyle: 'hidden-inset',
      width: 540,
      height: 735,
    });
    mainWindow.setMenu(null);

    mainWindow.loadURL(rendererPath);

    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    mainWindow.on('active', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindow.openDevTools();
      mainWindow.webContents.on('context-menu', (e, props) => {
        const { x, y } = props;

        Menu.buildFromTemplate([
          {
            label: 'Inspect element',
            click() {
              mainWindow.inspectElement(x, y);
            },
          },
        ]).popup(mainWindow);
      });
    }

    if (process.platform === 'darwin') {
      template = [
        {
          label: 'Hash to Cash',
          submenu: [
            {
              label: 'About Hash to Cash',
              selector: 'orderFrontStandardAboutPanel:',
            },
            {
              type: 'separator',
            },
            {
              label: 'Services',
              submenu: [],
            },
            {
              type: 'separator',
            },
            {
              label: 'Hide ElectronReact',
              accelerator: 'Command+H',
              selector: 'hide:',
            },
            {
              label: 'Hide Others',
              accelerator: 'Command+Shift+H',
              selector: 'hideOtherApplications:',
            },
            {
              label: 'Show All',
              selector: 'unhideAllApplications:',
            },
            {
              type: 'separator',
            },
            {
              label: 'Quit',
              accelerator: 'Command+Q',
              click() {
                app.quit();
              },
            },
          ],
        },
        {
          label: 'View',
          submenu: process.env.NODE_ENV
            ? [
              {
                label: 'Reload',
                accelerator: 'Command+R',
                click() {
                  mainWindow.webContents.loadURL(rendererPath);
                },
              },
              {
                label: 'Toggle Full Screen',
                accelerator: 'Ctrl+Command+F',
                click() {
                  mainWindow.setFullScreen(!mainWindow.isFullScreen());
                },
              },
              {
                label: 'Toggle Developer Tools',
                accelerator: 'Alt+Command+I',
                click() {
                  mainWindow.toggleDevTools();
                },
              },
            ]
            : [
              {
                label: 'Toggle Full Screen',
                accelerator: 'Ctrl+Command+F',
                click() {
                  mainWindow.setFullScreen(!mainWindow.isFullScreen());
                },
              },
            ],
        },
        {
          label: 'Edit',
          submenu: [
            {
              label: 'Undo',
              accelerator: 'Command+Z',
              selector: 'undo:',
            },
            {
              label: 'Redo',
              accelerator: 'Shift+Command+Z',
              selector: 'redo:',
            },
            {
              type: 'separator',
            },
            {
              label: 'Cut',
              accelerator: 'Command+X',
              selector: 'cut:',
            },
            {
              label: 'Copy',
              accelerator: 'Command+C',
              selector: 'copy:',
            },
            {
              label: 'Paste',
              accelerator: 'Command+V',
              selector: 'paste:',
            },
            {
              label: 'Select All',
              accelerator: 'Command+A',
              selector: 'selectAll:',
            },
          ],
        },
        {
          label: 'Window',
          submenu: [
            {
              label: 'Minimize',
              accelerator: 'Command+M',
              selector: 'performMiniaturize:',
            },
            {
              label: 'Close',
              accelerator: 'Command+W',
              selector: 'performClose:',
            },
            {
              type: 'separator',
            },
            {
              label: 'Bring All to Front',
              selector: 'arrangeInFront:',
            },
          ],
        },
        {
          label: 'Help',
          submenu: [
            {
              label: 'Hash to Cash',
              click() {
                shell.openExternal(getRelativeLink('/?utm_medium=help'));
              },
            },
            {
              label: 'FAQ',
              click() {
                shell.openExternal(getRelativeLink('/faq?utm_medium=help'));
              },
            },
            {
              label: 'Privacy policy',
              click() {
                shell.openExternal(getRelativeLink('/privacy?utm_medium=help'));
              },
            },
            {
              label: 'Terms of Service',
              click() {
                shell.openExternal(getRelativeLink('/tos?utm_medium=help'));
              },
            },
          ],
        },
      ];

      menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    } else {
      template = [
        {
          label: '&File',
          submenu: [
            {
              label: '&Open',
              accelerator: 'Ctrl+O',
            },
            {
              label: '&Close',
              accelerator: 'Ctrl+W',
              click() {
                mainWindow.close();
              },
            },
          ],
        },
        {
          label: '&View',
          submenu:
            process.env.NODE_ENV === 'development'
              ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click() {
                    mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click() {
                    mainWindow.toggleDevTools();
                  },
                },
              ]
              : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                  },
                },
              ],
        },
        {
          label: 'Help',
          submenu: [
            {
              label: 'Learn More',
              click() {
                shell.openExternal('http://electron.atom.io');
              },
            },
            {
              label: 'Documentation',
              click() {
                shell.openExternal(
                  'https://github.com/atom/electron/tree/master/docs#readme',
                );
              },
            },
            {
              label: 'Community Discussions',
              click() {
                shell.openExternal('https://discuss.atom.io/c/electron');
              },
            },
            {
              label: 'Search Issues',
              click() {
                shell.openExternal('https://github.com/atom/electron/issues');
              },
            },
          ],
        },
      ];
      menu = Menu.buildFromTemplate(template);
      mainWindow.setMenu(menu);
    }
  }),
);
