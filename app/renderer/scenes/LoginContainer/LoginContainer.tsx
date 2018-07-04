import * as React from 'react';
import { injectIntl, InjectedIntl } from 'react-intl';
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
import Api from '../../api/Api';
import socket from '../../socket';
import { AUTH_TOKEN } from '../../../core/storage/actions';
import User from '../../mobx-store/User';

const s = require('./Login.css');

export type State = {
  appeared: boolean;
};

@(injectIntl as any)
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
    if (!localStorage.firstInstalledVersion) {
      localStorage.firstInstalledVersion = require('electron').remote.app.getVersion();
    }
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
    const intl = (this.props as any).intl as InjectedIntl;
    const hasAccount = loginState.emailInfo.hasAccount;

    return (
      <div className={s.secondView}>
        <Input
          value={loginState.password}
          onChange={event => loginState.setPassword(event.target.value)}
          type="password"
          label={intl.formatMessage({ id: 'LOGIN_PASSWORD' })}
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

  async throughSite() {
    const promise = Api.auth.loginThroughWebsite(undefined);
    socket.once('auth.redirectUri', (url: string) => {
      require('electron').shell.openExternal(url);
    });

    const result = await promise;

    if (result.error) {
      loginState.dispatchError(result.error);
    } else {
      localStorage[AUTH_TOKEN] = result.token;
      User.setToken(result.token!);
      userState.jwtToken = result.token;
      await userState.attemptToLogin();
      await this.disappear();
      this.props.history.push('/dashboard');
    }
  }

  render() {
    const { allowedToContinue, hasAccount } = loginState.emailInfo;
    const intl = (this.props as any).intl as InjectedIntl;

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
              label={intl.formatMessage({ id: 'LOGIN_EMAIL' })}
              autoFocus
              placeholder="your@mail.com"
              error={loginState.error}
            />
            {allowedToContinue && this.renderSecondView()}
            <div className={s.loginContainer}>
              <Button disabled={loginState.submitting} type="submit">
                {allowedToContinue ? (
                  hasAccount ? (
                    <FormattedMessage id="LOGIN_LOGIN" />
                  ) : (
                    <FormattedMessage id="LOGIN_REGISTER" />
                  )
                ) : (
                  <FormattedMessage id="LOGIN_NEXT" />
                )}
              </Button>
            </div>
            <div style={{ marginTop: 20 }}>
              <Button
                disabled={loginState.submitting}
                onClick={() => this.throughSite()}
                type="submit"
              >
                <FormattedMessage id="LOGIN_THROUGH_SITE" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }
}
