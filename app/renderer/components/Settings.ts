import { remote, ipcRenderer } from 'electron';
import { RouteComponentProps } from 'react-router';

import User from '../mobx-store/User';
import MinerObserver from '../mobx-store/MinerObserver';
import globalState from '../mobx-store/GlobalState';
import minerApi from '../api/MinerApi';

const separator: Electron.MenuItemConstructorOptions = { type: 'separator' };

export default function buildMenu(router: RouteComponentProps<any>) {
  return remote.Menu.buildFromTemplate([
    {
      label: 'Settings',
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
      label: 'Logout',
      click: () => {
        const response = remote.dialog.showMessageBox({
          type: 'warning',
          buttons: ['Exit', 'Cancel'],
          defaultId: 0,
          title: 'Are you sure you want to logout?',
          message: 'Are you sure you want to logout?',
          detail: 'You miner data will be lost.',
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
      label: 'Quit Hash to Cash',
      click: () => {
        ipcRenderer.send('quit');
      },
    },
  ]);
}
