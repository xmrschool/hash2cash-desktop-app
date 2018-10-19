import { ipcMain } from 'electron';
import { autoUpdater, downloadPromise } from './appUpdater';

ipcMain.on('check-updates', async (event: any) => {
  try {
    const update = await (downloadPromise || autoUpdater.checkForUpdates());

    if (update && update.downloadPromise) {
      autoUpdater.on('download-progress', stats => {
        console.log('Update progress: ', stats);
        event.sender.send('update-download-stats', stats);
      });

      autoUpdater.on('update-downloaded', () => {
        console.log('Update has been downloaded');
        event.sender.send('update-downloaded', '');
        setTimeout(() => {
          autoUpdater.quitAndInstall(true, true);
        }, 5000);
      });
    }

    event.sender.send('update-state', {
      available: !!update!.downloadPromise,
      version: update!.updateInfo.version,
    });
  } catch (e) {
    console.error('Failed to check updates: ', e);
    event.sender.send('update-state', {
      available: false,
      version: e,
    });
  }
});

export async function backgroundCheck() {
  const update = await (downloadPromise || autoUpdater.checkForUpdatesAndNotify());

  if (update && update.downloadPromise) {
    autoUpdater.on('download-progress', stats => {
      console.log('Update progress: ', stats);
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('Update has been downloaded');
      autoUpdater.quitAndInstall(true, true);
    });
  }
}