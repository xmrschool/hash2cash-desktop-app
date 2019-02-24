import { BaseWorker } from './workers/BaseWorker';

export type WorkersCache = Map<string, BaseWorker<any>>;

const workersCache = new Map<string, BaseWorker<any>>();

export function cacheAsObject(): { [key: string]: BaseWorker<any> } {
  const baseObject: any = {};

  workersCache.forEach((value, key) => {
    baseObject[key] = value;
  });

  return baseObject;
}

export default workersCache;
