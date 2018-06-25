process.env.DEBUG = 'app*';
import AntivirusState from '../AntivirusState';

jest.setTimeout(15000);
// This test can only be runned on Windows. It's recommend to uninstall VCRedist 2017 before doing this test.
describe('AntivirusState', () => {
  it('detects', async () => {
    const result = await AntivirusState.check();

    console.log(JSON.stringify(AntivirusState));
    expect(result).toBe(true);
    expect(AntivirusState.haveAny).toBe(true);
  });

  it('detects whitelists', async () => {
    await AntivirusState.check();

    expect(AntivirusState.checkIfWhitelisted()).resolves;
  });

  it('adds to exception', async () => {
    expect(AntivirusState.addToExceptions()).resolves;
  })
});
