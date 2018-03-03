import { observable, action } from 'mobx';
import { AUTH_TOKEN } from '../../shared/storage/actions';
import Api, { Profile, Account, IUser } from '../api/Api';
import socket from '../socket';

const debug = require('debug')('app:mobx:user');

export class User {
  @observable jwtToken?: string;
  @observable id?: string;
  @observable email?: string;
  @observable balance?: number;
  @observable createdAt?: Date;
  @observable authenticated?: boolean = false;

  @observable accounts?: Account[] = [];
  @observable profile?: Profile = {};

  @observable attachError?: false | string = false;

  constructor() {
    if (localStorage[AUTH_TOKEN]) {
      debug('We have jwt token in localStorage, so we setting it');
      this.setToken(localStorage[AUTH_TOKEN]);
    }

    this.submitJwt = this.submitJwt.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
  }

  @action
  setToken(jwtToken: string) {
    this.jwtToken = jwtToken;
  }

  watchOutForSubmitting() {
    socket.on('balanceUpdated', this.updateBalance);
  }

  stopWatching() {
    socket.removeListener('balanceUpdated', this.updateBalance);
  }

  @action
  updateBalance({ balance }: { balance: number }) {
    this.balance = balance;
  }

  @action
  setUser(user: IUser) {
    debug('Setting user: ', user);

    localStorage.userId = user.id;
    Object.assign(this, user);
  }

  clearAll() {
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem('userId');
    socket.removeListener('connect', this.submitJwt);

    userState = new User();
  }

  // Let's imagine situation when user lose connect, then server don't know about this user
  @action
  async submitJwtEachConnect() {
    socket.on('connect', this.submitJwt);
  }

  submitJwt() {
    if (!this.jwtToken) return;
    Api.auth.attach(this.jwtToken);
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
      this.submitJwtEachConnect();
      this.setUser(resp.user);
      this.authenticated = true;
      return resp.user;
    }

    return false;
  }
}

let userState = new User();

export default userState;
