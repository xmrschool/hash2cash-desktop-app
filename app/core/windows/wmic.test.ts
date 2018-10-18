import getMergedGpus from './wmic';

describe('wmic', () => {
  it('can detect devices', async () => {
    const devices = await getMergedGpus();

    console.log('devices: ', devices);
    expect(devices.length).toBeGreaterThan(0);
  })
})