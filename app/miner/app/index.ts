// A backend for starting / ending / fetching stats of miner
import * as Koa from 'koa';
import * as Shell from 'node-powershell';
import * as Router from 'koa-router';
import { ipcRenderer, remote } from 'electron';
import { createServer } from 'http';
import { getPort } from '../../core/utils';
import {
  getManifest,
  getWorkers,
  RuntimeError,
  updateWorkersInCache,
  wrapError,
} from './utils';
import workersCache from './workersCache';
import socket from './socket';
import { sleep } from '../../renderer/utils/sleep';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import '../../core/raven';
import { clearPids, getRunningPids } from './RunningPids';

const logger = require('debug')('app:miner:server');
const koa = new Koa();
const router = new Router();

koa.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    if (e instanceof RuntimeError) {
      ctx.body = e;
    } else {
      ctx.body = {
        error: {
          kind: typeof e,
          message: e.message,
          stack: e.stack,
        },
      };
    }
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

  LocalStorage.userId = ctx.query.id;

  ctx.body = {
    status: 'success',
    message: 'userId successfully set! restart all miners to apply changes',
  };
});

router.get('/workers', async ctx => {
  const cacheShouldBeUpdated = ctx.query.updateCache === 'true';
  const asArray = ctx.query.asArray;

  logger('Does cache gonna be updated? %s', cacheShouldBeUpdated);

  const obj: any = asArray ? [] : {};

  for (const [key, worker] of await getWorkers(cacheShouldBeUpdated)) {
    if (asArray) obj.push(await worker.toJSON());
    else obj[key] = await worker.toJSON();
  }

  ctx.body = obj;
});

router.get('/workers/:action(start|stop|reload)', async ctx => {
  const reloaded = [];
  const mustCommit = !ctx.query.dontCommit;

  for (const [, worker] of await getWorkers()) {
    try {
      if (worker.running) {
        await worker[ctx.params.action as 'start' | 'stop' | 'reload']();
        if (mustCommit) worker.commit();
        reloaded.push(worker.workerName);
      }
    } catch (e) {
      logger('Failed to apply action %s for worker\n%O', ctx.params.action, e);
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
    const mustCommit = !ctx.query.dontCommit;
    const worker = workersCache.get(id);

    if (!worker) {
      wrapError(ctx, 'Worker not found');

      return;
    }

    // Just prevent error.
    /*if (action === 'start' && worker.running) {
      wrapError(ctx, 'Worker already running');

      return;
    }*/

    if (action === 'stop' && !worker.running) {
      wrapError(ctx, 'Worker not running, so you cant stop it');

      return;
    }

    await worker[action]();
    if (mustCommit) worker.commit();
    ctx.body = { success: true, message: 'Action performed' };
  } catch (e) {
    logger(e);
    throw new RuntimeError("Can't perform action", e);
  }
});

router.get('/workers/:id/func/:func', async ctx => {
  const { id, func } = ctx.params;
  const { value } = ctx.query;

  try {
    const worker = workersCache.get(id);

    if (!worker) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Worker not found' };

      return;
    }
    ctx.body = await worker.callFunction(
      func,
      typeof value !== 'undefined' ? value === 'true' : undefined
    );
  } catch (e) {
    throw e;
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
  server.close(); // Closing server here will help to shut down faster
  console.log('quit() received, so shutting down...');
  for (const [, worker] of await getWorkers()) {
    if (worker.running) {
      // We check if worker running and close without commiting
      await worker.stop();
    }
  }

  console.log('all workers are stopped, so close an app');
  remote.getCurrentWindow().destroy();
});

const server = createServer(koa.callback());
socket.attach(server);

let lastPort: number;
const ensureStillOn = (port: number) => {
  sleep(700).then(d => {
    if (lastPort === port) ipcRenderer.send('miner-server-port', port);
  });
};
// One more thing to ensure if port is free
const listen = (port: number) => {
  server.listen(port as any, 'localhost', 34);
  server.on('listening', () => {
    lastPort = port;
    ensureStillOn(port);
    logger('Listening on %d port', port);
  });

  server.on('error', err => {
    console.error('failed to listen: ', (err as any).code);
    listen(port + 1);
  });
};

async function killUnkilledProccesses() {
  if (localStorage.runningPids) {
    try {
      const pids = getRunningPids();

      pids.forEach((pid: number) => {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e) {
          console.warn(
            'Failed to terminate one of still runned pids: ',
            pid,
            e
          );
        }
      });
    } catch (e) {}

    clearPids();
  }
}

async function attemptToTerminateAllMiners() {
  let ps;
  try {
    const command = `
  $processes = @('hashtocash-cryptonight', 'xmrig', 'xmr-stak', 'jce', 'ccminer')    
  $processesRegex = [string]::Join('|', $processes) # create the regex
  $list = Get-Process | Where-Object { $_.ProcessName -match $processesRegex } | Where-Object { $_.Path.StartsWith("$env:APPDATA\\Hash to Cash") }
  ForEach ($pro in $list) {
    taskkill /pid $pro.ID /T /F
  }
  `;

    const ps = new Shell({
      noProfile: true,
    });

    await ps.addCommand(command);
    await ps.invoke().then(console.log);
    await ps.dispose();
  } catch (e) {
    if (ps) {
      (ps as any).dispose();
    }
  }
}

killUnkilledProccesses()
  .then(() => attemptToTerminateAllMiners())
  .then(() => updateWorkersInCache())
  .then(() =>
    getPort(8024).then(port => {
      listen(port);
    })
  );

(window as any).logger = logger;
