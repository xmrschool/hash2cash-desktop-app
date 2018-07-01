import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { observer } from 'mobx-react';
import tips from '../../../core/tips';
import { Worker } from '../../api/MinerApi';
import minerApi from '../../api/MinerApi';
import globalState from '../../mobx-store/GlobalState';

export type Props = {
  workers: { [hardware: string]: Worker[] };
};

const s = require('./ActionBar.css');
const start = require('./play-button.svg');
const stop = require('./pause-button.svg');
const tipsIcon = require('./bell.svg');
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
    const workers = minerApi.findWorkersInView();

    if (
      workers.gpu &&
      workers.gpu.running === (action === 'stop')
    ) {
      workers.gpu[action]();
    }

    if (
      workers.cpu &&
      workers.cpu.running === (action === 'stop')
    ) {
      workers.cpu[action]();
    }
  }

  render() {
    const [mainState, secondary] = this.getGlobalPlayState(this.props.workers);
    const icon = mainState === 'stop' ? stop : start;
    const tipsCount = tips.tipsCount;

    return (
      <div className={s.row}>
        <button
          data-tips-count={tipsCount === 0 ? undefined : tipsCount}
          onClick={() => globalState.showLayer('tips')}
          className={s.play}
          aria-label="Tips"
        >
          <label className={s.label}>
            <FormattedMessage id="DASHBOARD_MENU_TIPS" />
          </label>
          <img src={tipsIcon} className={s.playButton} />
        </button>
        <button
          disabled={secondary}
          className={s.play}
          onClick={() => this.runEverything(mainState)}
          aria-label="Resume mining"
        >
          <label className={s.label}>
            <FormattedMessage
              id={`DASHBOARD_MENU_${mainState}`.toUpperCase()}
              defaultMessage={mainState}
            />
          </label>
          <img src={icon} className={s.playButton} />
        </button>
        <button
          className={s.play}
          style={{ pointerEvents: 'none', opacity: 0.6 }}
          aria-label="Devices"
        >
          <label className={s.label}>
            <FormattedMessage id="DASHBOARD_MENU_DEVICES" />
          </label>
          <img src={cards} className={s.playButton} />
        </button>
      </div>
    );
  }
}
