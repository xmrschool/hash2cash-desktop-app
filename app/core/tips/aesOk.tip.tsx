import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { observable } from 'mobx';
import { ITip } from './';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { intl } from '../../renderer/intl';

export default class AesOkTip implements ITip {
  id = 'aes';
  name = 'AES-supported CPU';
  @observable workaround = <FormattedMessage id="TIPS_AES_WORKAROUND" />;
  @observable couldBeFixed = false;
  @observable defined = true;
  @observable isOk = true;
  @observable level = 1;
  @observable buttonDisabled = true;
  @observable fixError = '';

  async checkOut() {
    this.name = intl.formatMessage({ id: 'TIPS_AES_NAME' });

    const cpu = LocalStorage.collectedReport!.devices.find(
      d => d.type === 'cpu'
    );

    const hasAesInstructions = (cpu as any).collectedInfo.features
      .aesInstructions;

    if (typeof hasAesInstructions === 'undefined') {
      // A cpuInfo report
      this.defined = false;

      return;
    }

    this.isOk = hasAesInstructions;
  }
}
