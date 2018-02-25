// A script which updates such data as enabled currencies, currency rates, etc

import * as io from 'socket.io-client';
const config = require('../config.js');

export default function updateData() {
  const socket = io(config.SOCKET_URL);

  socket.emit('info', (response: any) => {
    localStorage.currencies = response.currencies;
  });
}
