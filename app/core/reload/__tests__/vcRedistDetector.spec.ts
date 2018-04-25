import { isOk, downloadAndInstall } from "../vcRedistDetector";
import * as path from "path";
import * as fs from "fs-extra";

const outerPath = path.join(__dirname, 'temp', 'vcredist.exe');
const isWin = process.platform === "win32";
const run = isWin ? test : test.skip;

jest.setTimeout(15000);
// This test can only be runned on Windows. It's recommend to uninstall VCRedist 2017 before doing this test.
describe('vcRedistDetector', () => {
  beforeAll(async () => {
    await fs.mkdir(path.join(__dirname, 'temp')).catch(d => {});
  });

  afterAll(async () => {
    await fs.remove(path.join(__dirname, 'temp')).catch(d => {});
  });

  run('isOk', () => {
    expect(isOk()).resolves;
  });

  run('downloading, installing and streaming speed', async () => {
    const receiver = (stats: any) => {
      expect(stats.percent).toBeGreaterThanOrEqual(0);
      expect(stats.size.total).toBeGreaterThanOrEqual(0);
    };

    const promise = downloadAndInstall(receiver, outerPath);
    expect(promise).resolves;
    const result = await promise;
    expect(result).toBe(true);
  });
});