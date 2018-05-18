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
  @observable error: ErrorFormat | null = null;
  @observable stackExpanded: boolean = false;

  constructor() {
    this.expandStack = this.expandStack.bind(this);
    this.closeError = this.closeError.bind(this);
  }

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
    this.stackExpanded = !this.stackExpanded;
  }
}

export default new RuntimeError();
