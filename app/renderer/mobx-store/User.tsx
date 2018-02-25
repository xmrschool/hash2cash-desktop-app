import { observable, action } from 'mobx';
import { AUTH_TOKEN } from '../../shared/storage/actions';
import Api, { Profile, Account, IUser } from '../api/Api';

const debug = require('debug')('app:mobx:user');

export class User {
  constructor() {
    if (localStorage[AUTH_TOKEN]) {
      debug('We have jwt token in localStorage, so we setting it');
      this.setToken(localStorage[AUTH_TOKEN]);
    }
  }

  @observable jwtToken?: string;
  @observable id?: string;
  @observable email?: string;
  @observable createdAt?: Date;
  @observable authenticated?: boolean = false;

  @observable accounts?: Account[] = [];
  @observable profile?: Profile = {};

  @observable attachError?: false | string = false;
  @action
  setToken(jwtToken: string) {
    this.jwtToken = jwtToken;
  }

  @action
  setUser(user: IUser) {
    debug('Setting user: ', user);

    localStorage.userId = user.id;
    Object.assign(this, user);
  }

  @action
  async attemptToLogin() {
    if (!this.jwtToken) return false;
    const resp = await Api.auth.attach(this.jwtToken);

    debug('Authentication result:', resp);
    if (!resp.success && resp.error) {
      this.attachError = resp.error;
      return false;
    }

    if (resp.user) {
      this.setUser(resp.user);
      this.authenticated = true;
      return resp.user;
    }

    return false;
  }
}

export default new User();
