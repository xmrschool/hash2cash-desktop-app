import { autoUpdater } from 'electron-updater';

export default function enableUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
  console.log('update feed is: ', autoUpdater.getFeedURL());
}
