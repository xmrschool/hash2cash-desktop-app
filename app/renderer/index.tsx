import { ipcRenderer } from 'electron';
import * as React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Root from 'components/Root';
import socket from './socket';
import './app.global.scss';
import trackError from '../shared/raven';

const { configureStore, history } = require('./store/configureStore').default;
const store = configureStore();

// simple !__WIN32__ doesnt work...
if (__WIN32__ === false) {
  document.body.setAttribute('candrag', 'true');
}


window.addEventListener('unhandledrejection', function(event) {
  trackError((event as any).reason);
});

render(
  <AppContainer>
    <Root store={store} history={history} socket={socket} />
  </AppContainer>,
  document.getElementById('root'),
);

setTimeout(() => ipcRenderer.emit('renderer-ready', null), 200);
