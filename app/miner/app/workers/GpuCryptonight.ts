import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { BaseWorker, Parameter, ParameterMap, Pick } from './BaseWorker';
import { getLogin, RuntimeError } from '../utils';
import { getPort } from '../../../core/utils';
import { _CudaDevice, Architecture } from '../../../renderer/api/Api';
import { sleep } from '../../../renderer/utils/sleep';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';

export type Parameteres = 'main' | 'additional';

export default class GpuCryptonight extends BaseWorker<Parameteres> {
  static requiredModules = ['cryptonight-xmrstak'];
  static usesHardware = ['gpu'];
  static usesAccount = 'XMR';

  willQuit: boolean = false;
  workerName: string = 'GpuCryptonight';

  path: string = '';
  parameters: ParameterMap<Parameteres> = {
    main: 'full',
    additional: 'full',
  };
  daemon?: ChildProcess;
  running: boolean = false;
  daemonPort?: number;

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
    "affine_to_cpu" : false, "sync_mode" : 3,
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
    const template = `
"pool_list" :
[
	{"pool_address" : ${s(this.getPool('cryptonight'))}, "wallet_address" : ${s(
      getLogin('GpuCryptonight')
    )}, "rig_id" : "oh_hello", "pool_password" : "", "use_nicehash" : true, "use_tls" : false, "tls_fingerprint" : "", "pool_weight" : 1 },
],
"currency" : "monero",
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
    this.daemonPort = await getPort(25001);

    return this.daemonPort;
  }

  async getStats(): Promise<any> {
    try {
      if (!this.running) {
        throw new Error('Worker is not running');
      }
      const resp = await fetch(`http://127.0.0.1:${this.daemonPort}/api.json`);

      return await resp.json();
    } catch (e) {
      console.error('Failed to get stats', e);
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

    const isPathExists = await fs.pathExists(this.pathTo('config.txt'));

    console.log('is path exists: ', isPathExists, this.pathTo('config.txt'));
    // If no config exists, build it
    if (!isPathExists) {
      await this.buildConfigs();
    }

    this.willQuit = false;

    this.daemon = spawn(
      path.join(this.path, this.executableName),
      ['-i', (await this.getDaemonPort()).toString()],
      {
        cwd: this.path,
      }
    );

    this.emit({ running: true });

    this.daemon.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });

    this.daemon.on('close', err => this.handleTermination(err, true));
    this.daemon.on('error', err => this.handleTermination(err));

    this.running = true;
    await sleep(1000); // wait til miner is on

    return true;
  }

  async stop(): Promise<boolean> {
    if (!this.running) throw new Error('Miner not running');

    this.emit({ running: false });

    this.willQuit = true;
    this.daemon!.kill('SIGTERM'); // shutdown a process gratefully
    this.running = false;

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
    };
  }
}
