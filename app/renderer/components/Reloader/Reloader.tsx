import * as React from 'react';
import { createPortal } from 'react-dom';
import * as cx from 'classnames';
import { inject, observer } from 'mobx-react';
import { MobxState } from '../../mobx-store';
import Spinner from '../Spinner/Spinner';

const s = require('./Reloader.css');

export interface IProps {
  running?: boolean;
  oldStatus?: string;
  currentStatus?: string;
  switching?: boolean;
  run?: Function;
  refreshTrigger: () => void;
}

@inject((state: MobxState) => ({
  running: state.reloadState.running,
  oldStatus: state.reloadState.oldStatus,
  currentStatus: state.reloadState.currentStatus,
  switching: state.reloadState.switching,
  run: state.reloadState.run,
}))
@observer
export default class Reloader extends React.Component<IProps> {
  componentDidMount() {
    this.props.run!({ refreshTrigger: this.props.refreshTrigger });
  }
  render() {
    const portal = document.getElementById('portal');
    const { running, switching, oldStatus, currentStatus, run } = this.props;

    if (!portal) return null;
    return createPortal(
      <div className={cx([s.reload, running && s.running])}>
        <div>
          <Spinner running={running} onClick={() => run!()} />
        </div>
        <div className={s.switcherWrapper}>
          <div className={cx(s.switcher, switching && s.switch)}>
            <div className={s.oldText}>{oldStatus}</div>
            <div className={s.currentStatus}>{currentStatus}</div>
          </div>
        </div>
      </div>,
      portal
    );
  }
}
