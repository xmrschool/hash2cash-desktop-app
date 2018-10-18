import { ChildProcess, spawn } from 'child_process';
import * as moment from 'moment';
import * as kill from 'tree-kill';
import * as path from 'path';

import {
  BaseWorker,
  MenuPicks,
  Parameter,
  ParameterMap,
} from './BaseWorker';
import { attemptToTerminateMiners, getEthUri, getLogin, RuntimeError } from '../utils';
import { timeout } from '../../../core/utils';
import { addRunningPid } from '../RunningPids';
import * as fs from 'fs-extra';
import workersCache from '../workersCache';
import { findAPortNotInUse } from '../../../core/portfinder';
import { SpeedHistory } from '../SpeedHistory';

export type Parameteres = 'power' | 'priority';

const debug = require('debug')('app:workers:bminer');
export default class Bminer extends BaseWorker<Parameteres> {
  static requiredModules = ['bminer'];
  static usesHardware = ['gpu'];
  static usesAccount = 'ETH';
  static displayName = 'Bminer';

  workerName: string = 'Bminer';
  runningSince: moment.Moment | null = null;

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

  speedHistory: SpeedHistory = new SpeedHistory();

  get requiredModules() {
    return Bminer.requiredModules;
  }

  get usesHardware() {
    return Bminer.usesHardware;
  }

  get usesAccount() {
    return Bminer.usesAccount;
  }

  getMenuItems(): MenuPicks {
    return [
      this.openInExplorer(),
      this.togglesState('dynamicDifficulty', 'miner.workers.dynamicDifficulty'),
      this.untouchedConfig(),
    ];
  }

  async getAppArgs() {
    this.daemonPort = await findAPortNotInUse(
      localStorage.bMinerPort || 25004
    );
    const args: any = {
      '-api': `localhost:${this.daemonPort}`,
      '-uri': getEthUri(getLogin('ether')),
    };

    const outer: string[] = [];
    Object.keys(args).forEach(d => {
      outer.push(d);
      outer.push(args[d]);
    });

    return outer;
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    return [];
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
        fetch(`http://localhost:${this.daemonPort}/api/status`),
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

      this.speedHistory.addSpeed(stats.miners[0].solver.solution_rate)
      return this.speedHistory.speed();
    } catch (e) {
      console.error('Failed to get speed: ', e);

      return [null, null, null];
    }
  }

  async preventUncompatibleParallel() {
    const worker = workersCache.get('Bminer');

    if (worker && worker.running) {
      await worker.stop();
    }
  }

  async start(): Promise<boolean> {
    if (this.running) throw new Error('Miner already running');

    this.speedHistory = new SpeedHistory();
    await this.preventUncompatibleParallel();
    try {
      const fullyPath = path.join(this.path, 'bminer.exe');

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

      await attemptToTerminateMiners(['bminer']);
      if (this.daemon && this.daemon.kill) {
        try {
          await this.stop();
        } catch (e) {}
      }

      this.daemon = spawn(fullyPath, args);
      this.runningSince = moment();
      this.pid = this.daemon.pid;

      console.log('Bminer running with pid: ', this.pid);

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
    } catch (e) {
      console.error('Failed to start miner: ', e);
      this.handleTermination(e, undefined, true);

      return false;
    }
  }

  async stop(): Promise<boolean> {
    if (!this.running) {
      return true;
    }

    this.running = false;
    this.emit({ running: false });

    this.willQuit = true;

    kill(this.pid as number);
    this.daemon = undefined;

    return true;
  }

  async reload() {
    await this.stop();
    await this.start();
  }

  async toJSON() {
    return {
      name: this.workerName,
      usesHardware: Bminer.usesHardware,
      running: this.running,
      requiredModules: Bminer.requiredModules,
      usesAccount: Bminer.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
      menu: this.getMenuItems(),
      displayName: Bminer.displayName,
      updateThrottle: 5000,
    };
  }
}
