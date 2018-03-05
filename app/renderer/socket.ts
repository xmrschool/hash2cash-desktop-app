import * as io from 'socket.io-client';
import CurrenciesService from './mobx-store/CurrenciesService';
const config = require('../config.js'); // tslint:disable-line

const socket = io(config.SOCKET_URL, { path: '/websocket_desktop' });

// First time we have to manually ask for appInfo
socket.emit('appInfo', '', (response: any) => {
  localStorage.appInfo = JSON.stringify(response);

  const ticker = response.ticker;
  if (Array.isArray(ticker)) {
    CurrenciesService.setTicker(response.ticker);
  } else {
    CurrenciesService.setTickerFromObject(response.ticker);
  }
});

// Then we subscribe to updates
socket.on('appInfo', (response: any) => {
  localStorage.appInfo = JSON.stringify(response);
});

(self.window as any).socket = socket;

export default socket;
