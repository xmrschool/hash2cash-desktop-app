import { action, observable } from 'mobx';
import { LocalStorage } from '../utils/LocalStorage';

export type SettingsStore = { [key: string]: string };

export class UserOptions {
  @observable store: SettingsStore = this.getDefaults();

  public constructor() {
    this.getFromLocalStorage();
  }

  getDefaults() {
    return {
      currency: navigator.language === 'ru' ? 'RUB' : 'USD',
      locale: navigator.language === 'ru' ? 'ru_RU' : 'en_US',
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

