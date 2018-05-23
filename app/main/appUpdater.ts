import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { autoUpdater, UpdateCheckResult } from 'electron-updater';

const app = electron.app || electron.remote.app;

let downloadPromise: Promise<UpdateCheckResult | null> | undefined;
autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

autoUpdater.setFeedURL({
  provider: 'spaces',
  name: 'hash2cash',
  region: 'ams3',
  path: 'app',
  channel: 'latest',
});

if (require('os').arch() === 'ia32' && __WIN32__) {
  autoUpdater.channel = 'latest-x32';
}

autoUpdater.on('update-available', () => {
  fs.writeFile(path.join(app.getPath('userData'), 'update.lock'), '');
});

export default async function enableUpdates() {
  const tok = autoUpdater.checkForUpdatesAndNotify();

  // Prevent concurrency
  downloadPromise = tok;

  downloadPromise.then(d => {
    downloadPromise = undefined;
  })
}

export { autoUpdater, downloadPromise };
