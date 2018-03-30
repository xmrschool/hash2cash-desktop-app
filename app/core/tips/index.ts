import { observable } from 'mobx';

import DriverVersionTip from './driverVersion.tip';
import AesOkTip from './aesOk.tip';
import LargePagesTip from './largePages.tip';

export interface ITip {
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
    this.tips = [new LargePagesTip(), new DriverVersionTip(), new AesOkTip()];
  }

  findTips(): void {
    this.tips.forEach(tip =>
      tip
        .checkOut()
        .catch(e => console.error('Failed to check ', tip.name, ' due to', e))
    );
  }

  getTipCount(): number {
    return this.tips.filter(d => !d.isOk && d.couldBeFixed).length;
  }
}

const tips = new Tips();

export default tips;
