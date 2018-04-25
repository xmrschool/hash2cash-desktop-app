import checkAppUpdates from "./checkAppUpdate";

export type Context = {
  setStatus: Function;
  setStatusWithoutAnimation: Function;
  state: any;
}

export type ExpectedReturn = {
  skipped?: boolean;
  dontContinue?: boolean;
  blockUpdater?: boolean;
}

const updaters = [checkAppUpdates];

// Returns if reloader should be called anymore
export default async function start(ctx: Context): Promise<boolean> {
  for (const updater of updaters) {
    const result = await updater(ctx);

    if (result.dontContinue) return typeof result.blockUpdater === 'undefined';
  }

  return true;
}