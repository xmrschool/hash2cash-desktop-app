import * as React from 'react';
import * as cx from 'classnames';
import { observer } from 'mobx-react';
import { InternalObserver } from 'mobx-store/MinerObserver';
import currenciesService, {
  AllowedCurrencies,
  currencies,
} from 'mobx-store/CurrenciesService';

const s = require('./Worker.css');

export type PropTypes = { worker: InternalObserver };

@observer
export default class Worker extends React.Component<PropTypes> {
  shouldComponentUpdate(nextProps: PropTypes) {
    // Variables with "_" are vars from `this.props`
    const { worker: _worker } = this.props;
    const _miner = _worker._data;

    const { worker } = nextProps;
    const miner = worker._data;
    // We only update when miner state has changed or speed
    return (
      miner.running !== _miner.running ||
      worker.latestSpeed !== _worker.latestSpeed ||
      worker.speedPerMinute !== _worker.speedPerMinute
    );
  }

  getCurrencyName(symbol: AllowedCurrencies | string | undefined): string {
    if (typeof symbol === 'undefined') {
      return 'Undefined symbol';
    }

    console.log('Service is: ', currenciesService);
    if (currencies.includes(symbol)) {
      return currenciesService.ticker[symbol].name;
    }

    return symbol;
  }

  render() {
    const { worker } = this.props;
    const miner = worker._data.data;
    const isOn = worker._data.running;

    return (
      <div key={worker.name} className={cx(s.worker, isOn && s.highlighted)}>
        <span className={s.name}>
          {this.getCurrencyName(miner.usesAccount)}
          <p className={s.badge}>
            {miner.usesHardware![0].toUpperCase()} – {worker.latestSpeed} H/s
          </p>
        </span>
        <span className={s.profits}>
          <span className={s.monthly}>
            {worker.monthlyProfit().formatted()}{' '}
            <span className={s.caption}>per month</span>
          </span>
          <span className={s.daily}>
            {worker.dailyProfit().formatted()}{' '}
            <span className={s.caption}>per day</span>
          </span>
        </span>
      </div>
    );
  }
}
