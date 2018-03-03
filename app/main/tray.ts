import { Tray, Menu, app } from 'electron';
import * as path from 'path';

export default function buildTray() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => require('./index').openMainWindow() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  const tray = new Tray(path.join(__dirname, 'trayIcon.png'));

  tray.on('double-click', () => require('./index').openMainWindow());
  tray.setToolTip('Hash to Cash');
  tray.setContextMenu(contextMenu);

  console.log('Built tray: ', tray);
  return tray;
}
