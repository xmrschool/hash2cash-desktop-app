import { ipcRenderer } from 'electron';
import workersCache from './workersCache';
import { getWorkers } from './utils';

let lastState: null | string[] = null;
let locked = false;

export async function anyRunning() {
  for (const [, worker] of await getWorkers(false)) {
    if (worker.running) {
      return true;
    }
  }

  return false;
}

export async function findRunning() {
  const running = [];

  for (const [key, worker] of await getWorkers(false)) {
    if (worker.running) {
      running.push(key);
    }
  }

  return running;
}

export async function restoreState() {
  if (lastState) lastState.forEach(key => workersCache.get(key)!.start());
}

export function getSavedWorkers() {
  const workers = [];

  if (localStorage.active_cpu) {
    const possibleWorker = workersCache.get(localStorage.active_cpu);

    if (possibleWorker) workers.push(possibleWorker);
  }

  if (localStorage.active_gpu) {
    const possibleWorker = workersCache.get(localStorage.active_gpu);

    if (possibleWorker) workers.push(possibleWorker);
  }

  return workers;
}

ipcRenderer.on('toggleState', async () => {
  if (locked) {
    console.log('Ignoring hotkey...');

    return;
  }

  locked = true;
  try {
    const running = await findRunning();

    if (running.length > 0) {
      console.log('Some miners are already running, shutting down...', running);
      lastState = running;

      new Notification('Майнинг запущен', {
        body: `Запущены майнеры ${running.join(', ')}`,
      });

      running.forEach(k => workersCache.get(k)!.stop());
    } else {
       if (lastState && lastState.length > 0) {
        console.log('Restoring miner state: ', lastState);
        await restoreState();
      } else {
        await getSavedWorkers().map(worker => worker.start());
      }

      new Notification('Майнинг остановлен', {
        body: `Нажмите Ctrl+Shift+M, чтобы запустить его обратно.`,
      });
    }
  } catch (e) {
    console.error('Failed to toggle state: ', e);
  }

  locked = false;
});
