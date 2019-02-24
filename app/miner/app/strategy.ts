import * as Shell from 'node-powershell';
import * as vm from 'vm';
import workersCache, { cacheAsObject } from './workersCache';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { sleep } from '../../renderer/utils/sleep';

const profitability = [
  'jceminer',
  'monerocryptonight',
  'XMRStak',
  'XmrigNvidia',
  'Bminer',
  'PhoenixMiner',
];

function getMiner(name: string) {
  const miners = cacheAsObject();

  Object.keys(miners).forEach(key => {
    miners[key.toLowerCase()] = miners[key];
  });

  console.log(
    'Miners are: ',
    miners,
    miners[name.toLowerCase()],
    name.toLowerCase()
  );

  return miners[name.toLowerCase()];
}

function mostProfitableMiner(type = 'gpu') {
  return profitability
    .reverse()
    .map(d => getMiner(d))
    .filter(d => !!d && d.usesHardware[0] === type)[0];
}

function getReport() {
  return LocalStorage.collectedReport;
}

async function startMiner(name: string) {
  try {
    await getMiner(name).start();

    return;
  } catch (e) {}
}

const cmd = `[PInvoke.Win32.UserInput]::IdleTime.TotalMilliseconds`;

export async function runStrategy(code: string) {
  const shell = new Shell({ debugMsg: true });

  await shell.addCommand(`Add-Type @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace PInvoke.Win32 {

    public static class UserInput {

        [DllImport("user32.dll", SetLastError=false)]
        private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        [StructLayout(LayoutKind.Sequential)]
        private struct LASTINPUTINFO {
            public uint cbSize;
            public int dwTime;
        }

        public static DateTime LastInput {
            get {
                DateTime bootTime = DateTime.UtcNow.AddMilliseconds(-Environment.TickCount);
                DateTime lastInput = bootTime.AddMilliseconds(LastInputTicks);
                return lastInput;
            }
        }

        public static TimeSpan IdleTime {
            get {
                return DateTime.UtcNow.Subtract(LastInput);
            }
        }

        public static int LastInputTicks {
            get {
                LASTINPUTINFO lii = new LASTINPUTINFO();
                lii.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
                GetLastInputInfo(ref lii);
                return lii.dwTime;
            }
        }
    }
}
'@
`);

  await shell.invoke();

  function runStrategyHandler(handler: Function) {
    let stopped = false;
    console.log('Running strategy handler', shell);
    new Promise(async resolve => {
      while (!stopped) {
        await shell.addCommand(cmd);
        const seconds = parseInt(await shell.invoke(), 10);

        handler({ idle: seconds });

        await sleep(1000);
      }

      resolve();
    });

    const _handler = {
      stop: () => {
        stopped = true;
      },
    };

    (window as any).currentStrategyHandler = _handler;
    return _handler;
  }
  const context: any = {
    runStrategyHandler,
    getReport,
    mostProfitableMiner,
    getMiner,
    sleep,
    startMiner,
    getMiners: () => Object.values(cacheAsObject()),
    profitability,
    workersCache,
    cores: require('os').cpus(),
    log: (...msg: any[]) => console.log(...msg),
  };

  Object.keys(context).forEach(key => {
    const originalHandler = context[key];

    if (typeof context[key] === 'function')
      context[key] = function(...params: any[]) {
        console.log('Running in context ', key, params);

        const resp = originalHandler(...params);

        if (resp && resp.catch) {
          return resp.catch((d: any) => console.warn(d));
        }

        return resp;
      }.bind(context[key]);
  });

  console.log('Creating context: ', context);

  vm.createContext(context);
  console.log('Running VM...');
  const handler = vm.runInContext(code, context);

  if (!handler || !handler.stop) {
    throw new Error('This context is corrupted');
  } else {
    return handler;
  }
}

export const defaultStrategy = `
// This strategy is using XMRig and XMRig nvidia.
// Idle is time in milliseconds since system was inactive.
// SET DEFAULT SETTINGS HERE
const xmrig = getMiner('monerocryptonight');
if (xmrig) {
  xmrig.setCustomParameter('priority', 0);
  xmrig.setCustomParameter('power', 100);
}


async function stopAll() {
  Promise.all(getMiners().map(miner => miner.stop()));
  
  await sleep(1000);
}

// We use lastState to keep last running state.
let lastState = null;

async function process({ idle }) {
  if (idle > 30000) {
    if (lastState === 'idle') {
      return;
    }
     
    lastState = 'idle';
    
    await stopAll();
    
    // DO SOMETHING WHEN OS IS NOT USED
    // It's idle time.
    // We can run at most performance
    // Run as much as we can.
    const miner = mostProfitableMiner('gpu');
    log('Running miner: ', miner.workerName);
    miner.applyUltimateSettings();
    
    await startMiner(miner.workerName);
    await startMiner('monerocryptonight');
  } else {
    log('state: ', lastState);
    // Don't reapply since it's already default.
    if (lastState === 'default') {
      return;
    }
    
    lastState = 'default';
    
    // DO SOMETHING WHEN OS IS BUSY
    await stopAll();
  
    
    // If miner has less than 2 cores, we stop xmrig. Probably don't want other miners to run either
    log('cores: ', cores, cores.length);
    if (cores.length >= 2) {
      await startMiner('monerocryptonight');
    }
    
    // We start XMRig Nvidia at minimal capacity
    const miner = getMiner('XmrigNvidia') || getMiner('XmrigAmd');
    
    // Use XMRigNvidia if possible. It's most suitable for in-work.
    if (miner) {
      const gpu = getReport().devices.find(d => d.type === 'gpu' && d.platform === 'cuda');
      const memory = gpu ? gpu.collectedInfo.memory : null;
      
      miner.setCustomParameter('power', memory > 3000 ? 'optimized' : 'superOptimized');
      await startMiner(miner.workerName);
    }
  }
}

// runStrategyHandler - is an initial point of your strategy. It runs handler as much as we need
runStrategyHandler(process, ['idle'])
`;

// @ts-ignore
window.defaultStrategy = defaultStrategy;
// @ts-ignore
window.runStrategy = runStrategy;
