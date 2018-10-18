(global as any).__DEV__ = true;

import extract from './extractPromise';

describe('7z', () => {
  it('extract', async () => {
    await extract('./xmr-stak-2.5.1-win64.7z', './testOutput');

    expect(true).toBe(true);
  });
});