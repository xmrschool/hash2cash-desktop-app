import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { observer } from 'mobx-react';

import toMonero from 'utils/toMonero';
import User from 'mobx-store/User';

import { FallbackLoader } from '../LineLoader/LineLoader';
import PrettyNumber from '../PrettyNumber/PrettyNumber';
import currenciesService, {
  CurrencyNumber,
} from '../../mobx-store/CurrenciesService';
import RignameEditor from '../RignameEditor/RignameEditor';
import userOptions from '../../mobx-store/UserOptions';
import minerObserver from '../../mobx-store/MinerObserver';

type DefaultProps = { s: any; user: typeof User };

@observer
export class Balance extends React.Component<DefaultProps> {
  shouldComponentUpdate(nextProps: DefaultProps) {
    if (!this.props.user.balance || !nextProps.user.balance) return true;

    const fixedBefore = this.props.user.balance!.toFixed(5);
    const fixedAfter = nextProps.user.balance!.toFixed(5);

    if (fixedBefore !== fixedAfter) {
      return true;
    }

    return false;
  }

  render() {
    const { s, user } = this.props;

    const { balance } = user;
    const balanceInMonero =
      balance && balance > 0 ? toMonero(balance) : 0;
    const localBalance = currenciesService.toLocalCurrency(
      'XMR',
      balanceInMonero
    );

    return (
      <div className={s.counter}>
        <h4 className={s.counterHead}>
          <FormattedMessage id="DASHBOARD_CURRENT_BALANCE" />
        </h4>
        <h4 className={s.counterValue}>
          <FallbackLoader condition={typeof balance !== 'undefined'}>
            <PrettyNumber unit="XMR" num={balanceInMonero} fixedLevel={5} />
          </FallbackLoader>{' '}
          {typeof balance !== 'undefined' && (
            <span>
              <span className={s.equal}>≈</span> {localBalance.reactFormatted()}
            </span>
          )}
        </h4>
      </div>
    );
  }
}

export class Performance extends React.Component<{
  s: any;
}> {
  render() {
    const { s } = this.props;

    const instance = currenciesService.ticker[userOptions.get('currency')];

    const total = minerObserver.workers
      .filter(d => d._data.running)
      .map(queue => queue.monthlyProfit().float())
      .reduce((d, prev) => prev + d, 0);

    const totalHashes = minerObserver.workers
      .filter(d => d._data.running)
      .map(queue => queue.hashesSubmitted)
      .reduce((d, prev) => prev + d, 0);

    const doneAmount = new CurrencyNumber(total, instance);

    return (
      <div className={s.row}>
        <div className={s.counter}>
          <h4 className={s.counterHead}>
            <FormattedMessage id="DASHBOARD_PERFORMANCE_LABEL" />
          </h4>
          <h4 className={s.counterValue}>
            {doneAmount.reactFormatted()}
            <span className={s.period}>
              {' '}
              <FormattedMessage id="DASHBOARD_PERFORMANCE_CAPTION" />
            </span>
          </h4>
        </div>

        <div className={s.counter}>
          <h4 className={s.counterHead}>
            {' '}
            <FormattedMessage id="DASHBOARD_EARNED_LABEL" />
          </h4>
          <h4 className={s.counterValue}>
            {totalHashes.toLocaleString()}{' '}
            <span className={s.currencySymbol}>H</span>
          </h4>
        </div>
      </div>
    );
  }
}

export class StatsView extends React.Component<{ s: any }> {
  render() {
    const { s } = this.props;

    return (
      <div className={s.padded}>
        <div>
          <RignameEditor />
          <Balance s={s} user={User} />
        </div>
        <Performance s={s} />
      </div>
    );
  }
}
