import { action, observable } from "mobx";

export class ReloadState {
  @observable running = false;
  @observable currentStatus: string = 'Refresh';
  @observable oldStatus?: string;
  @observable switching = false;

  constructor() {
    this.run = this.run.bind(this);
  }

  @action
  async run() {
    this.running = true;
    this.setNewStatus('Hi in there');
  }

  @action
  setNewStatus(newStatus: string) {
    // In that moment
    this.oldStatus = this.currentStatus;
    this.currentStatus = newStatus;
    this.switching = true;
    setTimeout(() => {
      this.switching = false;
    }, 150)
  }
}

const reloadState = new ReloadState();

export default reloadState;
