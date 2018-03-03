import cudaDeviceQuery from '../cudaDeviceQuery';

describe('cudaDeviceQuery', () => {
  it('return something', async () => {
    const result = await cudaDeviceQuery();

    console.log('result is: ', result);
    return expect(result).toBeDefined();
  })
})