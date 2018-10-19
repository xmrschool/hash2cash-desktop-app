import { spawn } from 'child_process';
import * as path from 'path';
import { getWindowsUtils } from '../windows/elevate';

const debug = require('debug')('app:unarchiver');

export default function extract7z(
  pathToFile: string,
  output: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const exePath = path.join(getWindowsUtils(), '7za.exe');
      const runArgs = [
        'x',
        '-bsp1',
        pathToFile.replace(/\//g, '\\'),
        '-o' + output.replace(/\//g, '\\'),
        '-ssc',
        '-y',
      ];

      debug('Running %s with args %O', exePath, runArgs);
      const proc = spawn(exePath, runArgs, { stdio: 'pipe' });

      if (debug.enabled) {
        proc.stdout.on('data', data => debug(data.toString()));
      }

      proc.on('exit', code => {
        if (code === 0) {
          return resolve();
        }

        return reject(new Error('Failed to unpack archive because exit code doesn\'t match expected: ' + code));
      });
    } catch (e) {
      console.error('Caught error during unpacking: ', e);

      reject(e);
    }

  });
}

if (typeof window !== 'undefined') {
  (window as any).extract = extract7z;
}
