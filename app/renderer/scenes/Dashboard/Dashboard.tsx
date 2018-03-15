import * as React from 'react';
import * as cx from 'classnames';
import { ANIMATION_TIME } from 'scenes/Home/Home';
import { sleep } from 'utils/sleep';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';
import globalState from 'mobx-store/GlobalState';
import InnerDashboard from 'components/InnerDashboard';

const s = require('./Dashboard.css');
export default class Dashboard extends React.Component<
  RouteComponentProps<any>,
  { appeared: boolean }
> {
  state = {
    appeared: false,
  };

  componentDidMount() {
    setTimeout(() => this.setState({ appeared: true }), 10);
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
    return (
      <>
        <h2>To start, we need to clarify some things</h2>
        <p className={s.hey}>
          Some antiviruses are taking our app as virus. And the reason for this
          is apps which mine cryptocurrency without a user's contest. Hash to
          cash – is not a virus. Antivirus can't detect if a user gives
          permission, so it just bans every miner.
        </p>
        <p>
          If your antivirus made a mistake, add the Hash to Cash app folder to
          antivirus exception list.
        </p>
        <p className={s.time}>
          We need about 7 minutes to download miner binaries and do benchmark
          test. Please, be patient
        </p>
        <div className={s.button}>
          <Button onClick={() => this.navigate()}>Ok, start</Button>
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
