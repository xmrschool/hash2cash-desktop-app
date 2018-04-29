import { isEqual } from 'lodash';

import { Context, ExpectedReturn } from './reloader';
import collectHardware from '../hardware/collector';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { sleep } from '../../renderer/utils/sleep';

export default async function collectDevices(
  ctx: Context
): Promise<ExpectedReturn> {
  ctx.setStatus('Collecting devices...');

  await sleep(1000);
  const oldHardware = LocalStorage.collectedReport!;
  const prblyNewHardware = await collectHardware();

  ctx.state.collectedReport = prblyNewHardware;
  ctx.state.wasHardwareChanged = !isEqual(
    prblyNewHardware.devices,
    oldHardware.devices
  );

  LocalStorage.collectedReport = prblyNewHardware;
  return {};
}
