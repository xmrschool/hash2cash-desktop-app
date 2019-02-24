import { ChildProcess, spawn } from 'child_process';
import * as moment from 'moment';
import * as path from 'path';

import {
  BaseWorker,
  MenuPicks,
  Parameter,
  ParameterMap,
} from './BaseWorker';
import { attemptToTerminateMiners, getLogin, RuntimeError } from '../utils';
import { timeout } from '../../../core/utils';
import { addRunningPid } from '../RunningPids';
import * as fs from 'fs-extra';
import workersCache from '../workersCache';
import { findAPortNotInUse } from '../../../core/portfinder';

export type Parameteres = 'power';

const maps: any = {
  superOptimized: [12, 300],
  optimized: [12, 200],
  middle: [10, 120],
  full: [8, 100],
};

const debug = require('debug')('app:workers:xmrigNvidia');
export default class XmrigNvidia extends BaseWorker<Parameteres> {
  static requiredModules = ['xmrig-nvidia'];
  static usesHardware = ['gpu'];
  static usesAccount = 'XMR';
  static displayName = 'XMRig nVidia';

  workerName: string = 'XmrigNvidia';
  runningSince: moment.Moment | null = null;

  path: string = '';
  state: { [p: string]: any } = { dynamicDifficulty: false };
  parameters: ParameterMap<Parameteres> = {
    power: 'optimized',
  };
  daemon?: ChildProcess;
  running: boolean = false;
  willQuit: boolean = true;
  daemonPort?: number;
  pid?: number;

  get requiredModules() {
    return XmrigNvidia.requiredModules;
  }

  get usesHardware() {
    return XmrigNvidia.usesHardware;
  }

  get usesAccount() {
    return XmrigNvidia.usesAccount;
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
        name: 'More system speed',
        value: 'optimized',
      },
      {
        name: 'Middle',
        value: 'middle',
      },
      {
        name: 'More mining speed',
        value: 'full',
      },
    ];
  }

  async getAppArgs() {
    this.daemonPort = await findAPortNotInUse(localStorage.xmrigPort || 25007);
    const { url, isTls } = this.getPreferredPool('cryptonight');

    const args: any = {
      '-l': './log.txt',
      '--api-port': this.daemonPort,
      '--print-time': 5,
      '-o': url,
      '-u': getLogin('MoneroCryptonight', this.state.dynamicDifficulty),
      '-p': 'x',
    };

    const outer: string[] = [];
    Object.keys(args).forEach(d => {
      outer.push(d);
      outer.push(args[d]);
    });
    if (isTls) {
      outer.push('--tls');
    }
    if (this.parameters.power) {
      const power = this.parameters.power as any;
      const [bfactor, bsleep] = maps[power];

      outer.push(`--cuda-bfactor=${bfactor}`);
      outer.push(`--cuda-bsleep=${bsleep}`);
    }

    outer.push('--no-color', '-k');

    return outer;
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    return [
      {
        id: 'power',
        name: 'Power',
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

  async preventUncompatibleParallel() {
    const worker = workersCache.get('GpuCryptonight');

    if (worker && worker.running) {
      await worker.stop();
    }
  }

  async start(): Promise<boolean> {
    if (this.running) throw new Error('Miner already running');

    await this.preventUncompatibleParallel();
    try {
      const fullyPath = path.join(this.path, __WIN32__ ? 'xmrig-nvidia.exe' : 'xmrig-nvidia');

      let reuse =
        (await fs.pathExists(this.pathTo('preserve.txt'))) &&
        (await fs.pathExists(this.pathTo('appArgs.json')));

      let args: any = await this.getAppArgs();
      try {
        if (reuse) {
          const possibleArgs = JSON.parse(
            (await fs.readFile(this.pathTo('appArgs.json'))).toString()
          );

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
        await fs.writeFile(
          this.pathTo('appArgs.json'),
          JSON.stringify(args, null, 2)
        );
      }

      await attemptToTerminateMiners(['jce']);
      if (this.daemon && this.daemon.kill) {
        try {
          await this.stop();
        } catch (e) {}
      }

      this.running = true;
      this.daemon = spawn(fullyPath, args);
      this.runningSince = moment();
      this.pid = this.daemon.pid;

      addRunningPid(this.pid);

      this.daemon.stdout.on('data', data => {
        this.running = true;
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
    } catch (e) {
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
      usesHardware: XmrigNvidia.usesHardware,
      running: this.running,
      requiredModules: XmrigNvidia.requiredModules,
      usesAccount: XmrigNvidia.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
      menu: this.getMenuItems(),
      displayName: XmrigNvidia.displayName,
    };
  }
}
