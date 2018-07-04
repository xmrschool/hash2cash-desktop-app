import * as ReactDOM from 'react-dom';
import { remote } from 'electron';
import * as React from 'react';
import * as cx from 'classnames';

const s = require('./Changelog.scss');

export default class Changelog extends React.Component<
  {},
  { visible: boolean; visibleAtAll: boolean }
> {
  state = {
    visible: false,
    visibleAtAll: false,
  };

  get version() {
    return remote.app.getVersion();
  }

  show() {
    this.setState({ visibleAtAll: true });

    setTimeout(() => this.setState({ visible: true }), 5);
  }

  componentDidMount() {
    const version = this.version;
    // This variable setting up on >= 1.2.0, so if there is not, app was updated
    if (!localStorage.firstInstalledVersion) {
      this.show();

      return;
    } else if (localStorage.firstInstalledVersion === version) {
      return;
    }

    // ChangelogOfVersion setting up once announcement is closed. So, if there was announcement closed
    // for old version, we show it for newest
    if (localStorage.changelogOfVersion !== version) {
      this.show();
    }
  }

  close() {
    this.setState({ visible: false });
    setTimeout(() => this.setState({ visibleAtAll: false }), 350);
    if (!localStorage.firstInstalledVersion) {
      localStorage.firstInstalledVersion = this.version;
    }

    localStorage.changelogOfVersion = this.version;
  }

  render() {
    const visible = this.state.visible;
    const child = (
      <div className={s.modal}>
        <div className={cx(s.backdrop, visible && s.visible)} />
        <div className={cx(s.inner, visible && s.visible)}>
          <h3>Приложение обновилось! Вот что нового в 1.2.2:</h3>
          <ul>
            <li>
              <span className={s.main}>
                Мы исправили ошибку, из-за которой запускалось несколько одинаковых майнеров.
              </span>{' '}
              <span className={s.secondary}>
                Такие случаи участились в последние дни. К сожалению JCE по прежнему может запускаться несколько раз, это трудно исправить :(
              </span>
            </li>
            <li>
              <span className={s.main}>Добавили Кипер.</span> <span className={s.secondary}>Кипер следит за вашими майнерами, и автоматически перезапускает их, если они "упали". Его можно включить в настройках. <a href="https://help.hashto.cash/hc/ru/articles/360006941431" target="_blank">Подробнее (кликабельно)</a></span>
            </li>
          </ul>
          <div>
            <button
              className={cx(s.btn, s.transparent)}
              onClick={() => this.close()}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );

    if (!this.state.visibleAtAll) return null;
    return ReactDOM.createPortal(child, document.getElementById('modal')!);
  }
}
