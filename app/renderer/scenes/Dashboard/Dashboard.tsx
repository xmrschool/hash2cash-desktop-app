import * as React from 'react';
import { observer } from 'mobx-react';
import { remote } from 'electron';
import { FormattedMessage, defineMessages } from 'react-intl';
import * as cx from 'classnames';
import { ANIMATION_TIME } from 'scenes/Home/Home';
import { sleep } from 'utils/sleep';
import { RouteComponentProps } from 'react-router';
import Button from 'components/Button';
import globalState from 'mobx-store/GlobalState';
import InnerDashboard from 'components/InnerDashboard';
import minerApi from 'api/MinerApi';
import { shouldSwitchToX64 } from '../../../core/windows/detectArch';
import Spinner from '../../components/Spinner/Spinner';
import antivirusState from '../../mobx-store/AntivirusState';
import PathToLibraries from '../../components/PathToLibraries';
import Help from '../../components/Help/Help';

const downloadLink = `https://hashto.cash/windows?type=x64`;

const messages = defineMessages({
  checkingAv: {
    id: 'dashboard.av.checking',
    defaultMessage: 'Checking your antivirus',
  },
  installed: {
    id: 'dashboard.av.installed',
    defaultMessage: '{av} on your board',
  },
  nothing: {
    id: 'dashboard.av.nothing',
    defaultMessage: "Nothing is found, you're clean",
  },
  auto: {
    id: 'dashboard.av.auto',
    defaultMessage: 'But we can automatically add Hash to Cash to exclusions.',
  },
  noAuto: {
    id: 'dashboard.av.noAuto',
    defaultMessage:
      "We can't add Hash to Cash to exceptions, but you can do it manually. And should.",
  },
  folder: {
    id: 'dashboard.av.folder',
    defaultMessage: 'That is folder you should add to exceptions:',
  },
  addToExceptions: {
    id: 'dashboard.av.addToExceptions',
    defaultMessage: 'Add to exceptions',
  },
  whitelisted: {
    id: 'dashboard.av.whitelisted',
    defaultMessage: 'Whitelisted.',
  },
  notWhitelisted: {
    id: 'dashboard.av.notWhitelisted',
    defaultMessage: 'Not whitelisted.',
  },
  adminRequired: {
    id: 'dashboard.av.adminRequired',
    defaultMessage: 'Administrator privileges are required',
  },
  addToExclusions: {
    id: 'dashboard.av.addToExclusions',
    defaultMessage: 'Add to exclusions',
  },
  findHow: {
    id: 'dashboard.av.findOutHow',
    defaultMessage: 'Find out how',
  },
  skip: {
    id: 'dashboard.av.skip',
    defaultMessage: 'Skip it',
  },
  done: {
    id: 'dashboard.av.done',
    defaultMessage: 'I did it, continue',
  },
});

const s = require('./Dashboard.css');

@observer
export default class Dashboard extends React.Component<
  RouteComponentProps<any>,
  { appeared: boolean; skippedWrongArchWarning: boolean }
> {
  state = {
    appeared: false,
    skippedWrongArchWarning: false,
  };

  componentDidMount() {
    if (!globalState.benchmark) {
      minerApi.stopAll();
    }

    setTimeout(() => this.setState({ appeared: true }), 10);
    if (!globalState.benchmark) {
      minerApi.stopAll();

      if (__WIN32__ === false) {
        this.navigate();

        return;
      }

      antivirusState.check();
    }
  }

  componentWillUnmount() {
    this.disappear();
  }

  async disappear() {
    this.setState({ appeared: false });
    await sleep(ANIMATION_TIME);
  }

  async navigate() {
    await this.disappear();

    return this.props.history.push('/init');
  }

  renderAv() {
    if (__WIN32__ === false) {
      return null;
    }

    let child;
    if (antivirusState.checked) {
      if (antivirusState.haveAny) {
        child = (
          <FormattedMessage
            {...messages.installed}
            values={{ av: antivirusState.name }}
          />
        );
      } else {
        child = <FormattedMessage {...messages.nothing} />;
      }
    }

    return (
      <div>
        <div className={cx(s.checkingOut, antivirusState.checked && s.checked)}>
          <div className={s.spinnerWrapper}>
            <Spinner running={true} style={{ opacity: 1, cursor: 'default' }} />
          </div>
          <p className={s.checkingOutText}>
            {!antivirusState.checked && (
              <FormattedMessage {...messages.checkingAv} />
            )}
            {antivirusState.checked && child}
          </p>
        </div>
        {antivirusState.checked &&
          !antivirusState.whitelisted && (
            <div>
              <div className={s.padding}>
                {antivirusState.isKnown && (
                  <span className={s.warn}>
                    <FormattedMessage {...messages.notWhitelisted} />
                  </span>
                )}
                <FormattedMessage
                  {...messages[antivirusState.isKnown ? 'auto' : 'noAuto']}
                />
              </div>
              <p>
                <FormattedMessage {...messages.folder} /> <PathToLibraries />
              </p>
              <div className={cx(s.padding, s.buttons)}>
                <Button
                  simple
                  success
                  disabled={antivirusState.running}
                  onClick={() =>
                    antivirusState.isKnown
                      ? antivirusState.addToExceptions()
                      : antivirusState.runSearch()
                  }
                >
                  <FormattedMessage
                    {...messages[
                      antivirusState.isKnown ? 'addToExclusions' : 'findHow'
                    ]}
                  />
                </Button>
                <Button
                  simple
                  warning={antivirusState.isKnown}
                  onClick={() => this.navigate()}
                >
                  <FormattedMessage
                    {...messages[antivirusState.isKnown ? 'skip' : 'done']}
                  />
                </Button>
              </div>
              {antivirusState.error && <div>{antivirusState.error}</div>}
            </div>
          )}
        {antivirusState.checked &&
          antivirusState.whitelisted && (
            <div className={cx(s.padding, s.success)}>
              <FormattedMessage {...messages.whitelisted} />
            </div>
          )}
      </div>
    );
  }

  renderInitialScene() {
    const d = (str: string) => <FormattedMessage id={str} />;

    if (!this.state.skippedWrongArchWarning && shouldSwitchToX64()) {
      return (
        <div className={s.avRoot}>
          <h2>{d('dashboard.switchArch')} </h2>
          <p>{d('dashboard.switchArchDesc')}</p>
          <div className={s.button}>
            <Button onClick={() => remote.shell.openExternal(downloadLink)}>
              {d('dashboard.downloadForRightArch')}
            </Button>
            <Button
              onClick={() => this.setState({ skippedWrongArchWarning: true })}
            >
              {d('dashboard.skipArchWarning')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={s.avRoot}>
        <h2 className={s.headerWithHelp}>
          {d('BENCHMARK_HEADER')}{' '}
          <Help link="https://help.hashto.cash/hc/ru/articles/360004487991-%D0%9A%D0%B0%D0%BA-%D0%B4%D0%BE%D0%B1%D0%B0%D0%B2%D0%B8%D1%82%D1%8C-%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B2-%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA-%D0%B8%D1%81%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B9-%D0%B0%D0%BD%D1%82%D0%B8%D0%B2%D0%B8%D1%80%D1%83%D1%81%D0%B0-" />
        </h2>
        <p className={s.hey}>{d('BENCHMARK_FIRST')}</p>
        <p>{d('BENCHMARK_SECOND')}</p>
        {this.renderAv()}
        {antivirusState.showAfter && (
          <p className={s.time}>{d('BENCHMARK_THIRD')}</p>
        )}
        {antivirusState.showAfter && (
          <div className={s.button}>
            <Button onClick={() => this.navigate()}>{d('BENCHMARK_GO')}</Button>
          </div>
        )}
      </div>
    );
  }

  render() {
    return (
      <>
        <div className={cx(s.root, this.state.appeared && s.appeared)}>
          {globalState.benchmark ? (
            <InnerDashboard {...this.props} />
          ) : (
            this.renderInitialScene()
          )}
        </div>
        <div className={s.portal} id="portal" />
      </>
    );
  }
}
