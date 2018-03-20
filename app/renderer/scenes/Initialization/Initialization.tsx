import * as React from 'react';
import { observer, inject } from 'mobx-react';
import * as cx from 'classnames';
import { RouteComponentProps } from 'react-router';

import { ANIMATION_TIME } from 'scenes/Home/Home';
import { sleep } from 'utils/sleep';
import _initializationState, {
  InitializationState,
} from 'mobx-store/InitializationState';
import minerObserver from 'mobx-store/MinerObserver';
import { Device } from 'api/Api';

import collectHardware from '../../../shared/hardware/collector';
import ProgressBar from '../../components/ProgressBar';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Worker from './Worker';
import {
  default as currenciesService,
  CurrencyNumber,
} from '../../mobx-store/CurrenciesService';
import userOptions from '../../mobx-store/UserOptions';
import RuntimeErrorNotifier from "../../components/RuntimeErrorNotifier/RuntimeErrorNotifier";

const s = require('./Initialization.scss');
const warning = require('./warning.svg');

const debug = require('debug')('app:init');

let initializationState = _initializationState;
@inject((state: any) => state.initializationState)
@observer
export default class Initialization extends React.Component<
  RouteComponentProps<any>,
  { appeared: boolean }
> {
  bar: any;

  state = {
    appeared: false,
  };

  constructor(props: any) {
    super(props);

    this.navigateToDashboard = this.navigateToDashboard.bind(this);
    this.reload = this.reload.bind(this);
  }

  componentDidMount() {
    setTimeout(() => this.setState({ appeared: true }), 10);

    this.action();
  }

  componentWillUnmount() {
    this.disappear();
  }

  async disappear() {
    this.setState({ appeared: false });
    await sleep(ANIMATION_TIME);
  }

  navigateToDashboard() {
    minerObserver.clearAll();
    this.props.history.push('/dashboard');
  }

  async action() {
    try {
      const hardware = await collectHardware();

      initializationState.setHardware(hardware);
      initializationState.setStep(1 / 7);
      debug('1/7, hardware collected: ', hardware);

      initializationState.setStep(2 / 7);
      initializationState.setStatus('Fetching download manifest...');
      const manifest = await initializationState.fetchManifest();
      debug('2/7, fetched manifest: ', manifest);

      initializationState.setStep(3 / 7);
      initializationState.setStatus('Downloading binaries...');
      await initializationState.downloadBinaries();

      debug('4/7 benchmarking');
      initializationState.setStep(4 / 7);
      initializationState.setStatus('Benchmarking...');
      initializationState.bechmarking = true;
      await initializationState.benchmark();

      initializationState.setStep(1);
      initializationState.progressText = '100%';
      initializationState.everythingDone = true;
    } catch (e) {
      console.error('Main action failed: ', e);
      initializationState.setUnexpectedError(e);
    }
  }

  formatPower(device: Device): string {
    try {
      const vram =
        device.type === 'gpu'
          ? device.collectedInfo.memory.toFixed()
          : 0;

      return device.type === 'cpu'
        ? `${parseFloat(device.collectedInfo.speed)}GHz * ${
            device.collectedInfo.cores
          }`
        : `${vram}Mb VRAM`;
    } catch (e) {
      return '';
    }
  }

  buildKey(device: Device): string {
    return device.type === 'gpu' ? device.deviceID : 'cpu';
  }

  renderModel(device: Device) {
    if (device.type === 'gpu' && device.unavailableReason) {
      return (
        <div style={{ flexGrow: 1 }}>
          <div className={s.unavailable}>
            <span className={s.model}>{device.model}</span>
            <img className={s.warning} src={warning} />
          </div>
          <div className={s.reasonContainer}>{device.unavailableReason}</div>
        </div>
      );
    }

    return <span className={s.model}>{device.model}</span>;
  }

  async reload() {
    initializationState = new InitializationState();
    minerObserver.clearAll();
    this.forceUpdate();
    await sleep(1000);
    this.action();
  }

  renderBenchmarkDetails(initializationState: any) {
    return (
      <>
        <h2 className={s.header}>Algorithms</h2>
        <div className={s.benchmarks}>
          {minerObserver.workers.map(worker => (
            <Worker worker={worker} key={worker.name} />
          ))}
        </div>
      </>
    );
  }

  renderResults() {
    const instance = currenciesService.ticker[userOptions.get('currency')];

    const total = minerObserver.workers
      .map(queue => queue.monthlyProfit().float())
      .reduce((d, prev) => prev + d, 0);

    const doneAmount = new CurrencyNumber(total, instance);
    return (
      <div
        className={cx(
          s.done,
          initializationState.everythingDone && s.transformDone
        )}
      >
        <div className={s.doneInner}>
          <span className={s.doneAmount}>
            <span>{doneAmount.reactFormatted()}</span>
            <span className={s.donePerMonth}>you can mine per month</span>
          </span>
          <Button onClick={this.navigateToDashboard}>Continue</Button>
        </div>
      </div>
    );
  }
  render() {
    return (
      <React.Fragment>
        <div
          className={cx(
            s.root,
            this.state.appeared && s.appeared,
            (initializationState.downloadError ||
              initializationState.unexpectedError) &&
              s.blurred
          )}
        >
          <h2>{initializationState.status}</h2>
          <ProgressBar
            className={s.circle}
            step={initializationState.step}
            text={initializationState.progressText}
          />
          <div className={s.scrollable}>
            <div className={s.hardwares}>
              <h2 className={s.header}>Hardware</h2>
              {initializationState.hardware &&
                initializationState.hardware.devices.map(device => (
                  <div
                    key={this.buildKey(device)}
                    className={cx(
                      s.hardware,
                      device.unavailableReason && s.behind
                    )}
                  >
                    <div style={{ flexGrow: 1 }}>
                      {this.renderModel(device)}
                      <p className={s.badge}>{device.type}</p>
                    </div>
                    <span className={s.power}>{this.formatPower(device)}</span>
                  </div>
                ))}
            </div>
            {initializationState.bechmarking &&
              this.renderBenchmarkDetails(initializationState)}
          </div>
        </div>
        {initializationState.hardware &&
          minerObserver.workers &&
          this.renderResults()}
        {initializationState.unexpectedError && (
          <Modal>
            <h2>It seems that internal error happened</h2>
            <p style={{ opacity: 0.6 }}>
              {(initializationState.unexpectedError as any).message}
            </p>
            <p>
              You can try again, or if you think that problem is on our side,
              get us in touch
            </p>
            <Button onClick={this.reload} style={{ marginTop: 40 }}>
              Try again
            </Button>
          </Modal>
        )}
        {initializationState.downloadError && (
          <Modal>
            <h2>It seems that error happened</h2>
            <p style={{ opacity: 0.6 }}>
              Failed to download miner{' '}
              {initializationState.downloadError.miner.name} ({
                initializationState.downloadError.message
              })
            </p>
            <p>
              You can try again, or if you think that problem is on our side,
              get us in touch
            </p>
            <Button onClick={this.reload} style={{ marginTop: 40 }}>
              Try again
            </Button>
          </Modal>
        )}
        <RuntimeErrorNotifier />
      </React.Fragment>
    );
  }
}
