"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// A backend for starting / ending / fetching stats of miner
const Koa = require("koa");
const Router = require("koa-router");
const utils_1 = require("../../shared/utils");
const utils_2 = require("./utils");
const eventLog_1 = require("./eventLog");
const workersCache_1 = require("./workersCache");
const electron_1 = require("electron");
utils_2.updateWorkersInCache();
const koa = new Koa();
const router = new Router();
koa.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (e) {
        ctx.body = e;
    }
});
router.get('/manifest', async (ctx) => {
    ctx.body = await utils_2.getManifest();
});
router.get('/set/userId', async (ctx) => {
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
router.get('/workers', async (ctx) => {
    const cacheShouldBeUpdated = !!ctx.query.updateCache;
    const asArray = ctx.query.asArray;
    const obj = asArray ? [] : {};
    for (const [key, worker] of await utils_2.getWorkers(cacheShouldBeUpdated)) {
        if (asArray)
            obj.push(await worker.toJSON());
        else
            obj[key] = await worker.toJSON();
    }
    ctx.body = obj;
});
router.get('/workers/:action(start|stop|reload)', async (ctx) => {
    const reloaded = [];
    for (const [key, worker] of await utils_2.getWorkers()) {
        try {
            if (worker.running) {
                await worker[ctx.params.action]();
                reloaded.push(worker.workerName);
            }
        }
        catch (e) {
            eventLog_1.default('error', 'workers.restart', 'Failed to apply action to worker: ', {
                error: e,
                key,
            });
        }
    }
    ctx.body = { success: true, reloaded };
});
router.get('/workers/:id/:action(start|stop|reload)', async (ctx) => {
    const { id, action, } = ctx.params;
    try {
        const worker = workersCache_1.default.get(id);
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
        console.log('worker is: ', worker, worker[action], action);
        await worker[action]();
        ctx.body = { success: true, message: 'Action performed' };
    }
    catch (e) {
        console.error(e);
        throw new utils_2.RuntimeError("Can't perform action", e);
    }
});
router.get('/workers/:id/setCustomParameter', async (ctx) => {
    const { id } = ctx.params;
    try {
        const worker = workersCache_1.default.get(id);
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
        ctx.body = await worker.setCustomParameter(ctx.query.id, ctx.query.value);
    }
    catch (e) {
        throw e;
    }
});
router.get('/workers/:id/:action(getStats|getSpeed)', async (ctx) => {
    const { id, action, } = ctx.params;
    try {
        const worker = workersCache_1.default.get(id);
        if (!worker) {
            ctx.body = { success: false, error: 'Worker not found' };
            return;
        }
        ctx.body = await worker[action]();
    }
    catch (e) {
        throw e;
    }
});
router.get('/workers/:id', async (ctx) => {
    const { id } = ctx.params;
    try {
        const worker = workersCache_1.default.get(id);
        if (!worker) {
            ctx.body = { success: false, error: 'Worker not found' };
            return;
        }
        ctx.body = await worker.toJSON();
    }
    catch (e) {
        throw e;
    }
});
koa.use(router.routes());
utils_1.getPort(8000).then(port => {
    koa.listen(port, 'localhost', 34, () => {
        electron_1.ipcRenderer.send('miner-server-port', port);
        console.log(`Successfully listening on ${port} port`);
    });
});
//# sourceMappingURL=index.js.map