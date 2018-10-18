import { eachOf } from 'async';
import { observable } from 'mobx';
import { defineMessages } from 'react-intl';
import { createServer } from 'http';
import { sleep } from '../../../renderer/utils/sleep';
import { Test } from './test';

let LocalStorage: any;
if (process.env.NODE_ENV !== 'test') {
  LocalStorage = require('../../../renderer/utils/LocalStorage');
}

const debug = require('debug')('app:tests:poolResolver');
const messages = defineMessages({
  title: {
    id: 'core.diagnostics.portsCanListen.title',
    defaultMessage: 'Checking ports availability',
  },
  notWorks: {
    id: 'core.diagnostics.portsCanListen.notWorks',
    defaultMessage: "Some ports can't be used to listen. It could cause issues",
  },
  checking: {
    id: 'core.diagnostics.portsCanListen.checking',
    defaultMessage: 'Checking port #{number}',
  },
});

const pool = [24391, 24392, 24393, 25001, 7005];

const phrase = 'Hash to Cash Test server' + +new Date();

export function checkPort(port: number) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write(phrase);
      res.end();
    });

    server.on('error', err => {
      reject(err);
    });

    server.listen(port, async () => {
      await sleep(300);

      const resp = await fetch(`http://localhost:${port}`);
      const txt = await resp.text();

      server.close();
      if (txt !== phrase) {
        return reject(new Error('Received malicious response'));
      }

      resolve(true);
    });

    sleep(1500).then(d => reject(new Error('Timeout error')));
  });
}

export class PoolResolver extends Test {
  id = 'port-checker';
  @observable title = 'Checking ports availability';

  constructor() {
    super();

    pool.forEach((port, index) => {
      this.display.push({
        title: {
          __kind: 'intl',
          ...messages.checking,
          values: {
            number: port,
          },
        },
        status: 'waiting',
      });
    });

    this.title = messages.title.id;
  }

  async resolve(): Promise<void> {
    const report: any = [];
    let onceFailed = false;
    await new Promise(resolve =>
      eachOf(
        pool,
        async (port, _index) => {
          const index = _index as number;
          try {
            await checkPort(port);

            report.push(port);
            this.display[index].status = 'success';
          } catch (e) {
            debug('Failed to resolve port: ', { port }, e);

            onceFailed = true;
            this.display[index].status = 'failure';
            this.display[index].errorText = e;
          }
        },
        resolve
      )
    );

    if (LocalStorage) {
      LocalStorage.availablePorts = report;
    }

    if (onceFailed) {
      this.downside = messages.notWorks;
    }
  }
}
