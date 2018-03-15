import { remote } from 'electron';
import * as React from 'react';

const s = require('./Navigator.css');

export default class Navigator extends React.Component {
  close() {
    remote.getCurrentWindow().close();
  }

  minimize() {
    remote.getCurrentWindow().minimize();
  }

  render() {
    return (
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
    );
  }
}
