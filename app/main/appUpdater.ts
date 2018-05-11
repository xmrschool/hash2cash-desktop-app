import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { BaseUpdater } from "electron-updater/out/BaseUpdater";

let autoUpdater: BaseUpdater;

const app = electron.app || electron.remote.app;
// tslint:disable:prefer-conditional-expression
if (process.platform === "win32") {
  autoUpdater = new (require("electron-updater/out/NsisUpdater").NsisUpdater)(undefined, app);
} else if (process.platform === "darwin") {
  autoUpdater = new (require("electron-updater/out/MacUpdater").MacUpdater)(undefined, app);
} else {
  autoUpdater = new (require("electron-updater/out/AppImageUpdater").AppImageUpdater)(undefined, app);
}

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
