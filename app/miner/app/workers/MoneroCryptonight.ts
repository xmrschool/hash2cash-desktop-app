import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

import {
  BaseWorker,
  MenuPicks,
  Parameter,
  ParameterMap,
  Pick,
} from './BaseWorker';
import { getLogin, RuntimeError } from '../utils';
import { getPort, timeout } from '../../../core/utils';
import { addRunningPid } from '../RunningPids';
import * as fs from 'fs-extra';

export type Parameteres = 'power' | 'priority';

const debug = require('debug')('app:workers:moneroCryptonight');
export default class MoneroCryptonight extends BaseWorker<Parameteres> {
  static requiredModules = ['cryptonight'];
  static usesHardware = ['cpu'];
  static usesAccount = 'XMR';

  workerName: string = 'MoneroCryptonight';

  path: string = '';
  state: { [p: string]: any } = { dynamicDifficulty: false };
  parameters: ParameterMap<Parameteres> = {
    power: 100,
    priority: 2,
  };
  daemon?: ChildProcess;
  running: boolean = false;
  willQuit: boolean = true;
  daemonPort?: number;
  pid?: number;

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

  getMenuItems(): MenuPicks {
    return [
      this.openInExplorer(),
      this.togglesState('dynamicDifficulty', 'miner.workers.dynamicDifficulty'),
      this.untouchedConfig(),
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

  async getAppArgs() {
    this.daemonPort = await getPort(25000);

    const args: any = {
      '-l': './log.txt',
      '--api-port': this.daemonPort,
      '--print-time': 10000,
      '--max-cpu-usage': this.parameters.power,
      '--cpu-priority': this.parameters.priority,
      '-o': this.getPool('cryptonight'),
      '-u': getLogin('MoneroCryptonight', this.state.dynamicDifficulty),
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

      const resp = await Promise.race([
        timeout(),
        fetch(`http://localhost:${this.daemonPort}`),
      ]);

      if (resp === false) {
        return new RuntimeError(
          'Failed to getStats',
          new Error('Timeout error while getting stats'),
          false
        );
      }

      const json = await resp.json();

      localStorage.largePageState = json.hugepages;

      return json;
    } catch (e) {
      throw new RuntimeError('Failed to get stats', e, false);
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

    try {
      const fullyPath = path.join(this.path, __WIN32__ ? 'xmrig.exe' : 'xmrig');

      let reuse = await fs.pathExists(this.pathTo('preserve.txt')) && await fs.pathExists(this.pathTo('appArgs.json'));

      let args: any = await this.getAppArgs();
      try {
        if (reuse) {
          const possibleArgs = JSON.parse((await fs.readFile(this.pathTo('appArgs.json'))).toString());

          if (Array.isArray(possibleArgs)) {
            args = possibleArgs;
          } else {
            reuse = false;
          }
        }
      } catch (e) {
        reuse = false;
      }

      this.willQuit = false;
      if (debug.enabled)
        debug(
          'Running a miner...\n%c"%s" %s',
          'color: crimson',
          fullyPath,
          args.join(' ')
        );

      if (!reuse) {
        await fs.writeFile(this.pathTo('appArgs.json'), JSON.stringify(args, null, 2));
      }

      this.daemon = spawn(fullyPath, args);
      this.pid = this.daemon.pid;

      addRunningPid(this.pid);

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
    } catch(e) {
      console.error('Failed to start miner: ', e);
      this.handleTermination(e, undefined, true);

      return false;
    }
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
      menu: this.getMenuItems(),
    };
  }
}
