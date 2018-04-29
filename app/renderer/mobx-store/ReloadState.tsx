import startReload from '../../core/reload/reloader';
import { action, observable } from 'mobx';

export class ReloadState {
  @observable running = false;
  @observable currentStatus: string = 'Refresh';
  @observable oldStatus?: string;
  @observable switching = false;

  constructor() {
    this.run = this.run.bind(this);
    this.setNewStatus = this.setNewStatus.bind(this);
    this.setNewStatusWithoutAnimation = this.setNewStatusWithoutAnimation.bind(this);
  }

  @action
  async run() {
    if (this.running) return;

    this.running = true;
    const block = await startReload({
      setStatus: this.setNewStatus,
      setStatusWithoutAnimation: this.setNewStatusWithoutAnimation,
      state: {},
    });
    if (block) {
      this.setNewStatus('Update');
      this.running = false;
    }

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
