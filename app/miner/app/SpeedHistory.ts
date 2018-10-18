import * as moment from 'moment';
import { meanBy } from 'lodash';

export class SpeedHistory {
  begins: moment.Moment;
  speedHistory: [moment.Moment, number][] = [];

  constructor() {
    this.begins = moment();
  }

  clean() {
    this.speedHistory = [];
  }

  addSpeed(speed: number) {
    this.speedHistory.push([moment(), speed]);
    if (this.speedHistory.length > 200) this.cleanup();
  }

  cleanup() {
    const minDate = moment().subtract(1, 'h');
    this.speedHistory = this.speedHistory.filter(d => d[0].isAfter(minDate));
  }

  speed(): (number | null)[] {
    return [this.currentSpeed, this.minuteSpeed, this.hourlySpeed];
  }

  get currentSpeed(): number {
    return this.speedHistory[this.speedHistory.length - 1][1];
  }

  get minuteSpeed(): number | null {
    if (moment().diff(this.begins, 's') < 60) return null;

    const minDate = moment().subtract(1, 'm');
    const units = this.speedHistory.filter(d => d[0].isSameOrAfter(minDate));

    return meanBy(units, d => d[1]);
  }

  get hourlySpeed(): number | null {
    if (moment().diff(this.begins, 'm') < 60) return null;

    const minDate = moment().subtract(1, 'h');
    const units = this.speedHistory.filter(d => d[0].isSameOrAfter(minDate));

    return meanBy(units, d => d[1]);
  }
}
