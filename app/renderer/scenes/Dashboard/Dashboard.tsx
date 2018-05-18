import * as React from 'react';
import { remote } from 'electron';
import { FormattedMessage } from 'react-intl';
import * as cx from 'classnames';
import { ANIMATION_TIME } from 'scenes/Home/Home';
import { sleep } from 'utils/sleep';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';
import globalState from 'mobx-store/GlobalState';
import InnerDashboard from 'components/InnerDashboard';
import minerApi from 'api/MinerApi';
import { shouldSwitchToX64 } from '../../../core/windows/detectArch';

const downloadLink = `https://hashto.cash/windows?type=x64`;

const s = require('./Dashboard.css');
export default class Dashboard extends React.Component<
  RouteComponentProps<any>,
  { appeared: boolean; skippedWrongArchWarning: boolean }
> {
  state = {
    appeared: false,
    skippedWrongArchWarning: false,
  };

  componentDidMount() {
    setTimeout(() => this.setState({ appeared: true }), 10);
    if (!globalState.benchmark) {
      minerApi.stopAll();
    }
  }

  componentWillUnmount() {
    this.disappear();
  }

  async disappear() {
    this.setState({ appeared: false });
    await sleep(ANIMATION_TIME);
  }

  async navigate() {
    await this.disappear();

    return this.props.history.push('/init');
  }

  renderInitialScene() {
    const d = (str: string) => <FormattedMessage id={str} />;

    if (!this.state.skippedWrongArchWarning && shouldSwitchToX64()) {
      return (
        <div>
          <h2>{d('dashboard.switchArch')}</h2>
          <p>{d('dashboard.switchArchDesc')}</p>
          <div className={s.button}>
            <Button
              onClick={() => remote.shell.openExternal(downloadLink)}
            >
              {d('dashboard.downloadForRightArch')}
            </Button>
            <Button
              onClick={() => this.setState({ skippedWrongArchWarning: true })}
            >
              {d('dashboard.skipArchWarning')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <h2>{d('BENCHMARK_HEADER')}</h2>
        <p className={s.hey}>{d('BENCHMARK_FIRST')}</p>
        <p>{d('BENCHMARK_SECOND')}</p>
        <p className={s.time}>{d('BENCHMARK_THIRD')}</p>
        <div className={s.button}>
          <Button onClick={() => this.navigate()}>{d('BENCHMARK_GO')}</Button>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className={cx(s.root, this.state.appeared && s.appeared)}>
        {globalState.benchmark ? (
          <InnerDashboard {...this.props} />
        ) : (
          this.renderInitialScene()
        )}
      </div>
    );
  }
}
