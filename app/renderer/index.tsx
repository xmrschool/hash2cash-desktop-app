import * as React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import * as Promise from 'bluebird';
import Root from 'components/Root';
import socket from './socket';
import './app.global.scss';
import 'api/storage';

Promise.promisifyAll(require('electron-json-storage'));

const { configureStore, history } = require('./store/configureStore');
const store = configureStore();

render(
  <AppContainer>
    <Root store={store} history={history} socket={socket} />
  </AppContainer>,
  document.getElementById('root')
);

if ((module as any).hot) {
  (module as any).hot.accept('components/Root', () => {
    const NextRoot = require('components/Root').default;
    render(
      <AppContainer>
        <NextRoot store={store} history={history} socket={socket} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
