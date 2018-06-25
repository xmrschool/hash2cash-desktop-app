import { remote } from 'electron';
import * as cx from 'classnames';
import * as React from 'react';
import Modal from '../Modal/Modal';
import { observer } from 'mobx-react';
import GlobalState from '../../mobx-store/GlobalState';

const s = require('./Navigator.css');

@observer
export default class Navigator extends React.Component {
  state = {
    showNotify: false,
  };

  close() {
    remote.getCurrentWindow().close();
  }

  minimize() {
    remote.getCurrentWindow().minimize();
  }

  toggle() {
    this.setState({
      showNotify: !this.state.showNotify,
    });
  }

  render() {
    const notify = GlobalState.currentNotify;

    return (
      <div>
        <div className={s.root}>
          <div className={s.wordmark}>Hash to Cash</div>
          <div className={s.navigator}>
            <div className={s.minimize} onClick={this.minimize}>
              <svg
                name="TitleBarMinimize"
                width="12"
                height="12"
                viewBox="0 0 12 12"
              >
                <rect fill="#ffffff" width="10" height="1" x="1" y="6" />
              </svg>
            </div>
            <div className={s.close} onClick={this.close}>
              <svg
                name="TitleBarClose"
                width="12"
                height="12"
                viewBox="0 0 12 12"
              >
                <polygon
                  fill="#ffffff"
                  fillRule="evenodd"
                  points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
                />
              </svg>
            </div>
          </div>
        </div>
        {notify ? (
          <div>
            <div
              className={cx(s.notify, notify.type === 'notify' && s.primary)}
              onClick={() => this.toggle()}
              data-tooltip="Нажмите для просмотра полного сообщения"
            >
              <div
                className={s.notifyContainer}
                dangerouslySetInnerHTML={{ __html: notify.short }}
              />
            </div>
            {this.state.showNotify && (
              <Modal onClose={() => this.toggle()}>
                <div className={s.modalContainer} dangerouslySetInnerHTML={{ __html: notify.long }} />
              </Modal>
            )}
          </div>
        ) : (
          ''
        )}
      </div>
    );
  }
}
