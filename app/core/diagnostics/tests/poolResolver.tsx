import { eachOf } from 'async';
import { sortBy } from 'lodash';
import { observable } from 'mobx';
import * as net from 'net';
import * as tls from 'tls';
import { defineMessages } from 'react-intl';
import { Test } from './test';
import { sleep } from '../../../renderer/utils/sleep';
import LocalizedError from '../../errors/LocalizedError';
let LocalStorage: any;
if (process.env.NODE_ENV !== 'test') {
  LocalStorage = require('../../../renderer/utils/LocalStorage').LocalStorage;
}

const debug = require('debug')('app:tests:poolResolver');
const messages = defineMessages({
  fallback: {
    id: 'core.diagnostics.poolIssues.fallback',
    defaultMessage:
      "We can't connect to one of servers, but we will use one of available",
  },
  dead: {
    id: 'core.diagnostics.poolIssues.dead',
    defaultMessage:
      "We can't connect to none of servers. Your firewall might be blocking it",
  },
  timeout: {
    id: 'core.diagnostics.poolIssues.timeout',
    defaultMessage: 'Timeout error',
  },
  title: {
    id: 'core.diagnostics.poolIssues.title',
    defaultMessage: 'Checking pools availability',
  },
  checking: {
    id: 'core.diagnostics.poolIssues.checking',
    defaultMessage: 'Checking connection to pool #{number}',
  },
});

export const poolEndpoints: [number, string, boolean][] = [
  [443, 'xmr.pool.hashto.cash', true],
  [80, 'xmr.pool.hashto.cash', false],
  [3000, 'xmr.pool.hashto.cash', false],
  [3001, 'xmr.pool.hashto.cash', true],
  [7000, 'xmr.pool.hashto.cash', false],
  [7001, 'xmr.pool.hashto.cash', true],
];

export async function checkServer(
  port: number,
  host: string,
  isTls = false
): Promise<any> {
  return new Promise((resolve, reject) => {
    const usedClient: typeof net = (isTls ? tls : net) as any;
    const client = usedClient.connect(
      port,
      host,
      {
        rejectUnauthorized: false,
      } as any
    );

    client.on('error', err => {
      reject(err);
    });

    let dataBuffer: any = '';

    client.on('connect', () => {
      client.on('data', d => {
        debug('Received following data from pool: ', d.toString());
        dataBuffer += d;
        if (Buffer.byteLength(dataBuffer, 'utf8') > 102400) {
          dataBuffer = null;

          client.destroy();
          return reject('Buffer overflow');
        }
        if (dataBuffer.indexOf('\n') !== -1) {
          const messages = dataBuffer.split('\n');
          const incomplete =
            dataBuffer.slice(-1) === '\n' ? '' : messages.pop();
          for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.trim() === '') {
              continue;
            }
            let jsonData;
            try {
              jsonData = JSON.parse(message);
            } catch (e) {
              client.destroy();
              return reject('Malformed message from pool');
            }
            if (jsonData) {
              return resolve(true);
            }
          }
          dataBuffer = incomplete;
        }
      });

      client.write(
        JSON.stringify({
          method: 'login',
          params: {
            login: '1wi1w1-w1w1w-1w1w',
            pass: 'e2',
            agent: 'test',
          },
          id: 1,
          jsonrpc: '2.0',
        }) + '\n'
      );
    });

    sleep(4000).then(d => reject(new LocalizedError(messages.timeout)));
  });
}

export type PoolReport = {
  port: number;
  host: string;
  isTls: boolean;
  isOk: boolean;
};

export class PoolResolver extends Test {
  id = 'pool-checker';
  @observable
  title = 'Checking pools availability';

  constructor() {
    super();

    poolEndpoints.forEach((pool, index) => {
      this.display.push({
        title: {
          __kind: 'intl',
          ...messages.checking,
          values: {
            number: index + 1,
          },
        },
        status: 'waiting',
      });
    });

    this.title = messages.title.id;
  }

  async resolve(): Promise<void> {
    const report: PoolReport[] = [];
    await new Promise(resolve =>
      eachOf(
        poolEndpoints,
        async ([port, host, isTls], _index) => {
          const index = _index as number;
          try {
            await checkServer(port, host, isTls);

            report.push({ host, port, isTls, isOk: true });
            this.display[index].status = 'success';
          } catch (e) {
            debug('Failed to resolve pool: ', { port, host, isTls }, e);

            this.display[index].status = 'failure';
            this.display[index].errorText = e;

            report.push({ host, port, isTls, isOk: false });
          }
        },
        () => {
          resolve();
        }
      )
    );

    if (LocalStorage) {
      LocalStorage.poolsReport = sortBy(report, 'port');
    }
  }
}
