import { toJS } from 'mobx';
import { PoolResolver } from './poolResolver';

describe('tests', () => {
  it('pool resolves', async () => {
    const poolResolver = new PoolResolver();

    await poolResolver.resolve();

    console.log(toJS(poolResolver.display));
  });
});
