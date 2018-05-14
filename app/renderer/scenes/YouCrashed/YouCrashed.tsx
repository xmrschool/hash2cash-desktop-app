import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import * as cx from 'classnames';
import { ANIMATION_TIME } from 'scenes/Home/Home';
import { sleep } from 'utils/sleep';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';

const s = require('./YouCrashed.css');
export default class YouCrashed extends React.Component<
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

  async navigate(apply: boolean) {
    if (apply) {
      localStorage.skipOpenCl = 'true';
    }
    await this.disappear();

    return this.props.history.push('/');
  }

  renderInitialScene() {
    const d = (str: string) => <FormattedMessage id={str} />;
    return (
      <>
        <h2>{d('DRIVERS_ISSUE_HEADER')}</h2>
        <p className={s.hey}>{d('DRIVER_ISSUE_ABOUT')}</p>
        <div className={s.button}>
          <Button onClick={() => this.navigate(true)}>
            {d('DRIVER_ISSUE_APPLY_CHANGES')}
          </Button>
          <div style={{ marginTop: 20 }} />
          <Button onClick={() => this.navigate(false)}>
            {d('DRIVER_ISSUE_DONT_APPLY')}
          </Button>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className={cx(s.root, this.state.appeared && s.appeared)}>
        {this.renderInitialScene()}
      </div>
    );
  }
}
