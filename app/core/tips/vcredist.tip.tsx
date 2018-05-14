import { remote } from 'electron';
import { action, observable } from 'mobx';
import { ITip } from './';
import { intl } from '../../renderer/intl';
import { isOk, downloadAndInstall } from '../reload/vcRedistDetector';
import * as path from 'path';
import { InitializationState } from '../../renderer/mobx-store/InitializationState';

export function formatStats(stats: any): string {
  const {
    size: { total, transferred },
    speed,
  } = stats;

  return `${InitializationState.formatBytes(
    transferred || 0
  )} / ${InitializationState.formatBytes(
    total || 0
  )} @ ${InitializationState.formatBytes(speed || 0)}/s`;
}

export default class VcredistTip implements ITip {
  id = 'vcredist';
  name = 'Install VCRedist';
  @observable workaround: string = 'Just install it, ok?';
  @observable couldBeFixed = true;
  @observable defined = true;
  @observable isOk = true;
  @observable level = 4;
  @observable buttonDisabled = false;
  downloadLink: string = '';
  @observable fixError = '';

  @action
  async checkOut() {
    if (__WIN32__ === false) {
      this.defined = false;
      return;
    }

    this.name = intl.formatMessage({
      id: 'TIPS_VCREDIST_LABEL',
      defaultMessage: 'Install VCRedist',
    });
    this.workaround = intl.formatMessage({
      id: 'TIPS_VCREDIST_WORKAROUND',
      defaultMessage: 'Install VCRedist',
    });

    this.isOk = await isOk();
  }

  async fixIt() {
    const result = await downloadAndInstall((stats: any) => {
      this.workaround = intl.formatMessage(
        { id: 'mobx.init.status.vcredist.downloading' },
        { status: formatStats(stats) }
      );
    }, path.join(remote.app.getPath('userData'), 'tmp', 'vcredist.exe'));

    if (result) {
      this.isOk = true;
    }

    this.workaround = intl.formatMessage({
      id: 'TIPS_VCREDIST_WORKAROUND',
      defaultMessage: 'Install VCRedist',
    });

    return false;
  }
}
