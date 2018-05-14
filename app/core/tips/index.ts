import { action, computed, observable } from 'mobx';

import DriverVersionTip from './driverVersion.tip';
import AesOkTip from './aesOk.tip';
import LargePagesTip from './largePages.tip';
import VcredistTip from './vcredist.tip';

export interface ITip {
  id: string;
  name: any;
  workaround: any;
  level: number;
  defined: boolean;
  isOk: boolean;
  couldBeFixed: boolean;
  buttonDisabled: boolean;
  fixError?: string;

  checkOut(): Promise<void>;
  fixIt?(): Promise<boolean>;
}

export class Tips {
  @observable tips: ITip[];

  constructor() {
    this.tips = [
      new LargePagesTip(),
      new VcredistTip(),
      new DriverVersionTip(),
      new AesOkTip(),
    ];
  }

  @action
  async findTips(): Promise<any> {
    return Promise.all(
      this.tips.map(tip =>
        tip
          .checkOut()
          .catch(e => console.error('Failed to check ', tip.name, ' due to', e))
      )
    );
  }

  @computed
  get tipsCount(): number {
    return this.tips.filter(d => !d.isOk && d.couldBeFixed).length;
  }
}

const tips = new Tips();

export default tips;
