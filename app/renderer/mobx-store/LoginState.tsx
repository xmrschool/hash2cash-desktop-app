import { observable, action } from 'mobx';
import Api, { EmailInfoResponse } from '../api/Api';
import { AUTH_TOKEN } from '../../core/storage/actions';
import User from './User';
import { defineMessages } from "react-intl";
import { intl } from "../intl";
export type StringOrNull = string | null;

const messages = defineMessages({
  passwordMisLength: {
    id: 'mobx.login.password.mislength',
    defaultMessage: 'length of password must be at least 5',
  },
  emailInvalid: {
    id: 'mobx.login.email.invalid',
    defaultMessage: 'email must contain @',
  },
  unexpectedError: {
    id: 'mobx.login.unexpected',
    defaultMessage: 'Unexpected error. Try again or contact us'
  },
  vcRedistDownloading: {
    id: 'mobx.init.status.vcredist.downloading',
    defaultMessage: 'Downloading VCRedist... {status}',
  },
  vcRedistFailed: {
    id: 'mobx.init.status.vcredist.failed',
    defaultMessage: 'Failed to install VCRedist 2017. You can do it yourself, because it\'s required by GPU miner.',
  }
});


export class LoginState {
  @observable email: string = '';
  @observable error: StringOrNull = null;

  @observable submitting: boolean = false;
  @observable emailInfo: EmailInfoResponse = { allowedToContinue: false };

  @observable password: string = '';
  @observable passwordError: StringOrNull = null;

  // Email actions
  @action
  setEmail(email: string) {
    this.email = email;
    this.emailInfo = { allowedToContinue: false };
    if (this.error) {
      this.dispatchError(null);
      this.dispatchPasswordError(null);
    }
  }

  @action
  dispatchError(error: StringOrNull): false {
    this.error = error;
    this.submitting = false;

    return false;
  }

  // Password actions
  @action
  setPassword(password: string) {
    this.password = password;
    if (this.passwordError) this.dispatchPasswordError(null);
  }

  @action
  dispatchPasswordError(error: StringOrNull): false {
    this.passwordError = error;
    this.submitting = false;

    return false;
  }

  @action
  async attempt(): Promise<boolean> {
    try {
      this.submitting = true;
      if (this.password.length < 5)
        return this.dispatchPasswordError(intl.formatMessage(messages.passwordMisLength));

      const response = await Api.auth.attempt({
        email: this.email,
        password: this.password,
      });

      console.log('resp is: ', response);
      if (!response.success) {
        if (response.error) return this.dispatchPasswordError(intl.formatMessage({ id: response.error }));
        return this.dispatchPasswordError(intl.formatMessage(messages.unexpectedError));
      }

      localStorage[AUTH_TOKEN] = response.token;
      User.setToken(response.token!);

      await User.attemptToLogin();

      this.submitting = false;
      return true;
    } catch (e) {
      this.submitting = false;
      this.dispatchPasswordError(intl.formatMessage({ id: e.message }));

      return false;
    }
  }

  @action
  async submit(event?: any): Promise<boolean> {
    try {
      if (event) event.preventDefault();

      if (this.emailInfo.allowedToContinue) return this.attempt(); // We already submitted email
      this.submitting = true;
      if (!this.email.includes('@'))
        return this.dispatchError(intl.formatMessage(messages.emailInvalid));

      const response = await Api.auth.emailInfo(this.email);

      if (!response.allowedToContinue) {
        return response.reason ? this.dispatchError(intl.formatMessage({ id: response.reason })) : false;
      }

      this.emailInfo = response;
      this.submitting = false;
      return false;
    } catch (e) {
      this.submitting = false;
      this.dispatchError(intl.formatMessage({ id: e.message }));
      return false;
    }
  }
}

export default new LoginState();
