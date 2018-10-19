import { remote, ipcRenderer } from 'electron';
import MinerObserver from '../mobx-store/MinerObserver';
import User from '../mobx-store/User';
import minerApi from '../api/MinerApi';
import socket from '../socket';
import { getIntl } from '../intl';

export async function quitAccount(router: any) {
  const intl = await getIntl();
  const getMessage = (id: string) => intl.formatMessage({ id });
  const response = remote.dialog.showMessageBox({
    type: 'warning',
    buttons: [
      getMessage('SETTINGS_MENU_LOGOUT_YEAH'),
      getMessage('SETTINGS_MENU_LOGOUT_CANCEL'),
    ],
    defaultId: 0,
    title: getMessage('SETTINGS_MENU_LOGOUT_SURE'),
    message: getMessage('SETTINGS_MENU_LOGOUT_SURE'),
  });

  if (response === 0) {
    User.clearAll();
    MinerObserver.clearAll();
    minerApi.workers.forEach(work => work.stop());
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 500);

    router.history.push('/login');
  }
}

export async function quitApp() {
  ipcRenderer.send('quit');
}