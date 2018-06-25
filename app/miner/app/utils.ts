import { readJson } from 'fs-extra';
import * as path from 'path';
import { difference } from 'lodash';
import workers from './workers';
import { Downloadable } from '../../renderer/api/Api';
import workersCache, { WorkersCache } from './workersCache';
import { algorithmsMaxDiff } from './constants/algorithms';
import { Algorithms } from './constants/algorithms';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import trackError from '../../core/raven';
const logger = require('debug')('app:miner');

const config = require('../../config.js');
const debug = require('debug')('app:server:utils');

export class RuntimeError extends Error {
  originalError: Error;
  originalMessage: string;

  constructor(
    displayError: string,
    originalError: Error,
    trackable: boolean = true
  ) {
    super(displayError);

    this.stack = new Error().stack;
    this.originalMessage =
      originalError && originalError.message ? originalError.message : '';
    this.message = `${displayError} : ${this.originalMessage}`;
    this.originalError = originalError;

    if (trackable) {
      trackError(originalError, { extra: displayError });
    }
  }

  toJSON() {
    return {
      error: {
        kind: 'RuntimeError',
        message: this.message,
        raw: this.originalError,
        stack: this.stack,
        originalMessage: this.originalMessage,
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
    console.warn('Failed to get manifest: \n', e);
    throw new RuntimeError(
      'Manifest is unavailable. Try to reinit app',
      e,
      false
    );
  }
}

export async function updateWorkersInCache(): Promise<void> {
  try {
    const manifest = await getManifest();
    const forceIncludedMiners = localStorage.forceIncludedMiners
      ? localStorage.forceIncludedMiners.split(',')
      : [];

    const outerWorkers = workers.filter(worker => {
      return (
        difference(worker.requiredModules, manifest.map(d => d.name)).length ===
          0 || forceIncludedMiners.includes(worker.name)
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

export function getLogin(
  algorithm: Algorithms,
  dynamicDifficulty: boolean = false
): string {
  let postfix = '-cpu';

  if (algorithm === 'GpuCryptonight') {
    postfix = '-gpu';
  }
  const rigName = localStorage.rigName
    ? `.${localStorage.rigName}${postfix}`
    : '';
  const diff = getDifficulty(algorithm);

  return `app/${LocalStorage.userId}${rigName}${
    diff && !dynamicDifficulty ? `+${diff}` : ''
  }`;
}

export function getDifficulty(algorithm: Algorithms): number | null {
  try {
    const benchmark = LocalStorage.benchmark!.data;

    const find = benchmark.find((d: any) => d.name === algorithm);

    if (find && find.speed) {
      const diff = find.speed * 15; // Time enough to submit shares each 15 seconds

      return Math.round(Math.min(algorithmsMaxDiff[algorithm], diff)); // if more than maximum allowed adjust to needed
    }
    throw new Error('Benchmark record doesnt exist');
  } catch (e) {
    return null;
  }
}

export function wrapError(ctx: any, err: string) {
  logger('[%s]: ', ctx.path, err);

  ctx.status = 400;
  ctx.body = { success: false, error: err };
}
