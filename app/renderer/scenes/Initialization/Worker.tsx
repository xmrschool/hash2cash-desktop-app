import * as React from 'react';
import * as cx from 'classnames';
import { FormattedMessage } from 'react-intl';
import { observer } from 'mobx-react';
import { InternalObserver } from 'mobx-store/MinerObserver';
import { defineMessages } from 'react-intl';

import currenciesService, {
  AllowedCurrencies,
  currencies,
} from 'mobx-store/CurrenciesService';
import { FallbackLoader } from '../../components/LineLoader/LineLoader';
// @ts-ignore
import formatHashrate from '../../utils/formatHashrate';

const s = require('./Worker.css');

export type PropTypes = { worker: InternalObserver };

const messages = defineMessages({
  daily: {
    id: 'scenes.init.worker.dailyProfit',
    defaultMessage: 'per day',
  },
  monthly: {
    id: 'scenes.init.worker.monthlyProfit',
    defaultMessage: 'per month',
  },
});
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

    if (currencies.includes(symbol)) {
      return currenciesService.ticker[symbol].name;
    }

    return symbol;
  }

  getSpeed(monthly = true) {
    const { worker } = this.props;

    return (
      <FallbackLoader condition={worker.getSpeed() > 0}>
        {monthly
          ? worker.monthlyProfit().reactFormatted({ marginLeft: 1 })
          : worker.dailyProfit().reactFormatted({ marginLeft: 1 })}
      </FallbackLoader>
    );
  }

  getHashrate() {
    const { worker } = this.props;
    const isOn = worker._data.running;

    if (!isOn && worker.getSpeed() < 0.1) return null;

    const speed = worker.getSpeed();
    return (
      <div>
        &nbsp; —&nbsp;{' '}
        <FallbackLoader condition={speed > 0}>{formatHashrate(speed)}</FallbackLoader>
      </div>
    );
  }

  render() {
    const { worker } = this.props;
    const miner = worker._data.data;
    const isOn = worker._data.running;

    const hashrate = this.getHashrate();
    return (
      <div key={worker.name} className={cx(s.worker, isOn && s.highlighted)}>
        <div className={s.inner}>
          <span className={s.name}>
            {this.getCurrencyName(miner.usesAccount)} — {miner.displayName}
            <div className={s.badge}>
              {miner.usesHardware![0].toUpperCase()}
              {hashrate}
            </div>
          </span>
          <span className={s.profits}>
            <span className={s.monthly}>
              {this.getSpeed()}{' '}
              <span className={s.caption}>
                <FormattedMessage {...messages.monthly} />
              </span>
            </span>
            <span className={s.daily}>
              {this.getSpeed(false)}{' '}
              <span className={s.caption}>
                <FormattedMessage {...messages.daily} />
              </span>
            </span>
          </span>
        </div>
      </div>
    );
  }
}
