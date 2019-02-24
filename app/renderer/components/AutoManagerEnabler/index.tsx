import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import Switch from '../Switch';
import Help from '../Help/Help';
import { LocalStorage } from '../../utils/LocalStorage';
import minerApi from '../../api/MinerApi';
import useLocalStorage from '../hooks/useLocalStorage';
import { sleep } from '../../utils/sleep';

const s = require('./style.css');

export function toggleStrategy() {
  LocalStorage.smartStrategy = true;
}

export default function AutoManagerEnabler() {
  const [enabled, setEnabled] = useLocalStorage('smartStrategy', false);

  function toggle() {
    setEnabled(!enabled);

    minerApi.updateStrategyState().then(d => sleep(1000)).then(d => minerApi.getWorkers(true));
  }

  return (
    <div className={s.root}>
      <FormattedMessage
        id="enable_auto_strategy"
        defaultMessage="Smart miner strategy"
      />
      <div className={s.switch}>
        <Switch checked={enabled} onChange={toggle} />
      </div>
      <div className={s.help}>
        <Help link="https://help.hashto.cash/hc/ru/articles/360024514191" />
      </div>
    </div>
  );
}
