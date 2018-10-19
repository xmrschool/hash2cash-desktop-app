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
          <h3>Приложение обновилось! Вот что нового в 2.0.3:</h3>
          <ul>
            <li>
              <span className={s.main}>
                Исправили ошибку, из-за которой бенчмарк мог не работать на пользователях Windows, содержащих пробелы в имени.
              </span>{' '}
            </li>
            <li>
              <span className={s.main}>
                Исправили ошибку, из-за которой у некоторых не мог скачиваться майнер.
              </span>{' '}
            </li>
            <li>
              <span className={s.main}>
                Что-то пошло не так? Пишите нам в <a href="https://discord.gg/TAQAcKA" target="_blank">Discord</a>. Пожалуйста. Мы. Готовы. Помочь.
              </span>{' '}
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
