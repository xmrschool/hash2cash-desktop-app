import { isEqual } from 'lodash';
import { defineMessages } from 'react-intl';

import { Context, ExpectedReturn } from './reloader';
import collectHardware from '../hardware/collector';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { sleep } from '../../renderer/utils/sleep';
import { intl } from '../../renderer/intl';

const messages = defineMessages({
  collecting: {
    id: 'core.reload.devices.collecting',
    defaultMessage: 'Collecting devices...',
  },
});

export default async function collectDevices(
  ctx: Context
): Promise<ExpectedReturn> {
  ctx.setStatus(intl.formatMessage(messages.collecting));

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
