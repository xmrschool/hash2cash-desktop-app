import { defineMessages } from 'react-intl';
import { Context, ExpectedReturn } from './reloader';
import tips from '../tips';
import { intl } from '../../renderer/intl';

const messages = defineMessages({
  collecting: {
    id: 'core.reload.tips.collecting',
    defaultMessage: 'Collecting tips...',
  },
});

export default async function checkTips(ctx: Context): Promise<ExpectedReturn> {
  ctx.setStatus(intl.formatMessage(messages.collecting));
  await tips.findTips();

  return {};
}
