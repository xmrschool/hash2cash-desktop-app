import * as path from 'path';
import { remote } from 'electron';
import * as fs from 'fs-extra';
import socket from '../socket';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';
import { shiftRunningPid } from '../RunningPids';
import trackError from '../../../core/raven';

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
  menu: MenuPicks;
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

  preserveConfig: boolean = false;

  abstract get requiredModules(): string[];
  abstract get usesHardware(): string[];
  abstract get usesAccount(): string;

  // A state. To store params, probably.
  abstract state: { [key: string]: any };
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
  // A process number, which we use to kill proccess in case they unterminated
  abstract pid?: number;

  abstract getCustomParameters(): Parameter<P>[];
  abstract setCustomParameter(id: P, value: any): Promise<void>;

  abstract getMenuItems(): MenuPicks;

  openInExplorer(): MenuPick {
    return {
      id: 'explorer',
      type: 'function',
      localizedName: 'miner.workers.openInShell',
      onCalled: async () => {
        console.log('Opening up explorer:');
        remote.shell.openExternal(this.path);

        return true;
      },
    };
  }

  togglesState(id: string, localizedName: string): MenuPick {
    return {
      id,
      type: 'pick',
      localizedName,
      isPicked: this.state[id],
      onChanged: async newValue => {
        this.state[id] = newValue;

        return true;
      },
    }
  }
  untouchedConfig(): MenuPick {
    return {
      id: 'config',
      type: 'pick',
      localizedName: 'miner.workers.preserveConfig',
      isPicked: this.preserveConfig,
      onChanged: async newValue => {
        if (newValue === false) {
          await fs.remove(this.pathTo('preserve.txt'));
        } else {
          await fs.createFile(this.pathTo('preserve.txt'));
        }
        this.preserveConfig = newValue;

        return true;
      },
    };
  }

  // Used to emit any state changes
  emit(value: any) {
    socket.emit('state', Object.assign({ name: this.workerName }, value));
  }

  pathTo(configName: string) {
    return path.join(this.path, configName);
  }

  // In case miner has been stopped unexpectedly
  handleTermination(data: any, isClose: boolean = false) {
    if (this.pid) {
      shiftRunningPid(this.pid);
    }
    if (this.willQuit) return;

    const errorMessage = `Worker ${this.workerName} crashed with code ${data}`;

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

  // Call a pick or trigger. Value not required when called on function. Returns a boolean, which indicates if function has been called or new value, if it was pick.
  async callFunction(
    id: string,
    value?: boolean
  ): Promise<FunctionCallerResult> {
    try {
      const items = this.getMenuItems();

      const find = items.find(d => d.id === id);

      if (!find || find.type === 'delimiter') {
        return { success: false, error: 'Specified function id not found' };
      }

      if (find.type === 'pick') {
        if (typeof value === 'undefined') {
          return { success: false, error: 'value is required' };
        }

        const result = await find.onChanged(value);

        return {
          success: true,
          newValue: result,
        };
      } else {
        await find.onCalled();

        return { success: true };
      }
    } catch (e) {
      trackError(e, { func: id, value });

      return { success: false, error: e.message };
    }
  }

  getValue(id: string, value: any): Pick {
    const findProperty = this.getCustomParameters().find(d => d.id === id);
    if (!findProperty) throw new Error("ID of this param doesn't exist");

    // ToDo we should use ===, but first we need use same types
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
  abstract stop(): Promise<boolean>;

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
        state: this.state,
      })
    );
  }

  async init() {
    try {
      this.path = path.join(config.MINERS_PATH, this.requiredModules[0]);
      const possibleJson = localStorage.getItem(this.workerKey);

      if (possibleJson) {
        const parsed = JSON.parse(possibleJson);

        if (parsed.parameters) {
          this.parameters = parsed.parameters;
        }

        if (parsed.state) {
          this.state = parsed.state;
        }

        if (parsed.running) {
          this.start();
        }
      }

      const isPathExists = await fs.pathExists(this.pathTo('preserve.txt'));

      this.preserveConfig = isPathExists;
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

export type MenuPicksPick = {
  id: string;
  type: 'pick';
  localizedName: string;
  isPicked: boolean;
  onChanged: (newValue: boolean) => Promise<boolean>;
};

export type Delimiter = {
  id: string;
  type: 'delimiter';
};

export type MenuPicksFunc = {
  id: string;
  type: 'function';
  localizedName: string;
  onCalled: () => Promise<boolean>;
};

export type MenuPick = MenuPicksFunc | MenuPicksPick | Delimiter;
export type MenuPicks = MenuPick[];

export type FunctionCallerResult = {
  success: boolean;
  newValue?: boolean;
  error?: string;
};
