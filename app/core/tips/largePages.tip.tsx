import * as React from 'react';
import {
  getLargePageState,
  attemptToEnableLargePages,
} from 'native-utils';
import { FormattedMessage } from 'react-intl';
import { observable } from 'mobx';
import { ITip } from './';

export default class LargePagesTip implements ITip {
  name = 'Использовать Large Pages';
  @observable
  workaround = <FormattedMessage id="TIPS_LARGE_PAGES_WORKAROUND" />;
  @observable couldBeFixed = true;
  @observable isOk = true;
  defined = true;
  @observable level = 3;
  @observable buttonDisabled = false;
  @observable fixError = '';

  async checkOut() {
    const { available, enabled } = getLargePageState(
      require('os').cpus().length
    );

    console.log('Large page state: ', available, enabled);

    this.couldBeFixed = available && __WIN32__;
    this.isOk = enabled;

    if (!enabled && __WIN32__ === false) {
      this.workaround = <FormattedMessage id="TIPS_LARGE_PAGES_REBOOT_MIGHT_HELP" />;
    }
  }

  async fixIt() {
    const res = attemptToEnableLargePages() as any;

    if (res === 'NEEDA_REBOOT') {
      this.isOk = true;
      this.workaround = <FormattedMessage id="TIPS_LARGE_PAGES_REBOOT_MUST_HELP" />;

      return true;
    }

    this.isOk = false;
    this.workaround = <FormattedMessage id="TIPS_LARGE_PAGES_FAILED" values={{ reason: res }} />;

    return false;
  }
}
