import { ChildProcess, spawn } from 'child_process';
import * as moment from 'moment';
import * as kill from 'tree-kill';
import * as path from 'path';

import { BaseWorker, MenuPicks, Parameter, ParameterMap } from './BaseWorker';
import {
  attemptToTerminateMiners,
  getEthUrl,
  getLogin,
  RuntimeError,
} from '../utils';
import { addRunningPid } from '../RunningPids';
import * as fs from 'fs-extra';
import workersCache from '../workersCache';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';
import { SpeedHistory } from '../SpeedHistory';

export type Parameteres = 'power';

const stdoutTemplate = /^Eth speed: (\d{1,10}[,.]\d{1,4})/;
const debug = require('debug')('app:workers:phoenixMiner');
export default class PhoenixMiner extends BaseWorker<Parameteres> {
  static requiredModules = ['phoenixMiner'];
  static usesHardware = ['gpu'];
  static usesAccount = 'ETH';
  static displayName = 'Phoenix Miner';

  workerName: string = 'PhoenixMiner';
  runningSince: moment.Moment | null = null;

  path: string = '';
  state: { [p: string]: any } = {};
  parameters: ParameterMap<Parameteres> = {
    power: 100,
  };
  daemon?: ChildProcess;
  running: boolean = false;
  willQuit: boolean = true;
  daemonPort?: number;
  pid?: number;

  currentSpeed: number = 0;
  speedHistory: SpeedHistory = new SpeedHistory();

  get requiredModules() {
    return PhoenixMiner.requiredModules;
  }

  get usesHardware() {
    return PhoenixMiner.usesHardware;
  }

  get usesAccount() {
    return PhoenixMiner.usesAccount;
  }

  getMenuItems(): MenuPicks {
    return [this.openInExplorer(), this.untouchedConfig()];
  }

  // Todo this is obvious, but not good solution. We might want to check if we have AMD devices and let run in parallel with CUDA.
  getCompatibleGpuParams() {
    try {
      const hasCuda = !!LocalStorage.rawCollectedReport!.cuda!.devices.find(
        d => d.memory > 2000
      );

      return hasCuda ? ['-nvidia'] : ['-amd'];
    } catch (e) {
      return ['-amd'];
    }
  }

  async getAppArgs() {
    const args: any = {
      '-pool': getEthUrl(),
      '-wal': getLogin('ether'),
      '-proto': '2',
      '-gpow': this.parameters.power,
    };

    const outer: string[] = [];
    Object.keys(args).forEach(d => {
      outer.push(d);
      outer.push(args[d]);
    });

    outer.push(...this.getCompatibleGpuParams());

    return outer;
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    const powers = [];
    for (let i = 1; i <= 10; i++) {
      powers.push({ name: `${i * 10}%`, value: i * 10 });
    }

    return [
      {
        id: 'power',
        name: 'Power',
        values: powers.reverse(),
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
    return false;
  }

  async getSpeed(): Promise<(number | null)[]> {
    return this.speedHistory.speed();
  }

  async preventUncompatibleParallel() {
    const worker = workersCache.get('PhoenixMiner');

    if (worker && worker.running) {
      await worker.stop();
    }
  }

  emitSpeed(mh: number) {
    const inHashes = mh * 1024 * 1024;

    this.speedHistory.addSpeed(inHashes);
  }

  async start(): Promise<boolean> {
    if (this.running) throw new Error('Miner already running');

    this.speedHistory = new SpeedHistory();
    this.currentSpeed = 0;
    await this.preventUncompatibleParallel();
    try {
      const fullyPath = path.join(this.path, 'PhoenixMiner.exe');

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

      await attemptToTerminateMiners(['phoenixMiner']);
      if (this.daemon && this.daemon.kill) {
        try {
          await this.stop();
        } catch (e) {}
      }

      this.daemon = spawn(fullyPath, args);
      this.runningSince = moment();
      this.pid = this.daemon.pid;

      console.log('PhoenixMiner running with pid: ', this.pid);

      addRunningPid(this.pid);

      this.daemon.stdout.on('data', data => {
        const str = data.toString();
        const execed = stdoutTemplate.exec(str);

        if (execed !== null) {
          this.emitSpeed(parseFloat(execed[1]));
        }
        if (debug.enabled)
          debug('%c[STDOUT] %c\n%s', 'color: dodgerblue', 'color: black', str);
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

    this.currentSpeed = 0;
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
      usesHardware: PhoenixMiner.usesHardware,
      running: this.running,
      requiredModules: PhoenixMiner.requiredModules,
      usesAccount: PhoenixMiner.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
      menu: this.getMenuItems(),
      displayName: PhoenixMiner.displayName,
      updateThrottle: 5000,
    };
  }
}
