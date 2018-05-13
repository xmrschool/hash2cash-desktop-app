import { remote } from 'electron';
import { defineMessages } from 'react-intl';
import { autoUpdater } from 'electron-updater';
import { Context, ExpectedReturn } from './reloader';
import { intl } from "../../renderer/intl";

export function formatBytes(bytes: number, decimals: number = 2) {
  if (bytes === 0) return '0';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (
    parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
  );
}

const messages = defineMessages({
  checking: {
    id: 'core.reload.updates.checking',
    defaultMessage: 'Checking app updates...',
  },
  newAvailable: {
    id: 'core.reload.updates.newAvailable',
    defaultMessage: 'Available new version of app {version}, downloading...',
  },
  getReady: {
    id: 'core.reload.updates.installingAfter',
    defaultMessage: `Installing update after {secs, number} {unreadCount, plural, one {second} other {seconds}}`,
  }
});

export default async function checkAppUpdates(
  ctx: Context
): Promise<ExpectedReturn> {
  if (__DEV__) return { skipped: true };
  ctx.setStatus('Checking for app updates...');

  (autoUpdater as any).app = remote.app;
  const update = await autoUpdater.checkForUpdates();

  console.log('What\'s up?', update);

  // Then update available
  // ToDo is it better to use downloadPromise?
  if (update.downloadPromise) {
    const message = intl.formatMessage(messages.newAvailable, { version: update.updateInfo.version });
    ctx.setStatusWithoutAnimation(message);

    autoUpdater.on('download-progress', stats => {
      ctx.setStatusWithoutAnimation(
        `${update.updateInfo.version} ${formatBytes(
          stats.transferred || 0
        )} / ${formatBytes(stats.total || 0)} @ ${formatBytes(
          stats.bytesPerSecond || 0
        )}/s`
      );
    });

    autoUpdater.on('update-downloaded', () => {
      let secondsLeftBeforeQuit = 5;

      const message = intl.formatMessage(messages.getReady, { secs: secondsLeftBeforeQuit });
      ctx.setStatus(message);
      const interval = setInterval(() => {
        secondsLeftBeforeQuit--;
        const message = intl.formatMessage(messages.getReady, { secs: secondsLeftBeforeQuit });
        ctx.setStatus(message);
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
