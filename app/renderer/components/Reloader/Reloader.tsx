import * as React from "react";
import * as cx from 'classnames';
import { inject, observer } from "mobx-react";
import { MobxState } from "../../mobx-store";

const s = require('./Reloader.css');
const reload = require('./reload.svg');

export interface IProps {
  running?: boolean;
  oldStatus?: string;
  currentStatus?: string;
  switching?: boolean;
  run?: Function;
}
@inject((state: MobxState) => ({
  running: state.reloadState.running,
  oldStatus: state.reloadState.oldStatus,
  currentStatus: state.reloadState.currentStatus,
  switching: state.reloadState.switching,
  run: state.reloadState.run
}))
@observer
export default class Reloader extends React.Component<IProps> {
  render() {
    const { running, switching, oldStatus, currentStatus, run } = this.props;
    return (
      <div className={s.reload}>
        <div><img className={cx(s.icon, running && s.spinner)} src={reload} onClick={() => run!()}/></div>
        <div className={s.switcherWrapper}>
          <div className={cx(s.switcher, switching && s.switch)}>
            <div className={s.oldText}>{oldStatus}</div>
            <div className={s.currentStatus}>{currentStatus}</div>
          </div>
        </div>
      </div>
    )
  }
}
