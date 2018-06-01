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
import { getPort } from '../../../core/utils';
import { addRunningPid } from '../RunningPids';
import * as fs from 'fs-extra';

export type Parameteres = 'power';

const debug = require('debug')('app:workers:jceCryptonight');
export default class JceCryptonight extends BaseWorker<Parameteres> {
  static requiredModules = ['jce-cryptonight'];
  static usesHardware = ['cpu'];
  static usesAccount = 'XMR';

  workerName: string = 'JceCryptonight';

  path: string = '';
  state: { [p: string]: any } = { dynamicDifficulty: false };
  parameters: ParameterMap<Parameteres> = {
    power: true,
  };
  daemon?: ChildProcess;
  running: boolean = false;
  willQuit: boolean = true;
  daemonPort?: number;
  pid?: number;

  get requiredModules() {
    return JceCryptonight.requiredModules;
  }

  get usesHardware() {
    return JceCryptonight.usesHardware;
  }

  get usesAccount() {
    return JceCryptonight.usesAccount;
  }

  getSpeeds(): Pick[] {
    return [
      {
        name: '🔥 Ultra 🔥',
        value: true,
      },
      {
        name: 'Low',
        value: false,
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

  async getAppArgs() {
    this.daemonPort = await getPort(25002);

    const args: any = {
      '--mport': this.daemonPort.toString(),
      '--variation': '3',
      '-o': this.getPool('cryptonight'),
      '-u': getLogin('JceCryptonight', this.state.dynamicDifficulty),
      '-p': 'x',
    };

    const outer: string[] = [];
    Object.keys(args).forEach(d => {
      outer.push(d);
      outer.push(args[d]);
    });
    outer.push('--nicehash', '--stakjson', '--any', '--auto');

    return outer;
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    return [
      {
        id: 'power',
        name: 'Power',
        values: this.getSpeeds(),
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
      const json = await resp.json();

      localStorage.largePageState = json.hugepages;

      return json;
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

    try {
      const fullyPath = path.join(this.path, __WIN32__ ? 'jce.exe' : 'jce');

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

      this.daemon = spawn(fullyPath, args, {
        cwd: this.path,
      });
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
    this.daemon!.stdin.write('q');
    this.daemon!.kill('SIGKILL');

    return true;
  }

  async reload() {
    await this.stop();
    await this.start();
  }

  async toJSON() {
    return {
      name: this.workerName,
      usesHardware: JceCryptonight.usesHardware,
      running: this.running,
      requiredModules: JceCryptonight.requiredModules,
      usesAccount: JceCryptonight.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
      menu: this.getMenuItems(),
    };
  }
}