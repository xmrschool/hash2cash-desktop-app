import parseJSON from '../utils/safeParse';
import { action, observable } from 'mobx';

export class UserOptions {
  @observable store: { [key: string]: string } = this.getDefaults();

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
    localStorage.settings = JSON.stringify(this.store);
  }

  @action
  getFromLocalStorage() {
    const defaults = this.getDefaults();
    const savedSettings = parseJSON(localStorage.settings, defaults);

    const outerSettings = Object.assign({}, defaults, savedSettings);

    Object.keys(outerSettings).forEach(d => {
      this.store[d] = outerSettings[d];
    });
  }
}

const userOptions = new UserOptions();

export default userOptions;

