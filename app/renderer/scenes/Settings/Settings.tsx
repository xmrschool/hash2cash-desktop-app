import { ipcRenderer, remote } from 'electron';
import { FormattedMessage } from 'react-intl';
import * as React from 'react';
import { observer } from 'mobx-react';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';
import userOptions from 'mobx-store/UserOptions';
import globalState from 'mobx-store/GlobalState';

import { isEnabled, enable, disable } from 'utils/startup';

import MinerObserver from '../../mobx-store/MinerObserver';
import minerApi from '../../api/MinerApi';
import Close from '../../components/Close/Close';
import Switch from '../../components/Switch/Switch';
import { checkIfTranslateOutdated } from '../../intl';

const s = require('./Settings.css');
const librariesPath = require('../../../config.js').MINERS_PATH;

export const ANIMATION_TIME = 200;

export type State = {
  animating: boolean;
  openingAtStartup: boolean;
  openclDisabled: boolean;
};

@observer
export default class Settings extends React.Component<
  RouteComponentProps<any>,
  State
> {
  state = {
    animating: false,
    openingAtStartup: false,
    openclDisabled: localStorage.skipOpenCl
  };

  constructor(props: any) {
    super(props);

    this.goBack = this.goBack.bind(this);
    this.updateParameter = this.updateParameter.bind(this);
    this.updateStartupSettings = this.updateStartupSettings.bind(this);
    this.benchmark = this.benchmark.bind(this);
    this.removeThings = this.removeThings.bind(this);
    this.toggleOpenCl = this.toggleOpenCl.bind(this);
  }

  goBack() {
    globalState.hideLayer();
  }

  async componentDidMount() {
    this.setState({
      openingAtStartup: await isEnabled(),
    });

    document.body.classList.toggle('whiter');
  }

  componentWillUnmount() {
    document.body.classList.toggle('whiter');
  }

  updateParameter(name: string) {
    return (event: any) => {
      userOptions.set(name, event.target.value);

      // Update locale globally
      if (name === 'locale') {
        localStorage.removeItem('currentLocale');
        checkIfTranslateOutdated();
      }
    };
  }

  toggleOpenCl() {
    if (localStorage.skipOpenCl) {
      localStorage.removeItem('skipOpenCl');
      this.setState({ openclDisabled: false });
    } else {
      localStorage.skipOpenCl = 'true';
      this.setState({ openclDisabled: true });
    }
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

  updateStartupSettings(shoulda: any) {
    if (shoulda) {
      this.setState({
        openingAtStartup: true,
      });

      enable();
      // Actually issue with electron https://github.com/electron/electron/issues/10880
    } else {
      this.setState({
        openingAtStartup: false,
      });

      disable();

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
    const shouldOpen = this.state.openingAtStartup;

    return shouldOpen ? 'yes' : 'no';
  }

  render() {
    const d = (id: string) => <FormattedMessage id={id} />;
    const p = (id: string) => (
      <FormattedMessage id={id}>
        {(message: any) => <option value={id}>{message}</option>}
      </FormattedMessage>
    );
    return (
      <div className={s.root}>
        <div className={s.container}>
          <div className={s.menu}>
            <h2>{d('SETTINGS_HEADER')}</h2>
            <Close
              onClick={this.goBack}
              onMouseOver={() => (globalState.layerAnimating = true)}
              onMouseOut={() => (globalState.layerAnimating = false)}
            />
          </div>
          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('SETTINGS_LANGUAGE')}</h4>
              <p>{d('SETTINGS_LANGUAGE_DESC')}</p>
            </div>
            <div className={s.answer}>
              <select
                onChange={this.updateParameter('locale')}
                value={userOptions.store.locale}
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="uk">Український</option>
              </select>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('SETTINGS_CURRENCY')}</h4>
              <p>{d('SETTINGS_CURRENCY_DESC')}</p>
            </div>
            <div className={s.answer}>
              <select
                onChange={this.updateParameter('currency')}
                value={userOptions.store.currency}
              >
                {p('USD')}
                {p('RUB')}
              </select>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('SETTINGS_STARTUP')}</h4>
              <p>{d('SETTINGS_STARTUP_DESC')}</p>
            </div>
            <div className={s.answer}>
              <Switch
                checked={this.state.openingAtStartup}
                onChange={this.updateStartupSettings}
              />
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('DISABLE_OPENCL')}</h4>
              <p>{d('DISABLE_OPENCL_DESC')}</p>
            </div>
            <div className={s.answer}>
              <Switch
                checked={this.state.openclDisabled}
                onChange={this.toggleOpenCl}
              />
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('SETTINGS_BENCHMARK')}</h4>
              <p>{d('SETTINGS_BENCHMARK_DESC')}</p>
            </div>
            <div className={s.answer}>
              <Button simple onClick={this.benchmark}>
                {d('SETTINGS_BENCHMARK_BTN')}
              </Button>
            </div>
          </div>

          <div className={s.pick}>
            <div className={s.question}>
              <h4 className={s.questionText}>{d('SETTINGS_FORGET')}</h4>
              <p>{d('SETTINGS_FORGET_DESC')}</p>
            </div>
            <div className={s.answer}>
              <Button simple onClick={this.removeThings}>
                {d('SETTINGS_FORGET_BTN')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
