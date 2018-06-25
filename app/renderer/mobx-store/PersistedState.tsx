import { observe } from 'mobx';

export abstract class PersistedState {
  persistedFields: string[];
  persistedName: string;

  constructor(fields: string[], name: string) {
    this.persistedFields = fields;
    this.persistedName = name;

    observe(this, () => {
      this.push();
    });

    this.pull();
  }

  get persistedKey() {
    return 'persisted:' + this.persistedName;
  }

  push() {
    const saved: any = {};

    this.persistedFields.forEach(d => {
      saved[d] = (this as any)[d];
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.persistedKey, JSON.stringify(saved));
    }
  }

  pull() {
    try {
      const value = localStorage.getItem(this.persistedKey);

      if (value) {
        const parsed: any = JSON.stringify(value);

        this.persistedFields.forEach(key => {
          if (parsed[key]) {
            (this as any)[key] = parsed[key];
          }
        });

        return true;
      }

      return false
    } catch (e) {
      console.warn(`Failed to pull ${this.persistedKey} state`);
      return false;
    }
  }
}
