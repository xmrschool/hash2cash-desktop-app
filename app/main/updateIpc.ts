import { ipcMain } from 'electron';
import { autoUpdater } from './appUpdater';

ipcMain.on('check-updates', async (event: any) => {
  try {
    const update = await autoUpdater.checkForUpdates();

    if (update.downloadPromise) {
      autoUpdater.on('download-progress', stats => {
        event.sender.send('update-download-stats', stats);
      });

      autoUpdater.on('update-downloaded', () => {
        event.sender('update-downloaded', '');
        setTimeout(() => {
          autoUpdater.quitAndInstall();
        }, 5000);
      });
    }

    event.sender.send('update-state', {
      available: !!update.downloadPromise,
      version: update.updateInfo.version,
    });
  } catch (e) {
    console.error('Failed to check updates: ', e);
    event.sender.send('update-state', {
      available: false,
      version: e,
    });
  }
});
