import { readJson } from 'fs-extra';
import * as path from 'path';
import { difference } from 'lodash';
import workers from './workers';
import { Architecture, Downloadable } from '../../renderer/api/Api';
import workersCache, { WorkersCache } from './workersCache';
import { algorithmsDefaultDiff } from './constants/algorithms';
import { Algorithms } from './constants/algorithms';
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
      await value.init();
    }
  } catch (e) {
    if (e instanceof RuntimeError) throw e;
    throw new RuntimeError('Unexpected error', e);
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

export function getCollectedReport(): Promise<Architecture> {
  return JSON.parse(localStorage.collectedReport);
}

export function getLogin(algorithm: Algorithms): string {
  return `${localStorage.userId}+${getDifficulty(algorithm)}`;
}

export function getDifficulty(algorithm: Algorithms): number {
  try {
    const benchmark = JSON.parse(localStorage.benchmark).data;

    const find = benchmark.find((d: any) => d.name === algorithm);

    if (find && find.speed) {
      return find.speed * 30; // Time enough to submit shares each 30 seconds
    }
    throw new Error('Benchmark record doesnt exist');
  } catch (e) {
    const fallback = algorithmsDefaultDiff[algorithm];

    console.error(
      `Failed to get benchmark... Using ${fallback} as fallback`,
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
