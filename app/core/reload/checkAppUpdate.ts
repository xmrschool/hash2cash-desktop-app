import { Context, ExpectedReturn } from './reloader';
import { autoUpdater } from 'electron-updater';

export function formatBytes(bytes: number, decimals: number = 2) {
  if (bytes === 0) return '0';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (
    parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
  );
}

export default async function checkAppUpdates(
  ctx: Context
): Promise<ExpectedReturn> {
  if (__DEV__) return { skipped: true };
  ctx.setStatus('Checking for app updates...');

  const update = await autoUpdater.checkForUpdates();

  // Then update available
  // ToDo is it better to use downloadPromise?
  if (update.downloadPromise) {
    ctx.setStatusWithoutAnimation(
      `Available new verison of app (${
        update.updateInfo.version
      }). Downloading...`
    );

    autoUpdater.on('download-progress', stats => {
      ctx.setStatusWithoutAnimation(
        `Downloading ${update.updateInfo.version} ${formatBytes(
          stats.transferred || 0
        )} / ${formatBytes(stats.total || 0)} @ ${formatBytes(
          stats.bytesPerSecond || 0
        )}/s`
      );
    });

    autoUpdater.on('update-downloaded', () => {
      let secondsLeftBeforeQuit = 5;

      ctx.setStatus(`Installing app after ${secondsLeftBeforeQuit} seconds`);
      const interval = setInterval(() => {
        secondsLeftBeforeQuit--;
        ctx.setStatus(`Installing app after ${secondsLeftBeforeQuit} seconds`);
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);

        autoUpdater.quitAndInstall();
      });
    });

    return { dontContinue: true, blockUpdater: true };
  }

  return {};
}
