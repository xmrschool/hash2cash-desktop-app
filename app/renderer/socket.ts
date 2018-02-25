import * as io from 'socket.io-client';
import CurrenciesService from './mobx-store/CurrenciesService';
const config = require('../config.js'); // tslint:disable-line

const socket = io(config.SOCKET_URL);

// First time we have to manually ask for appInfo
socket.emit('appInfo', '', (response: any) => {
  localStorage.appInfo = JSON.stringify(response);

  CurrenciesService.setTickerFromObject(response.ticker);
});

// Then we subscribe to updates
socket.on('appInfo', (response: any) => {
  localStorage.appInfo = JSON.stringify(response);
});

(self.window as any).socket = socket;

export default socket;
