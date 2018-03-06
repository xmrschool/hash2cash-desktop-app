import { autoUpdater } from 'electron-updater';

autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

export default function enableUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}
