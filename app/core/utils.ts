import { createServer } from 'http';

export function getPort(startingAt: number): Promise<number> {
  function getNextAvailablePort(currentPort: number, cb: Function) {
    const server = createServer();
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

export function timeout(ms = 5000): Promise<false> {
  return new Promise(resolve =>
    setTimeout(() => resolve(false), ms)
  ) as any;
}
