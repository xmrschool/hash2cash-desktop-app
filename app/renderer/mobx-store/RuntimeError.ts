import { action, observable } from 'mobx';

export type FSError = {
  code: string;
  errno: string;
  syscall: string;
};

export type ErrorFormat = {
  message: string;
  raw: FSError | any;
  stack: string;
};

export function isFsError(e: FSError | any): e is FSError {
  return !!(e && e.code);
}

// Error on the miner side, e.g. when blocked by antivirus or some miner / connection issues
export class RuntimeError {
  constructor() {
    this.expandStack = this.expandStack.bind(this);
  }

  @observable error: ErrorFormat | null = null;
  @observable stackExpanded: boolean = false;

  @action
  closeError() {
    this.error = null;
  }
  @action
  handleError(e: ErrorFormat) {
    this.error = e;
    this.stackExpanded = false;
  }

  @action
  expandStack() {
    this.stackExpanded = true;
  }
}

export default new RuntimeError();