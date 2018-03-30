import * as path from 'path';
import * as fs from 'fs-extra';
import socket from '../socket';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';

const config = require('../../../config.js');

export type Pick = { name: any; value: any };

export type Parameter<P> = {
  id: P;
  name: any;
  values: Pick[];
};
export type ParameterMap<P extends string> = { [K in P]: any };

export type Mapping = { [algorithm: string]: string };
export type OuterJSON<P extends string> = {
  name: string;
  usesHardware?: string[];
  running?: boolean;
  // Difference between options and parameters is options just a picks from .getCustomParameters()
  options?: Parameter<P>[];
  usesAccount?: string;
  requiredModules?: string[];
  parameters?: ParameterMap<P>;
  daemonPort?: number;
};

export interface IWorker<P> {
  running: boolean;

  getCustomParameters(): Parameter<P>[];
  setCustomParameter(id: P, value: any): Promise<void>;

  start(): Promise<boolean>;
  stop(): Promise<boolean>;

  reload(): Promise<void>;
}

/**
 * Every worker must extend this class.
 * <P> is Enum allowed parameters
 *
 * @extends {EventEmitter}
 */
export abstract class BaseWorker<P extends string> implements IWorker<P> {
  static requiredModules: string[];
  static usesHardware: string[];
  static usesAccount: string;

  abstract get requiredModules(): string[];
  abstract get usesHardware(): string[];
  abstract get usesAccount(): string;

  // Full path to miner, sets using constructor
  abstract path: string;
  // Parameters which can be modified through API
  abstract parameters: ParameterMap<P>;
  // Is worker running?
  abstract running: boolean;
  // Daemon port of miner
  abstract daemonPort?: number;
  // Worker name (used as /workers/{workerName})
  abstract workerName: string;
  // To prevent handling error events
  abstract willQuit: boolean;

  abstract getCustomParameters(): Parameter<P>[];
  abstract setCustomParameter(id: P, value: any): Promise<void>;

  // Used to emit any state changes
  emit(value: any) {
    socket.emit('state', Object.assign({ name: this.workerName }, value));
  }

  pathTo(configName: string) {
    return path.join(this.path, configName);
  }

  // In case miner has been stopped unexpectedly
  handleTermination(data: any, isClose: boolean = false) {
    if (this.willQuit) return;

    const errorMessage = `Worker ${
      this.workerName
    } has been stopped with code ${data}`;

    if (data.code === 'ENOENT') {
      // If miner has been deleted we remove record that indicates if miner has been unpacked
      fs.remove(this.pathTo('unpacked'));
    }
    console.error(errorMessage);
    this.emit({
      running: false,
      _data: { grateful: isClose, message: errorMessage, raw: data },
    });

    this.running = false;
  }

  getValue(id: string, value: any): Pick {
    const findProperty = this.getCustomParameters().find(d => d.id === id);
    if (!findProperty) throw new Error("ID of this param doesn't exist");

    const findValue = findProperty.values.find(d => d.value == value);
    if (!findValue) throw new Error("Specified value doesn't exist");

    return findValue;
  }

  getPool(algorithm: string): string | null {
    try {
      const parsed = LocalStorage.appInfo!.pools;

      return parsed[algorithm].url || null;
    } catch (e) {
      console.error('Failed to get an pool URL: ', e);
      return null;
    }
  }

  /**
   * Function which fetch speed of mining
   * @returns {Promise<number>} [current hashrate, hashrate per minute, per hour]
   */
  abstract getSpeed(): Promise<(number | null)[]>;
  abstract getStats(): Promise<any>;

  abstract start(): Promise<boolean>;
  abstract stop(commit?: boolean): Promise<boolean>;

  async reload() {
    await this.stop();
    await this.start();
  }

  get workerKey() {
    return 'storage:' + this.workerName;
  }

  commit() {
    localStorage.setItem(
      this.workerKey,
      JSON.stringify({
        parameters: this.parameters,
        running: this.running,
      }),
    );
  }

  init() {
    try {
      this.path = path.join(config.MINERS_PATH, this.requiredModules[0]);
      const possibleJson = localStorage.getItem(this.workerKey);

      if (possibleJson) {
        const parsed = JSON.parse(possibleJson);

        if (parsed.parameters) {
          this.parameters = parsed.parameters;
        }

        if (parsed.running) {
          this.start();
        }
      }
    } catch (e) {
      console.error('Failed to initialize worker! ', e);
      // Rollback
      localStorage.removeItem(this.workerKey);
    }

    this.emit('inited');
  }

  updateCache() {
    const value = {
      parameters: this.parameters,
      running: this.running,
    };

    localStorage.setItem(this.workerKey, JSON.stringify(value));
  }

  abstract toJSON(): Promise<OuterJSON<P>>;
}
