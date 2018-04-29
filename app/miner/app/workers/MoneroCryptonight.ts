import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

import { BaseWorker, Parameter, ParameterMap, Pick } from './BaseWorker';
import { getLogin, RuntimeError } from '../utils';
import { getPort } from '../../../core/utils';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';

export type Parameteres = 'power' | 'priority';

const debug = require('debug')('app:workers:moneroCryptonight');
export default class MoneroCryptonight extends BaseWorker<Parameteres> {
  static requiredModules = ['cryptonight'];
  static usesHardware = ['cpu'];
  static usesAccount = 'XMR';

  workerName: string = 'MoneroCryptonight';

  path: string = '';
  parameters: ParameterMap<Parameteres> = {
    power: 100,
    priority: 2,
  };
  daemon?: ChildProcess;
  running: boolean = false;
  willQuit: boolean = true;
  daemonPort?: number;

  get requiredModules() {
    return MoneroCryptonight.requiredModules;
  }

  get usesHardware() {
    return MoneroCryptonight.usesHardware;
  }

  get usesAccount() {
    return MoneroCryptonight.usesAccount;
  }

  getSpeeds(): Pick[] {
    return [
      {
        name: '🔥 Ultra 🔥',
        value: 100,
      },
      {
        name: '🔥 High',
        value: 75,
      },
      {
        name: 'Low',
        value: 50,
      },
      {
        name: 'Low',
        value: 25,
      },
      {
        name: 'Lowest possible',
        value: 10,
      },
    ];
  }

  getPriorities() {
    return [
      {
        name: 'Low',
        value: 0,
      },
      {
        name: 'Below normal',
        value: 1,
      },
      {
        name: 'Normal',
        value: 2,
      },
      {
        name: 'Above normal',
        value: 3,
      },
      {
        name: 'High',
        value: 4,
      },
      {
        name: '🔥Realtime',
        value: 5,
      },
    ];
  }

  buildConfig() {
    return {
      algo: 'cryptonight',
      background: false,
      colors: false,
      retries: 5,
      'retry-pause': 5,
      'donate-level': 0,
      syslog: false,
      'log-file': './log.txt',
      'print-time': 60,
      av: 0,
      safe: false,
      'max-cpu-usage': 100,
      'cpu-priority': null,
      threads: null,
      pools: [
        {
          url: this.getPool('cryptonight'),
          user: LocalStorage.userId,
          pass: 'x',
          keepalive: true,
          nicehash: false,
        },
      ],
      api: {
        port: 5913,
        'access-token': null,
        'worker-id': 'worker',
      },
    };
  }

  async getAppArgs() {
    this.daemonPort = await getPort(25000);

    const args: any = {
      '-l': './log.txt',
      '--api-port': this.daemonPort,
      '--print-time': 1000,
      '--max-cpu-usage': this.parameters.power,
      '--cpu-priority': this.parameters.priority,
      '-o': this.getPool('cryptonight'),
      '-u': getLogin('MoneroCryptonight'),
      '-p': 'x',
    };

    const outer: string[] = [];
    Object.keys(args).forEach(d => {
      outer.push(d);
      outer.push(args[d]);
    });
    outer.push('--no-color', '-k');

    return outer;
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    return [
      {
        id: 'power',
        name: 'Power',
        values: this.getSpeeds(),
      },
      {
        id: 'priority',
        name: 'CPU priority',
        values: this.getPriorities(),
      },
    ];
  }

  async setCustomParameter(id: Parameteres, value: any): Promise<void> {
    try {
      this.getValue(id, value);

      this.parameters[id] = value;
      this.commit();

      this.emit({ parameters: this.parameters });
      return;
    } catch (e) {
      console.error('failed to set prop');
      throw new RuntimeError('Cannot set a custom property', e);
    }
  }

  async getStats(): Promise<any> {
    try {
      if (!this.running) {
        throw new Error('Worker is not running');
      }
      const resp = await fetch(`http://127.0.0.1:${this.daemonPort}`);
      return await resp.json();
    } catch (e) {
      throw new RuntimeError('Failed to get stats', e);
    }
  }

  async getSpeed(): Promise<(number | null)[]> {
    try {
      if (!this.running) {
        throw new Error("Worker is not running, so you can't get a speed");
      }
      const stats = await this.getStats();

      return stats.hashrate.total;
    } catch (e) {
      console.error('Failed to get speed: ', e);

      return [null, null, null];
    }
  }

  async start(): Promise<boolean> {
    if (this.running) throw new Error('Miner already running');

    const args = await this.getAppArgs();
    const fullyPath = path.join(this.path, __WIN32__ ? 'xmrig.exe' : 'xmrig');

    this.willQuit = false;
    if (debug.enabled)
      debug(
        'Running a miner...\n%c"%s" %s',
        'color: crimson',
        fullyPath,
        args.join(' ')
      );
    this.daemon = spawn(fullyPath, args);

    this.daemon.stdout.on('data', data => {
      if (debug.enabled)
        debug(
          '%c[STDOUT] %c\n%s',
          'color: dodgerblue',
          'color: black',
          data.toString()
        );
    });

    this.emit({ running: true });

    this.daemon.on('close', err => this.handleTermination(err, true));
    this.daemon.on('error', err => this.handleTermination(err));

    this.running = true;

    return true;
  }

  async stop(): Promise<boolean> {
    if (!this.running) throw new Error('Miner not running');

    this.running = false;
    this.emit({ running: false });

    this.willQuit = true;
    this.daemon!.kill();

    return true;
  }

  async reload() {
    await this.stop();
    await this.start();
  }

  async toJSON() {
    return {
      name: this.workerName,
      usesHardware: MoneroCryptonight.usesHardware,
      running: this.running,
      requiredModules: MoneroCryptonight.requiredModules,
      usesAccount: MoneroCryptonight.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
    };
  }
}
