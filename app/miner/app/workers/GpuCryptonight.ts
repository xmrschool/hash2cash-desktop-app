import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as kill from 'tree-kill';
import * as moment from 'moment';
import * as fs from 'fs-extra';
import {
  BaseWorker,
  isFSError,
  MenuPicks,
  Parameter,
  ParameterMap,
  Pick,
} from './BaseWorker';
import { attemptToTerminateMiners, getLogin, RuntimeError } from '../utils';
import { getPort, timeout } from '../../../core/utils';
import { _CudaDevice, Architecture } from '../../../renderer/api/Api';
import { sleep } from '../../../renderer/utils/sleep';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';
import { addRunningPid, shiftRunningPid } from '../RunningPids';
import trackError from '../../../core/raven';
import { findAPortNotInUse } from '../../../core/portfinder';

export type Parameteres = 'main' | 'additional';

export default class GpuCryptonight extends BaseWorker<Parameteres> {
  static requiredModules = ['cryptonight-xmrstak'];
  static usesHardware = ['gpu'];
  static usesAccount = 'XMR';
  static displayName = 'XMR Stak';

  latestString: string = '';

  runningSince: moment.Moment | null = null;
  willQuit: boolean = false;
  workerName: string = 'GpuCryptonight';

  path: string = '';
  state: { [p: string]: any } = {
    noAMD: localStorage.skipOpenCl === 'true',
    noNVIDIA: false,
    affineToCpu: false,
    dynamicDifficulty: false,
  };
  parameters: ParameterMap<Parameteres> = {
    main: 'ultraOptimized',
    additional: 'ultraOptimized',
  };
  daemon?: ChildProcess;
  running: boolean = false;
  daemonPort?: number;
  pid?: number;

  get requiredModules() {
    return GpuCryptonight.requiredModules;
  }

  get usesHardware() {
    return GpuCryptonight.usesHardware;
  }

  get usesAccount() {
    return GpuCryptonight.usesAccount;
  }

  get executableName() {
    return __WIN32__ ? 'hashtocash-cryptonight.exe' : 'hashtocash-cryptonight';
  }

  get noAMD() {
    return this.state.noAMD || localStorage.skipOpenCl === 'true';
  }

  get rigName() {
    return localStorage.rigName || 'pc';
  }

  get maps() {
    return {
      full: __WIN32__ ? [8, 100, 1] : [0, 0, 1],
      middle: [8, 100, 0.8],
      optimized: [8, 110, 0.7],
      ultraOptimized: [9, 150, 0.5],
    } as any;
  }

  getArgsFor(index: number) {
    if (index === 0) {
      return this.maps[this.parameters.main];
    }

    return this.maps[this.parameters.additional];
  }

  getSpeeds(): Pick[] {
    return [
      {
        name: '🔥 Ultra 🔥',
        value: 'full',
      },
      {
        name: 'Middle',
        value: 'middle',
      },
      {
        name: 'Low',
        value: 'optimized',
      },
      {
        name: 'Lowest possible',
        value: 'ultraOptimized',
      },
    ];
  }

  pathTo(configName: string) {
    return path.join(this.path, configName);
  }

  buildNvidiaConfig(report: Architecture) {
    const nvidiaGpus = report.devices.filter(
      d => d.platform && d.platform === 'cuda'
    ) as _CudaDevice[];

    if (nvidiaGpus.length > 0) {
      const outer: string[] = [];

      nvidiaGpus.forEach(device => {
        const props = device.collectedInfo;
        const [bfactor, bsleep, threads] = this.getArgsFor(props.index);

        outer.push(`//${props.name} ${props.memory}MB\n{ "index" : ${
          props.index
        },
    "threads" : ${(props.deviceThreads * threads).toFixed()}, "blocks" : ${
          props.deviceBlocks
        },
    "bfactor" : ${bfactor}, "bsleep" : ${bsleep},
    "affine_to_cpu" : false, "sync_mode" : 3, "mem_mode" : 1,
  }`);
      });
      const template = `
"gpu_threads_conf" :
[
${outer.join(',\n')}
],
      `;

      fs.writeFile(this.pathTo('nvidia.txt'), template);
    }
  }

  buildAmdConfig(report: Architecture) {
    // TODO Let xmr-stak handle it for its own self and complete later
  }

  async buildConfigs() {
    const report = LocalStorage.collectedReport;

    if (!report) {
      console.error('Report is unavailable, try to restart your app');

      return;
    }

    await this.buildConfig();
    await this.buildNvidiaConfig(report);
    this.buildAmdConfig(report);
  }

  private async buildConfig() {
    const s = (q: any) => JSON.stringify(q);

    if (!this.running) this.daemonPort = await getPort(25001);
    const { url, isTls } = this.getPreferredPool('cryptonight');

    const pools = `
    "pool_list" :
[
	{"pool_address" : ${s(url)}, "wallet_address" : ${s(
      getLogin('GpuCryptonight', this.state.dynamicDifficulty)
    )}, "rig_id" : ${s(
      this.rigName + '-gpu'
    )}, "pool_password" : "", "use_nicehash" : true, "use_tls" : ${s(
      isTls
    )}, "tls_fingerprint" : "", "pool_weight" : 1 },
],
"currency" : "monero",
`;
    const template = `
"call_timeout" : 10,
"retry_time" : 30,
"giveup_limit" : 0,
"verbose_level" : 3,
"print_motd" : true,
"h_print_time" : 60,
"aes_override" : null,
"use_slow_memory" : "warn",
"tls_secure_algo" : true,
"daemon_mode" : false,
"flush_stdout" : false,
"output_file" : "",
"httpd_port" : ${this.daemonPort},
"http_login" : "",
"http_pass" : "",
"prefer_ipv4" : true,
    `;

    console.log(
      'Saving config to directory: ',
      path.join(this.path, 'config.txt')
    );
    await fs.outputFile(path.join(this.path, 'config.txt'), template);
    await fs.outputFile(path.join(this.path, 'pools.txt'), pools);
  }

  getCustomParameters(): Parameter<Parameteres>[] {
    return [
      {
        id: 'main',
        name: 'Main GPU',
        values: this.getSpeeds(),
      },
      {
        id: 'additional',
        name: 'Additional GPU',
        values: this.getSpeeds(),
      },
    ];
  }

  getMenuItems(): MenuPicks {
    return [
      this.openInExplorer(),
      this.untouchedConfig(),
      {
        type: 'delimiter',
        id: 'we-re looking for frontend developer, come work to us',
      },
      this.togglesState('noAMD', 'miner.workers.disableAmd'),
      this.togglesState('noNVIDIA', 'miner.workers.disableNvidia'),
      this.togglesState('affineToCpu', 'miner.workers.affineToCpu'),
      this.togglesState('dynamicDifficulty', 'miner.workers.dynamicDifficulty'),
    ];
  }

  async setCustomParameter(id: Parameteres, value: any): Promise<void> {
    try {
      this.getValue(id, value);

      this.parameters[id] = value;
      await this.buildConfigs();
      this.commit();

      this.emit({ worker: this.workerName, parameters: this.parameters });
      return;
    } catch (e) {
      console.error('failed to set prop');
      throw new RuntimeError('Cannot set a custom property', e);
    }
  }

  private async getDaemonPort() {
    this.daemonPort = await findAPortNotInUse(
      localStorage.gpuCryptonightPort || 25001
    );

    console.log('Running GPUCryptonight miner on port: ', this.daemonPort);

    return this.daemonPort;
  }

  async getStats(): Promise<any> {
    try {
      if (!this.running) {
        throw new Error('Worker is not running');
      }

      const resp = await Promise.race([
        timeout(),
        fetch(`http://localhost:${this.daemonPort}/api.json`),
      ]);

      if (resp === false) {
        return new Error('Timeout while gett ing stats');
      }

      return await resp.json();
    } catch (e) {
      console.error('Failed to get stats', e);
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

  handleTermination(
    data: any,
    isClose: boolean = false,
    forceHandle: boolean = false
  ) {
    if (this.pid) {
      shiftRunningPid(this.pid);
    }
    if (!forceHandle && (this.willQuit || !this.running)) return;
    if (isFSError(data))
      return super.handleTermination(data, isClose, forceHandle);

    const errorMessage = `XMR Stak has been stopped with code ${data} and last message ${
      this.latestString
    }`;

    this.emit({
      running: false,
      _data: {
        grateful: isClose,
        message: errorMessage,
        code: data && data.code,
        raw: data,
      },
    });

    this.running = false;
  }

  async start(): Promise<boolean> {
    if (this.running) throw new Error('Miner already running');

    try {
      const isPathExists = await fs.pathExists(this.pathTo('preserve.txt'));
      this.preserveConfig = isPathExists;

      // If no config exists, build it
      if (!isPathExists) await this.buildConfigs();

      this.willQuit = false;

      const uac = __WIN32__ ? ['--noUAC'] : [];
      const args = [
        '-i',
        (await this.getDaemonPort()).toString(),
        '--noCPU',
        this.noAMD && '--noAMD',
        this.state.noNVIDIA && '--noNVIDIA',
        ...uac,
      ].filter(d => !!d); // Exclude false

      console.log('Running GPU miner with args: ', args, this.state);
      await attemptToTerminateMiners(['hashtocash-cryptonight']);
      if (this.daemon && this.daemon.kill) {
        try {
          await this.stop();
        } catch (e) {}
      }

      this.daemon = spawn(path.join(this.path, this.executableName), args, {
        cwd: this.path,
        env: {
          XMRSTAK_NOWAIT: 'true',
        },
      });
      this.runningSince = moment();
      const pid = this.daemon.pid;
      this.pid = pid;

      addRunningPid(this.pid);

      this.emit({ running: true });

      this.daemon.stdout.on('data', data => {
        if (!this.running) {
          // Still emits some stdout even if miner was shut down?
          kill(pid);
          attemptToTerminateMiners(['hashtocash-cryptonight']);
        }
        this.latestString = data.toString();
        console.log(`stdout: ${data}`);
      });

      this.daemon.on('close', err => this.handleTermination(err, true));
      this.daemon.on('error', err => this.handleTermination(err));

      this.running = true;
      await sleep(1000); // wait til miner is on

      return true;
    } catch (e) {
      trackError(e, this.toJSON());
      this.handleTermination(e, undefined, true);

      return false;
    }
  }

  async stop(): Promise<boolean> {
    if (!this.running) {
      return true;
    }

    this.emit({ running: false });

    this.willQuit = true;
    this.daemon!.kill('SIGTERM'); // shutdown a process gratefully
    this.running = false;
    this.daemon = undefined;

    await sleep(1000);
    return true;
  }

  async reload() {
    await this.stop();
    await this.start();
  }

  async toJSON() {
    return {
      name: this.workerName,
      usesHardware: GpuCryptonight.usesHardware,
      running: this.running,
      requiredModules: GpuCryptonight.requiredModules,
      usesAccount: GpuCryptonight.usesAccount,
      options: this.getCustomParameters(),
      parameters: this.parameters,
      daemonPort: this.daemonPort,
      menu: this.getMenuItems(),
      displayName: GpuCryptonight.displayName,
    };
  }
}
