// A backend for starting / ending / fetching stats of miner
import * as Koa from 'koa';
import * as Router from 'koa-router';
import { ipcRenderer, remote } from 'electron';
import { getPort } from '../../shared/utils';
import {
  getManifest,
  getWorkers,
  RuntimeError,
  updateWorkersInCache,
} from './utils';
import writeLog from './eventLog';
import workersCache from './workersCache';

updateWorkersInCache();
const koa = new Koa();
const router = new Router();

koa.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    ctx.body = e;
  }
});
router.get('/manifest', async ctx => {
  ctx.body = await getManifest();
});

router.get('/set/userId', async ctx => {
  if (!ctx.query.id) {
    ctx.body = {
      success: false,
      message: 'ID is not specified (ctx.query.id)',
    };
    return;
  }

  localStorage.userId = ctx.query.id;

  ctx.body = {
    status: 'success',
    message: 'userId successfully set! restart all miners to apply changes',
  };
});

router.get('/workers', async ctx => {
  const cacheShouldBeUpdated = ctx.query.updateCache === true;
  const asArray = ctx.query.asArray;

  const obj: any = asArray ? [] : {};

  for (const [key, worker] of await getWorkers(cacheShouldBeUpdated)) {
    if (asArray) obj.push(await worker.toJSON());
    else obj[key] = await worker.toJSON();
  }

  ctx.body = obj;
});

router.get('/workers/:action(start|stop|reload)', async ctx => {
  const reloaded = [];
  for (const [key, worker] of await getWorkers()) {
    try {
      if (worker.running) {
        await worker[ctx.params.action as 'start' | 'stop' | 'reload']();
        reloaded.push(worker.workerName);
      }
    } catch (e) {
      writeLog(
        'error',
        'workers.restart',
        'Failed to apply action to worker: ',
        {
          error: e,
          key,
        }
      );
    }
  }

  ctx.body = { success: true, reloaded };
});

router.get('/workers/:id/:action(start|stop|reload)', async ctx => {
  const {
    id,
    action,
  }: { id: string; action: 'start' | 'stop' | 'reload' } = ctx.params;
  try {
    const worker = workersCache.get(id);

    if (!worker) {
      ctx.body = { success: false, error: 'Worker not found' };

      return;
    }

    if (action === 'start' && worker.running) {
      ctx.body = { success: false, error: 'Worker already running' };

      return;
    }

    if (action === 'stop' && !worker.running) {
      ctx.body = {
        success: false,
        error: "Worker not runned, so you can't stop it",
      };

      return;
    }

    await worker[action]();
    ctx.body = { success: true, message: 'Action performed' };
  } catch (e) {
    console.error(e);
    throw new RuntimeError("Can't perform action", e);
  }
});

router.get('/workers/:id/setCustomParameter', async ctx => {
  const { id } = ctx.params;
  try {
    const worker = workersCache.get(id);

    if (!ctx.query.id || !ctx.query.value) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Invalid request' };

      return;
    }

    if (!worker) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Worker not found' };

      return;
    }
    await worker.setCustomParameter(ctx.query.id, ctx.query.value);
    ctx.body = { success: true };
  } catch (e) {
    throw e;
  }
});
router.get('/workers/:id/:action(getStats|getSpeed)', async ctx => {
  const {
    id,
    action,
  }: { id: string; action: 'getStats' | 'getSpeed' } = ctx.params;
  try {
    const worker = workersCache.get(id);

    if (!worker) {
      ctx.body = { success: false, error: 'Worker not found' };

      return;
    }

    ctx.body = await worker[action]();
  } catch (e) {
    throw e;
  }
});

router.get('/workers/:id', async ctx => {
  const { id }: { id: string } = ctx.params;
  try {
    const worker = workersCache.get(id);

    if (!worker) {
      ctx.body = { success: false, error: 'Worker not found' };

      return;
    }

    ctx.body = await worker.toJSON();
  } catch (e) {
    throw e;
  }
});

koa.use(router.routes());

ipcRenderer.on('quit', async () => {
  console.log('quit() received, so shutting down...');
  for (const [_, worker] of await getWorkers()) {
    if (worker.running) {
      // We check if worker running and close without commiting
      await worker.stop(false);
    }
  }

  console.log('all workers are stopped, so close an app');
  remote.getCurrentWindow().destroy();
});

getPort(8024).then(port => {
  koa.listen(port as any, 'localhost', 34, () => {
    ipcRenderer.send('miner-server-port', port);
    console.log(`Successfully listening on ${port} port`);
  });
});
