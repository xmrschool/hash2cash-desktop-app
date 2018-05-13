import { action, observable } from 'mobx';
import { LocalStorage } from '../utils/LocalStorage';

export type SettingsStore = { [key: string]: string };

export class UserOptions {
  @observable store: SettingsStore = this.getDefaults();

  public constructor() {
    this.getFromLocalStorage();
  }

  getLocale() {
    const allowed = ['en', 'ru', 'uk'];

    const outerLocale = navigator.language.slice(0, 2);

    return allowed.includes(outerLocale) ? outerLocale : 'en';
  }

  getDefaults() {
    return {
      currency: navigator.language === 'ru' ? 'RUB' : 'USD',
      locale: this.getLocale(),
    };
  }

  get(key: string) {
    return this.store[key];
  }

  @action
  set(key: string, value: string) {
    this.store[key] = value;
    this.commit();

    return this;
  }

  commit() {
    LocalStorage.settings = this.store;
  }

  @action
  getFromLocalStorage() {
    const defaults = this.getDefaults();
    const savedSettings = LocalStorage.settings || defaults;

    const outerSettings = Object.assign({}, defaults, savedSettings);

    Object.keys(outerSettings).forEach(d => {
      this.store[d] = outerSettings[d];
    });
  }
}

const userOptions = new UserOptions();

export default userOptions;
