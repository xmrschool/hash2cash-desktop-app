import { isEqual } from 'lodash';

import { Context, ExpectedReturn } from "./reloader";
import collectHardware from "../hardware/collector";
import { LocalStorage } from "../../renderer/utils/LocalStorage";

export default async function checkAppUpdates(ctx: Context): Promise<ExpectedReturn> {
  ctx.setStatus('Collecting devices...');

  const oldHardware = LocalStorage.collectedReport!;
  const prblyNewHardware = await collectHardware();

  ctx.state.collectedReport = prblyNewHardware;
  ctx.state.wasHardwareChanged = !isEqual(prblyNewHardware.devices, oldHardware.devices);

  return {};
}