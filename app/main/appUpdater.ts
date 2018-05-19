import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { autoUpdater } from 'electron-updater';

const app = electron.app || electron.remote.app;

autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

if (require('os').arch() === 'ia32' && __WIN32__) {
  autoUpdater.channel = 'beta-x32';
}

autoUpdater.on('update-available', () => {
  fs.writeFile(path.join(app.getPath('userData'), 'update.lock'), '');
});

export default function enableUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}

export { autoUpdater };
