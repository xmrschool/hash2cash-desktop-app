import { remote, ipcRenderer } from 'electron';
import { RouteComponentProps } from 'react-router';

import globalState from '../mobx-store/GlobalState';
import InjectedIntl = ReactIntl.InjectedIntl;

const separator: Electron.MenuItemConstructorOptions = { type: 'separator' };

export default function buildMenu(
  router: RouteComponentProps<any>,
  intl: InjectedIntl
) {
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
