import { Menu, shell } from 'electron';
import { getRelativeLink } from './utils';
import { RENDERER_PATH } from './appWindow';

const openExternal = (link: string) => () =>
  shell.openExternal(getRelativeLink(link));

const separator: Electron.MenuItemConstructorOptions = { type: 'separator' };
export default function buildDefaultMenu() {
  const template = new Array<Electron.MenuItemConstructorOptions>();

  template.push({
    label: 'Hash to Cash',
    submenu: [
      {
        label: 'About Hash to Cash',
        click() {
          console.log('Clicked about');
        },
        id: 'about',
      },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      separator,
      { role: 'quit' },
    ],
  });

  template.push({
    label: __DARWIN__ ? 'Edit' : '&Edit',
    submenu: [
      { role: 'undo', label: __DARWIN__ ? 'Undo' : '&Undo' },
      { role: 'redo', label: __DARWIN__ ? 'Redo' : '&Redo' },
      separator,
      { role: 'cut', label: __DARWIN__ ? 'Cut' : 'Cu&t' },
      { role: 'copy', label: __DARWIN__ ? 'Copy' : '&Copy' },
      { role: 'paste', label: __DARWIN__ ? 'Paste' : '&Paste' },
      { role: 'selectall', label: __DARWIN__ ? 'Select All' : 'Select &all' },
    ],
  });

  template.push({
    label: __DARWIN__ ? 'View' : '&View',
    submenu: [
      {
        label: '&Reload',
        id: 'reload-window',
        // Ctrl+Alt is interpreted as AltGr on international keyboards and this
        // can clash with other shortcuts. We should always use Ctrl+Shift for
        // chorded shortcuts, but this menu item is not a user-facing feature
        // so we are going to keep this one around and save Ctrl+Shift+R for
        // a different shortcut in the future...
        accelerator: 'CmdOrCtrl+Alt+R',
        click(item: any, focusedWindow: Electron.BrowserWindow) {
          if (focusedWindow) {
            focusedWindow.loadURL(RENDERER_PATH);
          }
        },
        visible: __DEV__,
      },
      {
        id: 'show-devtools',
        label: __DARWIN__
          ? 'Toggle Developer Tools'
          : '&Toggle developer tools',
        accelerator: __DARWIN__ ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        visible: __DEV__,
        click(item: any, focusedWindow: Electron.BrowserWindow) {
          if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools();
          }
        },
      },
    ],
  });

  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Hash to Cash',
        click: openExternal('/?utm_source=help'),
        id: 'help',
      },
      {
        label: 'FAQ',
        click: openExternal('/faq?utm_source=help'),
        id: 'faq',
      },
      {
        label: 'Privacy policy',
        click: openExternal('/privacy?utm_source=help'),
        id: 'privacy',
      },
      {
        label: 'Terms of Service',
        click: openExternal('/tos?utm_source=help'),
        id: 'tos',
      },
    ],
  });

  return Menu.buildFromTemplate(template);
}
