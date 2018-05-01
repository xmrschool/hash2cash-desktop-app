import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import * as cx from 'classnames';
import { observer } from 'mobx-react';
import { RouteComponentProps } from 'react-router';
import Input from 'components/Input';
import Button from 'components/Button';
import Logo from 'components/Logo';
import socketConnect, { SocketType } from 'utils/socket';
import loginState from 'mobx-store/LoginState';
import userState from 'mobx-store/User';
import { ANIMATION_TIME } from '../Home/Home';
import { sleep } from '../../utils/sleep';

const s = require('./Login.css');

export type State = {
  appeared: boolean;
};

@socketConnect
@observer
export default class LoginContainer extends React.Component<
  RouteComponentProps<any> & SocketType,
  State
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

  renderSecondView() {
    const hasAccount = loginState.emailInfo.hasAccount;

    return (
      <div className={s.secondView}>
        <Input
          value={loginState.password}
          onChange={event => loginState.setPassword(event.target.value)}
          type="password"
          label="password"
          autoFocus
          placeholder="your@mail.com"
          error={loginState.passwordError}
        />
        <p className={s.warn}>
          {hasAccount ? (
            <FormattedMessage id="LOGIN_WELCOME_BACK" />
          ) : (
            <FormattedMessage id="LOGIN_YOU_AGREED" />
          )}
        </p>
      </div>
    );
  }

  async submit(event: any) {
    event.preventDefault();

    if (await loginState.submit()) {
      await userState.attemptToLogin();
      await this.disappear();
      this.props.history.push('/dashboard');
    }
  }

  render() {
    const { allowedToContinue, hasAccount } = loginState.emailInfo;

    return (
      <form onSubmit={event => this.submit(event)}>
        <div className={cx(s.root, this.state.appeared && s.appeared)}>
          <div className={s.container}>
            <div className={s.logoContainer}>
              <Logo className={s.logo} />
            </div>
            <Input
              value={loginState.email}
              onChange={event => loginState.setEmail(event.target.value)}
              label="your email"
              autoFocus
              placeholder="your@mail.com"
              error={loginState.error}
            />
            {allowedToContinue && this.renderSecondView()}
            <div className={s.loginContainer}>
              <Button disabled={loginState.submitting} type="submit">
                {allowedToContinue
                  ? hasAccount ? <FormattedMessage id="LOGIN_LOGIN" /> : <FormattedMessage id="LOGIN_REGISTER" />
                  : <FormattedMessage id="LOGIN_NEXT" />}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }
}
