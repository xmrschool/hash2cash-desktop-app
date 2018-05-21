import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { autoUpdater, UpdateCheckResult } from 'electron-updater';

const app = electron.app || electron.remote.app;

let downloadPromise: Promise<UpdateCheckResult | null> | undefined;
autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

if (require('os').arch() === 'ia32' && __WIN32__) {
  autoUpdater.setFeedURL({
    provider: 'spaces',
    name: 'hash2cash',
    region: 'ams3',
    path: 'desktopReleases/beta-x32',
    channel: 'beta-x32',
  });
  autoUpdater.channel = 'beta-x32';
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
