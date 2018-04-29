import { remote } from 'electron';
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { RouteComponentProps, withRouter } from 'react-router';
import * as cx from 'classnames';

import minerApi, { Worker } from 'api/MinerApi';
import minerObserver, { InternalObserver } from 'mobx-store/MinerObserver';
import currenciesService, {
  CurrencyNumber,
} from 'mobx-store/CurrenciesService';
import globalState from 'mobx-store/GlobalState';
import userOptions from 'mobx-store/UserOptions';

import User from 'mobx-store/User';

import toMonero from 'utils/toMonero';

import Settings from 'scenes/Settings';
import buildMenu from '../Settings';
import RuntimeErrorNotifier from '../RuntimeErrorNotifier';
import { FallbackLoader } from '../LineLoader/LineLoader';
import ActionBar from '../ActionBar';
import Tips from '../Tips/Tips';
import Reloader from '../Reloader/Reloader';
import RignameEditor from '../RignameEditor/RignameEditor';
import PrettyNumber from '../PrettyNumber/PrettyNumber';

const settings = require('../../../core/icon/settings.svg');
const ws = require('scenes/Initialization/Worker.css');
const s = require('./InnerDashboard.css');

export const StatsView = observer(() => {
  // ToDo Legacy code here, to support first version with mysql
  const balanceInMonero =
    User.balance && User.balance > 0 ? toMonero(User.balance) : 0;
  const localBalance = currenciesService.toLocalCurrency(
    'XMR',
    balanceInMonero
  );

  const instance = currenciesService.ticker[userOptions.get('currency')];

  const total = minerObserver.workers
    .filter(d => d._data.running)
    .map(queue => queue.monthlyProfit().float())
    .reduce((d, prev) => prev + d, 0);

  const totalHashes = minerObserver.workers
    .filter(d => d._data.running)
    .map(queue => queue.hashesSubmitted)
    .reduce((d, prev) => prev + d, 0);

  const doneAmount = new CurrencyNumber(total, instance);

  return (
    <div className={s.padded}>
      <div>
        <RignameEditor />
        <div className={s.counter}>
          <h4 className={s.counterHead}>CURRENT BALANCE</h4>
          <h4 className={s.counterValue}>
            <FallbackLoader condition={typeof User.balance !== 'undefined'}>
              <PrettyNumber unit="XMR" num={balanceInMonero} fixedLevel={5} />
            </FallbackLoader>{' '}
            {typeof User.balance !== 'undefined' && (
              <span>
                <span className={s.equal}>≈</span>{' '}
                {localBalance.reactFormatted()}
              </span>
            )}
          </h4>
        </div>
        <div className={s.row}>
          <div className={s.counter}>
            <h4 className={s.counterHead}>TOTAL PERFORMANCE</h4>
            <h4 className={s.counterValue}>
              {doneAmount.reactFormatted()}
              <span className={s.period}> per month</span>
            </h4>
          </div>

          <div className={s.counter}>
            <h4 className={s.counterHead}>EARNED PER SESSION</h4>
            <h4 className={s.counterValue}>
              {totalHashes.toLocaleString()}{' '}
              <span className={s.currencySymbol}>H</span>
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
});

// ToDo use svg icons instead and add YT like animation
export const playSwitches = {
  start: <button className={s.playButton}>▶</button>,
  stop: <button className={s.playButton}>◼</button>,
  waiting: (
    <button disabled className={s.playButton}>
      ▶
    </button>
  ),
};

export type PossibleSwitches = keyof typeof playSwitches;
export type PlayButtonProps = {
  state: PossibleSwitches;
  [key: string]: any;
};

export const PlayButton = ({ state, ...props }: PlayButtonProps) => {
  return (
    <div className={s.playArea} {...props}>
      {playSwitches[state]}
    </div>
  );
};

@observer
export class WorkerView extends React.Component<
  { worker: Worker },
  { observer?: InternalObserver }
> {
  state: { observer?: InternalObserver } = {};

  constructor(props: any) {
    super(props);

    this.onOptionChange = this.onOptionChange.bind(this);
    this.observe = this.observe.bind(this);
    this.clickHandler = this.clickHandler.bind(this);
  }

  get worker() {
    return this.props.worker;
  }

  get name() {
    return this.props.worker.name;
  }

  onOptionChange(name: string) {
    return (e: any) => {
      this.props.worker.setCustomParameter(name, e.target.value);
    };
  }

  componentDidMount() {
    if (this.worker.running) {
      // This worker might be already running, so just restore its state
      try {
        this.setState({
          observer: minerObserver.observe(this.worker),
        });
      } catch (e) {
        console.error('Failed to observe worker: ', e);
      }
    }
  }

  observe() {
    this.setState({ observer: minerObserver.observe(this.props.worker) });
  }

  workerState(): 'stop' | 'waiting' | 'start' {
    if (this.props.worker.httpRequest) return 'waiting';
    if (this.props.worker.running) return 'stop';
    if (this.props.worker.running) return 'waiting';

    return 'start';
  }

  async clickHandler() {
    const action = this.workerState();
    const { worker } = this.props;

    switch (action) {
      case 'start':
        try {
          await worker.start();
          this.setState({ observer: minerObserver.observe(worker) });
        } catch (e) {
          // Everything is happen in the minerApi code
        }

        return;
      case 'stop':
        // Stop observing first to prevent any errors
        minerObserver.stopObserving(worker);
        await worker.stop();

        return;
      case 'waiting':
        return;
    }
  }

  componentDidUpdate() {
    const { worker } = this.props;

    const isOn = worker.running;

    const observer = this.state.observer;
    if (isOn && !observer) {
      // Maybe... If it's runned but we have no observer we should try to get it?
      this.componentDidMount();
    }
  }

  getSpeed() {
    const { worker } = this.props;

    const isOn = worker.running;

    const observer = this.state.observer;
    if (observer && isOn) {
      return (
        <FallbackLoader condition={observer.latestSpeed}>
          {observer.latestSpeed} H/s
        </FallbackLoader>
      );
    } else {
      const latest = globalState.getBenchmarkHashrate(worker.name);

      if (latest) {
        return <span>{latest} H/s</span>;
      }
    }

    return null;
  }

  render() {
    const { worker } = this.props;

    const miner = worker.data;
    const isOn = worker.running;

    const observer = this.state.observer;
    const speed = this.getSpeed();

    return (
      <div key={worker.name} className={cx(ws.worker, isOn && ws.highlighted)}>
        <PlayButton state={this.workerState()} onClick={this.clickHandler} />
        <span className={ws.name}>
          {currenciesService.getCurrencyName(miner.usesAccount)}
          <div className={ws.badge}>
            {miner.usesHardware![0].toUpperCase()}
            {speed ? <span>&nbsp;—&nbsp;{speed}</span> : null}
          </div>
        </span>
        <div className={s.switcher}>
          <div className={cx(s.switcherIn, isOn && s.minerActive)}>
            <div className={s.picks}>
              {worker.customParameters &&
                worker.customParameters.map(option => (
                  <div key={option.id} className={s.pick}>
                    <label className={s.label}>{option.name}</label>
                    <select
                      className={s.select}
                      value={worker.parameters![option.id]}
                      onChange={this.onOptionChange(option.id)}
                    >
                      {option.values.map(value => (
                        <option key={value.value} value={value.value}>
                          {value.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
            <div>
              {observer && (
                <span className={ws.profits}>
                  <span className={ws.monthly}>
                    {observer.monthlyProfit().reactFormatted()}{' '}
                    <span className={ws.caption}>per month</span>
                  </span>
                  <span className={ws.daily}>
                    {observer.dailyProfit().reactFormatted()}{' '}
                    <span className={ws.caption}>per day</span>
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export const layers = {
  settings: (props: any) => <Settings {...props} />,
  tips: (props: any) => <Tips />,
};

// ToDo Probably wrapper around layer would be much better (to implement mobx & shouldComponentUpdate)
@inject(state => ({
  layer: (state as any).globalState.openedLayer,
  layerOpened: (state as any).globalState.layerOpened,
  layerAnimating: (state as any).globalState.layerAnimating,
}))
@observer
export default class Layer extends React.Component<
  {
    layer?: 'settings' | 'tips' | null;
    layerOpened?: boolean;
    layerAnimating?: boolean;
  } & RouteComponentProps<any>,
  { animationDone: boolean }
> {
  render() {
    const { layer, layerOpened, layerAnimating, ...props } = this.props;

    return (
      <div className={s.layers}>
        <div
          className={cx(
            s.layer,
            s.reverse,
            (!layer || !layerOpened) && s.shown,
            !layerAnimating && s.animationDone
          )}
        >
          <InnerDashboard {...props} />
        </div>
        <div
          className={cx(
            s.layer,
            layer && layerOpened && s.shown,
            layer && !layerAnimating && s.animationDone
          )}
        >
          {layer && layers[layer](props)}
        </div>
      </div>
    );
  }
}

@observer
export class WorkersView extends React.Component<{ workers: Worker[] }, any> {
  render() {
    return this.props.workers.map(worker => (
      <WorkerView key={worker.name} worker={worker} />
    ));
  }
}

@(withRouter as any)
@observer
export class InnerDashboard extends React.Component<any> {
  state = {
    appeared: false,
  };

  constructor(props: any) {
    super(props);

    this.openMenu = this.openMenu.bind(this);
    this.runEverything = this.runEverything.bind(this);
  }

  componentDidMount() {
    if (minerApi.workers.length === 0) minerApi.getWorkers();

    User.watchOutForSubmitting();
  }

  componentWillUnmount() {
    User.stopWatching();
  }

  renderPlay(onClick: any) {
    return (
      <div className={s.playArea} onClick={onClick}>
        <button className={s.playButton}>▶</button>
      </div>
    );
  }

  openMenu({ x, y }: any) {
    buildMenu(this.props as RouteComponentProps<any>).popup({
      window: remote.getCurrentWindow(),
    });
  }

  runEverything() {
    const workers = minerApi.findMostProfitableWorkers();
    const action = this.getGlobalPlayState(workers);

    if (action === 'waiting') return;
    if (
      workers.gpu &&
      workers.gpu[0] &&
      workers.gpu[0].running === (action === 'stop')
    ) {
      workers.gpu[0][action]();
    }

    if (
      workers.cpu &&
      workers.cpu[0] &&
      workers.cpu[0].running === (action === 'stop')
    ) {
      workers.cpu[0][action]();
    }
  }

  getGlobalPlayState(workers: { [hardware: string]: Worker[] }) {
    if (!workers.cpu) return 'start';
    const cpuMiner = workers.cpu[0];
    const gpuMiner = workers.gpu && workers.gpu[0];

    if (!gpuMiner) {
      if (cpuMiner.httpRequest) return 'waiting';
      if (cpuMiner.running) return 'stop';

      return 'start';
    }
    if (gpuMiner.httpRequest || cpuMiner.httpRequest) return 'waiting';
    if (cpuMiner.running && gpuMiner.running) return 'stop';

    return 'start';
  }

  render() {
    const workers = minerApi.findMostProfitableWorkers();
    return (
      <div className={s.root}>
        <div className={s.menu}>
          <h2>Dashboard</h2>
          <div>
            <span>
              <img src={settings} className={s.icon} onClick={this.openMenu} />
            </span>
          </div>
        </div>
        <StatsView />
        <ActionBar workers={workers} />
        {workers.gpu && <h3 className={s.header}>GPU</h3>}
        {workers.gpu && <WorkersView workers={workers.gpu} />}
        <h3 className={s.header}>CPU</h3>
        {workers.cpu && <WorkersView workers={workers.cpu} />}

        <div style={{ flexGrow: 1 }} />
        <Reloader />
        <RuntimeErrorNotifier />
      </div>
    );
  }
}
