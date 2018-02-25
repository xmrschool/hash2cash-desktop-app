import { BaseWorker } from './workers/BaseWorker';

export type WorkersCache = Map<string, BaseWorker<any>>;
const workersCache = new Map<string, BaseWorker<any>>();

export default workersCache;
