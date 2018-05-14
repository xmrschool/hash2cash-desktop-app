import { defineMessages } from 'react-intl';
import startReload from '../../core/reload/reloader';
import { action, observable } from 'mobx';
import { intl } from '../intl';

const messages = defineMessages({
  update: {
    id: 'mobx.reload.update',
    description: 'A main button to update',
    defaultMessage: 'Update',
  },
});

export class ReloadState {
  @observable running = false;
  @observable currentStatus: string = 'Reload';
  @observable oldStatus?: string;
  @observable switching = false;
  timeout?: number;

  constructor() {
    this.run = this.run.bind(this);
    this.setNewStatus = this.setNewStatus.bind(this);
    this.setNewStatusWithoutAnimation = this.setNewStatusWithoutAnimation.bind(
      this
    );
  }

  @action
  async run(context: any) {
    if (this.running) return;

    clearTimeout(this.timeout);
    this.running = true;
    const block = await startReload({
      setStatus: this.setNewStatus,
      setStatusWithoutAnimation: this.setNewStatusWithoutAnimation,
      state: {},
      ...context,
    });
    if (block) {
      this.setNewStatus(intl.formatMessage(messages.update));
      this.running = false;
      this.setUpTimeout(context);
    }
  }

  @action
  setUpTimeout(context: any) {
    this.timeout = setTimeout(() => this.run(context), 1000 * 60 * 3) as any;
  }

  @action
  setNewStatus(newStatus: string) {
    // In that moment
    this.oldStatus = this.currentStatus;
    this.currentStatus = newStatus;
    this.switching = true;
    setTimeout(() => {
      this.switching = false;
    }, 150);
  }

  @action
  setNewStatusWithoutAnimation(newStatus: string) {
    this.oldStatus = newStatus;
    this.currentStatus = newStatus;
  }
}

const reloadState = new ReloadState();

export default reloadState;
