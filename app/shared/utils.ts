import * as net from 'net';

export function getPort(startingAt: number): Promise<number> {
  function getNextAvailablePort(currentPort: number, cb: Function) {
    const server = net.createServer();
    server.listen(currentPort, () => {
      server.once('close', () => {
        cb(currentPort);
      });
      server.close();
    });
    server.on('error', _ => {
      getNextAvailablePort(++currentPort, cb);
    });
  }

  return new Promise(resolve => {
    getNextAvailablePort(startingAt, resolve);
  });
}
