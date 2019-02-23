import { Architecture } from '../../renderer/api/Api';
import fallback from './collectorFallback';
import trackError from '../raven';

export default async function collectHardware(): Promise<Architecture> {
  if (__WIN32__) {
    try {
      return await require('./collector.windows').default();
    } catch (e) {
      console.error('Failed to get devices using windows collector: ', e);
      trackError(e);

      return await fallback();
    }
  }

  return await fallback();
}
