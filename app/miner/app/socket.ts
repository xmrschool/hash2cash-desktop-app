import * as io from 'socket.io';
const socket = io({
  wsEngine: 'ws',
});

export default socket;
