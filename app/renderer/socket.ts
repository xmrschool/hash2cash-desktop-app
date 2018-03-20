import * as io from 'socket.io-client';
import CurrenciesService from './mobx-store/CurrenciesService';
const config = require('../config.js'); // tslint:disable-line

export type MinerReadyCallback = (_socket: SocketIOClient.Socket) => any;

let localSocket: SocketIOClient.Socket | null;
const socketLoadFns: MinerReadyCallback[] = [];

const socket = io(config.SOCKET_URL, {
  path: '/websocket_desktop',
  autoConnect: false,
});

(self.window as any).socket = socket;

async function delayedCreate() {
  socket.connect();

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
}

// This really speeds up start up time... Without it it took 1s to connect to socket.io server
// It's fucking long, maybe is there another workaround?
delayedCreate();
export default socket;

export function onceMinerReady(callback: MinerReadyCallback) {
  if (localSocket) {
    callback(localSocket);
  } else {
    socketLoadFns.push(callback);
  }
}

export function connectToLocalMiner(port: number) {
  console.log('Getting socket up on ', port, ' port');
  if (localSocket && !localSocket.connected) {
    // If already exists, don't do almost anything
    io.connect(`http://localhost:${port}`);

    return;
  }

  localSocket = io(`http://localhost:${port}`);

  socketLoadFns.map(d => d(localSocket!));
  socketLoadFns.slice(0);
}

export const connectionPromise = new Promise(resolve =>
  onceMinerReady(resolve),
);

export { localSocket };
