import { ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';
import userOptions from 'mobx-store/UserOptions';
import globalState from 'mobx-store/GlobalState';

import { observer } from 'mobx-react';
import MinerObserver from '../../mobx-store/MinerObserver';
import minerApi from '../../api/MinerApi';
import Close from '../../components/Close/Close';

const s = require('./Settings.css');
const librariesPath = require('../../../config.js').MINERS_PATH;

export const ANIMATION_TIME = 200;

export type State = {
  animating: boolean;
};

@observer
export default class Settings extends React.Component<
  RouteComponentProps<any>,
  State
> {
  state = {
    animating: false,
  };

  constructor(props: any) {
    super(props);

    this.goBack = this.goBack.bind(this);
    this.updateParameter = this.updateParameter.bind(this);
    this.updateStartupSettings = this.updateStartupSettings.bind(this);
    this.benchmark = this.benchmark.bind(this);
    this.removeThings = this.removeThings.bind(this);
  }

  goBack() {
    globalState.hideLayer();
  }

  updateParameter(name: string) {
    return (event: any) => {
      userOptions.set(name, event.target.value);
    };
  }
  async onEntered() {}

  async removeThings() {
    const response = remote.dialog.showMessageBox({
      type: 'warning',
      buttons: ['Yes', 'No'],
      defaultId: 0,
      title: 'Are you sure you want to delete ALL data?',
      message: 'Are you sure you want to delete ALL data?',
      detail: 'You data will be lost.',
    });

    if (response === 0) {
      await minerApi.workers.map(work => work.stop());
      MinerObserver.clearAll();
      localStorage.clear();
      await require('fs-extra').remove(librariesPath);

      ipcRenderer.send('quit');
    }
  }

  async benchmark() {
    localStorage.removeItem('benchmark');
    globalState.benchmark = undefined;
    MinerObserver.clearAll();

    this.props.history.push('/init');
  }

  updateStartupSettings(event: any) {
    const shoulda = event.target.value === 'yes';

    if (shoulda) {
      remote.app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        args: ['--hidden'], // openAsHidden supported on OS X, but arguments are supported on Windows
      });
      // Actually issue with electron https://github.com/electron/electron/issues/10880
    } else {
      remote.app.setLoginItemSettings({
        openAtLogin: false,
      });

      if (__DARWIN__) {
        try {
          // There is no another approach...
          require('child_process').exec(
            `osascript -e 'tell application "System Events" to delete login item "Hash to Cash"'`
          );
        } catch (e) {}
      }
    }

    this.forceUpdate();
  }

  get runnedAtStartup() {
    const shouldOpen = remote.app.getLoginItemSettings().openAtLogin;

    return shouldOpen ? 'yes' : 'no';
  }

  render() {
    return (
      <div className={s.root}>
        <div className={s.container}>
          <div className={s.menu}>
            <h2>Settings</h2>
            <Close
              onClick={this.goBack}
              onMouseOver={() => (globalState.layerAnimating = true)}
              onMouseOut={() => (globalState.layerAnimating = false)}
            />
          </div>
          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Language</h4>
              <p>Everything will be displayed at specified language.</p>
            </div>
            <div className={s.answer}>
              <select
                onChange={this.updateParameter('locale')}
                value={userOptions.store.locale}
              >
                <option value="en_US">English</option>
                <option value="ru_RU">Русский</option>
              </select>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Currency</h4>
              <p>Hashrates will be converted to currency you specified</p>
            </div>
            <div className={s.answer}>
              <select
                onChange={this.updateParameter('currency')}
                value={userOptions.store.currency}
              >
                <option value="USD">U.S. Dollar</option>
                <option value="RUB">Ruble</option>
              </select>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Startup</h4>
              <p>Run Hash to cash and mining along with OS startup</p>
            </div>
            <div className={s.answer}>
              <select
                onChange={this.updateStartupSettings}
                value={this.runnedAtStartup}
              >
                <option value="yes">Yes, sure!</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Benchmark again</h4>
              <p>
                Use this option in case your hardware was changed or you want to
                repeat test
              </p>
            </div>
            <div className={s.answer}>
              <Button onClick={this.benchmark}>Benchmark</Button>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Remove all</h4>
              <p>
                Everything (libraries, local storage (auth data, manifest)) will
                be removed. Use if you want to fully uninstall the app.
              </p>
            </div>
            <div className={s.answer}>
              <Button onClick={this.removeThings}>Remove</Button>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>Remove all</h4>
              <p>
                Everything (libraries, local storage (auth data, manifest)) will
                be removed. Use if you want to fully uninstall the app.
              </p>
            </div>
            <div className={s.answer}>
              <Button onClick={this.removeThings}>Remove</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
