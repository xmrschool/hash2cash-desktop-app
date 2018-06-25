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
const close = require('../../../core/icon/close.svg');

@inject((state: MobxState) => ({ toast: state.globalState.toast }))
@observer
export default class Toast extends React.Component<
  {
    toast?: TToast;
  },
  { lastToast?: TToast; margin: number; animating: boolean }
> {
  ref: any;
  state = {
    lastToast: undefined,
    margin: 0,
    animating: false,
  };

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.toast) {
      this.setState({
        lastToast: nextProps.toast,
        margin: 0,
        animating: false,
      });
      setTimeout(() => {
        this.assignMargin(document.getElementById('toast-message'));
      }, 50);
    }
  }

  assignMargin(ref: any) {
    if (ref && ref.scrollWidth !== ref.offsetWidth) {
      setTimeout(() => {
        this.setState({
          margin: ref.offsetWidth - ref.scrollWidth - 5,
          animating: true,
        });
      }, 400);
    }
  }

  renderToast() {
    const shouldShow = !!this.props.toast;
    const toast = this.props.toast || this.state.lastToast || null;

    return (
      <div className={cx(s.toast, shouldShow && s.show)}>
        {toast && (
          <div
            id="toast-message"
            className={cx(s.message, this.state.animating && s.animating)}
            style={{ marginLeft: this.state.margin }}
          >
            {toast.message}
          </div>
        )}
        {toast &&
          toast.closable && (
            <div onClick={() => GlobalState.closeToast()}>
              <img className={s.close} src={close} />
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
