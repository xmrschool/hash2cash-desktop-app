import * as React from 'react';
import { createPortal } from 'react-dom';
import { observer, inject } from 'mobx-react';
import { MobxState } from 'mobx-store';
import {
  Toast as TToast,
  default as GlobalState,
} from 'mobx-store/GlobalState';
import * as cx from 'classnames';

const s = require('./Toast.css');
const close = require('../../../shared/icon/close.svg');

@inject((state: MobxState) => ({ toast: state.globalState.toast }))
@observer
export default class Toast extends React.Component<
  {
    toast?: TToast;
  },
  { lastToast?: TToast }
> {
  state = {
    lastToast: undefined,
  };

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.toast) {
      this.setState({ lastToast: nextProps.toast });
    }
  }

  renderToast() {
    const shouldShow = !!this.props.toast;
    const toast = this.props.toast || this.state.lastToast || null;

    return (
      <div className={cx(s.toast, shouldShow && s.show)}>
        {toast && <div className={s.message}>{toast.message}</div>}
        {toast &&
          toast.closable && (
            <div onClick={GlobalState.closeToast}>
              <img src={close} />
            </div>
          )}
      </div>
    );
  }
  render() {
    const element = document.getElementById('notify');

    if (!element) {
      console.error(
        'Cant find a notify element with #notify id. Notifies wont show'
      );
      return null;
    }

    return createPortal(this.renderToast(), element);
  }
}
