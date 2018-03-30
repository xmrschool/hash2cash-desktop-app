import { observable, action } from 'mobx';
import Api, { EmailInfoResponse } from '../api/Api';
import { AUTH_TOKEN } from '../../core/storage/actions';
import User from './User';
export type StringOrNull = string | null;

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
        return this.dispatchPasswordError(
          'length of password must be at most 5',
        );

      const response = await Api.auth.attempt({
        email: this.email,
        password: this.password,
      });

      if (!response.success) {
        if (response.error) return this.dispatchPasswordError(response.error);
        return this.dispatchPasswordError('unexpected_error');
      }

      localStorage[AUTH_TOKEN] = response.token;
      User.setToken(response.token!);

      await User.attemptToLogin();

      this.submitting = false;
      return true;
    } catch (e) {
      this.submitting = false;
      this.dispatchPasswordError(e.message);

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
        return this.dispatchError('email must contain @');

      const response = await Api.auth.emailInfo(this.email);

      if (!response.allowedToContinue) {
        return response.reason ? this.dispatchError(response.reason) : false;
      }

      this.emailInfo = response;
      this.submitting = false;
      return false;
    } catch (e) {
      this.submitting = false;
      this.dispatchError(e.message);
      return false;
    }
  }
}

export default new LoginState();
