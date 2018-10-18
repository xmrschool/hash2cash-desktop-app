import * as path from 'path';
import { extractFull7z } from './index';
import { getWindowsUtils } from '../windows/elevate';

export default function extract7z(
  pathToFile: string,
  output: string
): Promise<any> {
  return extractFull7z(pathToFile, output, {
    exePath: path.join(getWindowsUtils(), '7za.exe'),
  });
}

if (typeof window !== 'undefined') {
  (window as any).extract = extract7z;
}