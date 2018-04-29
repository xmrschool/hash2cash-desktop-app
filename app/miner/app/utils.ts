import { readJson } from 'fs-extra';
import * as path from 'path';
import { difference } from 'lodash';
import workers from './workers';
import { Downloadable } from '../../renderer/api/Api';
import workersCache, { WorkersCache } from './workersCache';
import {
  algorithmsDefaultDiff,
  algorithmsMaxDiff,
} from './constants/algorithms';
import { Algorithms } from './constants/algorithms';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
const logger = require('debug')('app:miner');

const config = require('../../config.js');
const debug = require('debug')('app:server:utils');

export class RuntimeError extends Error {
  originalError: Error;

  constructor(displayError: string, originalError: Error) {
    super(displayError);

    this.stack = new Error().stack;
    this.message = displayError;
    this.originalError = originalError;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        raw: this.originalError,
        stack: this.stack,
      },
    };
  }
}
export async function getManifest(): Promise<Downloadable[]> {
  try {
    debug(
      'Full path to manifest: %s',
      path.join(config.MINERS_PATH, 'manifest.json')
    );
    const content = await readJson(
      path.join(config.MINERS_PATH, 'manifest.json')
    );

    return content;
  } catch (e) {
    console.error(e);
    throw new RuntimeError('Manifest is unavailable. Try to reinit app', e);
  }
}

export async function updateWorkersInCache(): Promise<void> {
  try {
    const manifest = await getManifest();

    const outerWorkers = workers.filter(worker => {
      return (
        difference(worker.requiredModules, manifest.map(d => d.name)).length ===
        0
      );
    });

    outerWorkers.forEach(worker => {
      const instance = new worker();
      workersCache.set(instance.workerName, instance);
    });

    for (const [_, value] of workersCache) {
      value.init();
    }
  } catch (e) {
    console.warn('Cant init app: \n', e);
  }
}

export async function getWorkers(updateCache = false): Promise<WorkersCache> {
  if (updateCache || workersCache.size === 0) {
    for (const workerName in workersCache.keys()) {
      await workersCache.get(workerName)!.stop();
    }

    workersCache.clear();

    await updateWorkersInCache();
  }

  return workersCache;
}

export function getLogin(algorithm: Algorithms): string {
  const rigName = localStorage.rigName ? `.${localStorage.rigName}` : '';
  return `app/${LocalStorage.userId}${rigName}+${getDifficulty(algorithm)}`;
}

export function getDifficulty(algorithm: Algorithms): number {
  try {
    const benchmark = LocalStorage.benchmark!.data;

    const find = benchmark.find((d: any) => d.name === algorithm);

    if (find && find.speed) {
      const diff = find.speed * 15; // Time enough to submit shares each 15 seconds

      return Math.round(Math.min(algorithmsMaxDiff[algorithm], diff)); // if more than maximum allowed adjust to needed
    }
    throw new Error('Benchmark record doesnt exist');
  } catch (e) {
    const fallback = algorithmsDefaultDiff[algorithm];

    console.warn(
      `Failed to get difficulty of benchmark... Using ${fallback} as fallback`,
      e
    );
    return fallback;
  }
}

export function wrapError(ctx: any, err: string) {
  logger('[%s]: ', ctx.path, err);

  ctx.status = 400;
  ctx.body = { success: false, error: err };
}
