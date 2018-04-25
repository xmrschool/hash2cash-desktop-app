import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

import { autoUpdater } from 'electron-updater';

autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

autoUpdater.on('update-available', () => {
  fs.writeFile(path.join(app.getPath('userData'), 'update.lock'), '');
});

export default function enableUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}

export { autoUpdater };
