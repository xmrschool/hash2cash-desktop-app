import { remote, ipcRenderer } from 'electron';
import { RouteComponentProps } from 'react-router';

import User from '../mobx-store/User';
import MinerObserver from '../mobx-store/MinerObserver';
import globalState from '../mobx-store/GlobalState';
import minerApi from '../api/MinerApi';
import InjectedIntl = ReactIntl.InjectedIntl;

const separator: Electron.MenuItemConstructorOptions = { type: 'separator' };

export default function buildMenu(router: RouteComponentProps<any>, intl: InjectedIntl) {
  const getMessage = (id: string) => intl.formatMessage({ id });
  return remote.Menu.buildFromTemplate([
    {
      label: getMessage('SETTINGS_MENU_GO_SETTINGS'),
      accelerator: 'CmdOrCtrl+,',
      click: () => {
        globalState.showLayer('settings');
      },
    },
    separator,
    {
      label: 'v' + remote.app.getVersion(),
      enabled: false,
    },
    separator,
    {
      label: getMessage('SETTINGS_MENU_LOGOUT'),
      click: () => {
        const response = remote.dialog.showMessageBox({
          type: 'warning',
          buttons: [getMessage('SETTINGS_MENU_LOGOUT_YEAH'), getMessage('SETTINGS_MENU_LOGOUT_CANCEL')],
          defaultId: 0,
          title: getMessage('SETTINGS_MENU_LOGOUT_SURE'),
          message: getMessage('SETTINGS_MENU_LOGOUT_SURE'),
        });

        if (response === 0) {
          User.clearAll();
          MinerObserver.clearAll();
          minerApi.workers.forEach(work => work.stop());

          router.history.push('/login');
        }
      },
    },
    {
      label: getMessage('SETTINGS_MENU_QUIT'),
      click: () => {
        ipcRenderer.send('quit');
      },
    },
  ]);
}
