import * as React from 'react';
import { remote } from 'electron';
import { sortBy } from 'lodash';
import { FormattedMessage, injectIntl } from 'react-intl';
import { inject, observer } from 'mobx-react';
import { RouteComponentProps, withRouter } from 'react-router';
import * as cx from 'classnames';

import minerApi, { Worker } from 'api/MinerApi';
import minerObserver, { InternalObserver } from 'mobx-store/MinerObserver';
import currenciesService from 'mobx-store/CurrenciesService';
import globalState from 'mobx-store/GlobalState';

import User from 'mobx-store/User';

import Settings from 'scenes/Settings';
import buildMenu from '../Settings';
import RuntimeErrorNotifier from '../RuntimeErrorNotifier';
import { FallbackLoader } from '../LineLoader/LineLoader';
import ActionBar from '../ActionBar';

import Tips from '../Tips/Tips';
import Reloader from '../Reloader/Reloader';
import CloseIcon from '../CloseIcon/CloseIcon';
import Dropdown, { Delimiter, DropdownPick } from '../Dropdown/Dropdown';
import Switch from '../Switch/Switch';
import { MenuPick } from '../../../miner/app/workers/BaseWorker';
import Changelog from '../Changelog/Changelog';
import formatHashrate from '../../utils/formatHashrate';
import { StatsView } from './StatsView';
import { MobxState } from '../../mobx-store';

const settings = require('../../../core/icon/settings.svg');
const ws = require('scenes/Initialization/Worker.css');
const s = require('./InnerDashboard.css');

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
  { worker: Worker; workers: Worker[]; pickWorker: Function },
  { observer?: InternalObserver; menuOpened: boolean }
> {
  state: { observer?: InternalObserver; menuOpened: boolean } = {
    menuOpened: false,
  };
  menu: any;

  constructor(props: any) {
    super(props);

    this.onOptionChange = this.onOptionChange.bind(this);
    this.observe = this.observe.bind(this);
    this.clickHandler = this.clickHandler.bind(this);
    this.openMenu = this.openMenu.bind(this);
  }

  get worker() {
    return this.props.worker;
  }

  get name() {
    return this.props.worker.name;
  }

  openMenu() {
    this.setState({
      menuOpened: !this.state.menuOpened,
    });
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
    if (this.props.worker.pendingRequest) return 'waiting';
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
          console.error('Failed to start miner: ', e);
        }

        return;
      case 'stop':
        // Stop observing first to prevent any errors
        try {
          minerObserver.stopObserving(worker);
        } catch (e) {
          console.error('Failed to stop observing: ', e);
        }
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
          {formatHashrate(observer.latestSpeed || 0)}
        </FallbackLoader>
      );
    } else {
      const latest = globalState.getBenchmarkHashrate(worker.name);

      if (latest) {
        return <span>{formatHashrate(latest)}</span>;
      }
    }

    return null;
  }

  renderMenuChild(menu: MenuPick) {
    if (menu.type === 'delimiter') {
      return <div key={menu.id} className={s.delimiter} />;
    }

    return (
      <div
        key={menu.id}
        className={s.menuPick}
        onClick={() =>
          menu.type === 'function' && this.props.worker.callFunc(menu.id)
        }
      >
        <FormattedMessage id={menu.localizedName} />
        {menu.type === 'pick' && (
          <div>
            <Switch
              checked={menu.isPicked}
              onChange={() =>
                this.props.worker.callFunc(menu.id, !menu.isPicked)
              }
            />
          </div>
        )}
      </div>
    );
  }

  renderMenu() {
    return (
      <div className={s.menu} ref={ref => (this.menu = ref)}>
        <CloseIcon opened={this.state.menuOpened} onClick={this.openMenu} />
        <Dropdown
          isOpened={this.state.menuOpened}
          childRef={this.menu}
          onToggled={this.openMenu}
        >
          <div>
            {this.props.worker.data.menu.map(menu =>
              this.renderMenuChild(menu)
            )}
          </div>
        </Dropdown>
      </div>
    );
  }

  minerPicker() {
    const { workers, worker, pickWorker } = this.props;
    const picked = worker.name;

    return (
      <div className={ws.customMiners}>
        {workers.map(w => (
          <div
            key={w.name}
            className={cx(ws.customMiner, picked === w.name && ws.active)}
            onClick={() => pickWorker(w.name)}
          >
            {w.displayName}
          </div>
        ))}
      </div>
    );
  }

  render() {
    const { worker, workers } = this.props;

    const miner = worker.data;
    const isOn = worker.running;

    const observer = this.state.observer;
    const speed = this.getSpeed();

    // ToDo refactor options, so it won't cause re-render each time
    return (
      <div key={worker.name} className={cx(ws.worker, isOn && ws.highlighted)}>
        <div className={ws.inner}>
          <PlayButton state={this.workerState()} onClick={this.clickHandler} />
          <div className={ws.name}>
            {currenciesService.getCurrencyName(miner.usesAccount)}
            <div className={ws.badge}>
              {miner.usesHardware![0].toUpperCase()}
              {speed ? <span>&nbsp;—&nbsp;{speed}</span> : null}
            </div>
          </div>
          <div className={s.switcher}>
            <div className={cx(s.switcherIn, isOn && s.minerActive)}>
              <div>
                <div className={s.picks}>
                  {worker.customParameters &&
                    worker.customParameters.map(option => (
                      <div key={option.id} className={s.pick}>
                        <label className={s.label}>
                          <FormattedMessage
                            id={`OPTIONS_${option.id}`.toUpperCase()}
                            defaultMessage={option.name}
                          />
                        </label>
                        <select
                          className={s.select}
                          value={worker.parameters![option.id]}
                          onChange={this.onOptionChange(option.id)}
                        >
                          {option.values.map(value => (
                            <FormattedMessage
                              key={value.value}
                              id={`POWER_LEVEL_${value.value}`.toUpperCase()}
                              defaultMessage={value.name}
                            >
                              {(message: any) => (
                                <option key={value.value} value={value.value}>{message}</option>
                              )}
                            </FormattedMessage>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                {observer && (
                  <span className={ws.profits}>
                    <span className={ws.monthly}>
                      {observer.monthly}{' '}
                      <span className={ws.caption}>
                        <FormattedMessage id="PERFORMANCE_MONTHLY" />
                      </span>
                    </span>
                    <span className={ws.daily}>
                      {observer.daily}{' '}
                      <span className={ws.caption}>
                        <FormattedMessage id="PERFORMANCE_DAILY" />
                      </span>
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {this.renderMenu()}
        </div>
        {workers.length > 1 && this.minerPicker()}
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
            !layerAnimating && !layerOpened && s.animationDone
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

export type WorkersViewProps = { workers: Worker[]; kind: string };

@(observer as any)
export class WorkersView extends React.Component<
  WorkersViewProps,
  { active: string }
> {
  state = { active: '' };

  get key() {
    return `active_${this.props.kind}`;
  }

  static getDerivedStateFromProps(props: WorkersViewProps) {
    const { workers, kind } = props;

    if (props.workers.length === 0) {
      return { active: workers[0].name };
    }

    const key = `active_${kind}`;
    const wanted = localStorage[key];

    if (wanted) {
      if (workers.find(d => d.name === wanted)) {
        return { active: wanted };
      }
    }

    const sorted = sortBy(workers, worker =>
      globalState.getBenchmarkHashrate(worker.name)
    );
    const name = sorted[sorted.length - 1].name;

    localStorage.setItem(key, name);

    return { active: name };
  }

  get currentWorker() {
    return (
      this.props.workers.find(d => d.name === this.state.active) ||
      this.props.workers[0]
    );
  }

  pickWorker(name: string) {
    if (this.currentWorker.running) {
      this.currentWorker.stop(true);
    }
    this.setState({ active: name });
    localStorage.setItem(this.key, name);
  }

  render() {
    const worker = this.currentWorker;

    return (
      <WorkerView
        key={worker.name}
        worker={worker}
        workers={this.props.workers}
        pickWorker={(name: string) => this.pickWorker(name)}
      />
    );
  }
}

@inject((state: MobxState) => ({
  run: state.reloadState.run,
}))
@(injectIntl as any)
@(withRouter as any)
@observer
export class InnerDashboard extends React.Component<any> {
  menu: any;

  state = {
    appeared: false,
    dropdownToggled: false,
  };

  constructor(props: any) {
    super(props);

    this.openMenu = this.openMenu.bind(this);
    this.runEverything = this.runEverything.bind(this);
  }

  componentDidMount() {
    if (minerApi.workers.length === 0) {
      minerApi.getWorkers();
    }

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
    buildMenu(this.props as RouteComponentProps<any>, this.props.intl).popup({
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
      if (cpuMiner.pendingRequest) return 'waiting';
      if (cpuMiner.running) return 'stop';

      return 'start';
    }
    if (gpuMiner.pendingRequest || cpuMiner.pendingRequest) return 'waiting';
    if (cpuMiner.running && gpuMiner.running) return 'stop';

    return 'start';
  }

  refreshTrigger() {
    console.log('Triggering forceUpdate()');
    this.forceUpdate();
  }

  toggle() {
    this.setState({ dropdownToggled: !this.state.dropdownToggled });
  }

  renderOptions() {
    return (
      <div>
        <DropdownPick>v{__RELEASE__.slice(0, 15)}-{process.platform}-{process.env.NODE_ENV!.slice(0, 5)}</DropdownPick>
        <DropdownPick onClick={() => this.props.run()}><FormattedMessage id="mobx.reload.update" /></DropdownPick>
        <Delimiter />
        <DropdownPick onClick={() => globalState.showLayer('settings') && this.toggle()}><FormattedMessage id="SETTINGS_MENU_GO_SETTINGS" /></DropdownPick>
        <Delimiter />
        <DropdownPick><FormattedMessage id="SETTINGS_MENU_LOGOUT" /></DropdownPick>
        <DropdownPick><FormattedMessage id="SETTINGS_MENU_LOGOUT_YEAH" /></DropdownPick>
      </div>
    )
  }

  render() {
    const workers = minerApi.findMostProfitableWorkers();
    return (
      <div className={s.root}>
        <div className={s.menu}>
          <h2>
            <FormattedMessage id="DASHBOARD_LABEL" />
          </h2>
          <div ref={ref => (this.menu = ref)}>
            <Dropdown
              top={30}
              isOpened={this.state.dropdownToggled}
              onToggled={() => this.toggle()}
              childRef={this.menu}
            >
              {this.renderOptions()}
            </Dropdown>
            <img src={settings} className={s.icon} onClick={() => this.toggle()} />
          </div>
        </div>
        <StatsView s={s} />
        <ActionBar workers={workers} />
        {!workers.cpu && <h3 className={s.header}>Загрузка майнеров...</h3>}
        {workers.gpu && <h3 className={s.header}>GPU</h3>}
        {workers.gpu && <WorkersView workers={workers.gpu} kind="gpu" />}
        {workers.cpu && <h3 className={s.header}>CPU</h3>}
        {workers.cpu && <WorkersView workers={workers.cpu} kind="cpu" />}

        <div style={{ flexGrow: 1 }} />
        <Reloader refreshTrigger={() => this.refreshTrigger()} />
        <RuntimeErrorNotifier />
        <Changelog />
      </div>
    );
  }
}
