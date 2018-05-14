import { exec, ExecOptions } from 'child_process';
import * as path from 'path';

export function params(options: any, callback: any) {
  callback = callback || function() {};
  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof options !== 'object') {
    throw 'Invalid options parameter.';
  }
  return { options: options, callback: callback };
}

export function getWindowsUtils() {
  if (__DEV__) {
    return path.join(__dirname, '../../', 'windows-utils');
  }

  return path.join(process.resourcesPath!, '../windows-utils');
}
export default function elevate(
  cmd: string,
  options?: ExecOptions,
  callback?: (error: Error | null, stdout: Buffer, stderr: Buffer) => void
) {
  const p = params(options, callback);
  const command =
    '"' + path.join(getWindowsUtils(), 'elevate.cmd') + '" ' + cmd;
  console.log('Elevating command..', command);
  return exec(command, p.options, p.callback);
}
