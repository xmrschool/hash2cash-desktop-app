import { Tray, Menu, app, nativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;
export default function buildTray() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => require('./index').openMainWindow() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  const image = nativeImage.createFromPath(
    path.join(__dirname, 'trayIcon.png')
  );
  tray = new Tray(image);

  tray.on('double-click', () => require('./index').openMainWindow());
  tray.setToolTip('Hash to Cash');
  tray.setContextMenu(contextMenu);

  console.log('Built tray: ', tray);
  return tray;
}
