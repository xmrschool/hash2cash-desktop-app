import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { observer } from 'mobx-react';
import { Worker } from '../../api/MinerApi';
import minerApi from '../../api/MinerApi';
import globalState from '../../mobx-store/GlobalState';

export type Props = {
  workers: { [hardware: string]: Worker[] };
};

const s = require('./ActionBar.css');
const start = require('./play-button.svg');
const stop = require('./pause-button.svg');
const tips = require('./bell.svg');
const cards = require('./video-card.svg');

@observer
export default class ActionBar extends React.Component<Props> {
  // This functions checks if cpu & gpu miners both runned
  getGlobalPlayState(workers: {
    [hardware: string]: Worker[];
  }): ['stop' | 'start', boolean] {
    if (!workers.cpu) return ['start', true];
    const cpuMiner = workers.cpu[0];
    const gpuMiner = workers.gpu && workers.gpu[0];

    if (!gpuMiner) {
      const mainState = cpuMiner.running;
      const secondary = cpuMiner.httpRequest;

      return [mainState ? 'stop' : 'start', secondary];
    }
    const mainState = cpuMiner.running || gpuMiner.running;
    const secondary = gpuMiner.httpRequest || cpuMiner.httpRequest;

    return [mainState ? 'stop' : 'start', secondary];
  }

  runEverything(action: 'stop' | 'start') {
    const workers = minerApi.findMostProfitableWorkers();

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

  render() {
    const [mainState, secondary] = this.getGlobalPlayState(this.props.workers);
    const icon = mainState === 'stop' ? stop : start;
    const tipsCount = 0;

    return (
      <div className={s.row}>
        <button
          data-tips-count={tipsCount === 0 ? undefined : tipsCount}
          onClick={() => globalState.showLayer('tips')}
          className={s.play}
          aria-label="Tips"
        >
          <label className={s.label}><FormattedMessage id="DASHBOARD_MENU_TIPS" /></label>
          <img src={tips} className={s.playButton} />
        </button>
        <button
          disabled={secondary}
          className={s.play}
          onClick={() => this.runEverything(mainState)}
          aria-label="Resume mining"
        >
          <label className={s.label}><FormattedMessage id={`DASHBOARD_MENU_${mainState}`.toUpperCase()} defaultMessage={mainState} /></label>
          <img src={icon} className={s.playButton} />
        </button>
        <button
          className={s.play}
          style={{ pointerEvents: 'none', opacity: 0.6 }}
          aria-label="Devices"
        >
          <label className={s.label}><FormattedMessage id="DASHBOARD_MENU_DEVICES" /></label>
          <img src={cards} className={s.playButton} />
        </button>
      </div>
    );
  }
}
