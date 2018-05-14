import { observable } from 'mobx';
import { ITip } from './';
import elevate, { getWindowsUtils } from '../windows/elevate';
import * as path from 'path';
import getUserName from '../windows/getUserName';
import { intl } from '../../renderer/intl';

export default class LargePagesTip implements ITip {
  id = 'hugepages';
  name = 'Large Pages (BETA)';
  @observable workaround = 'Gonna be filled';
  @observable couldBeFixed = true;
  @observable isOk = true;
  defined = true;
  @observable level = 3;
  @observable buttonDisabled = false;
  @observable fixError = '';

  async checkOut() {
    const enabled = localStorage.largePageState === 'true';

    this.workaround = intl.formatMessage({ id: 'TIPS_LARGE_PAGES_WORKAROUND' });
    this.couldBeFixed = !enabled && __WIN32__;
    this.isOk = enabled;

    if (!enabled && __WIN32__ === false) {
      this.workaround = intl.formatMessage({
        id: 'TIPS_LARGE_PAGES_REBOOT_MIGHT_HELP',
      });
    }
  }

  async fixIt() {
    elevate(
      '"' +
        path.join(getWindowsUtils(), 'ntrights.exe') +
        `" -u "${getUserName()}" +r SeLockMemoryPrivilege`,
      undefined
    );

    localStorage.largePageState = true;
    this.isOk = true;
    this.workaround = intl.formatMessage({
      id: 'TIPS_LARGE_PAGES_REBOOT_MUST_HELP',
    });

    return true;
  }
}
