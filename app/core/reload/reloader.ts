import checkAppUpdates from './checkAppUpdate';
import collectDevices from './collectDevices';
import updateMiners from './updateMiners';

export type Context = {
  setStatus: Function;
  setStatusWithoutAnimation: Function;
  state: any;
  refreshTrigger: () => void;
};

export type ExpectedReturn = {
  skipped?: boolean;
  dontContinue?: boolean;
  blockUpdater?: boolean;
};

const updaters = [checkAppUpdates, collectDevices, updateMiners];

// Returns if reloader should be called anymore
export default async function startReload(ctx: Context): Promise<boolean> {
  for (const updater of updaters) {
    try {
      const result = await updater(ctx);

      if (result.dontContinue)
        return typeof result.blockUpdater === 'undefined';
    } catch (e) {
      console.error('Failed to produce step ' + updater.name + ' due to', e);
    }
  }

  return true;
}
