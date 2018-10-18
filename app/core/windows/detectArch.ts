import * as fs from 'fs';
import * as path from 'path';

/**
 * On Windows, the most reliable way to detect a 64-bit OS from within a 32-bit
 * app is based on the presence of a WOW64 file: %SystemRoot%\SysNative.
 * See: https://twitter.com/feross/status/776949077208510464
 */
export default function detectNativeArch(): string | undefined {
  if (process.platform === 'win32') {
    let useEnv = false;
    try {
      useEnv = !!(
        process.env.SYSTEMROOT && fs.statSync(process.env.SYSTEMROOT)
      );
    } catch (err) {}

    const sysRoot = useEnv ? process.env.SYSTEMROOT! : 'C:\\Windows';

    // If %SystemRoot%\SysNative exists, we are in a WOW64 FS Redirected application.
    let isWOW64 = false;
    try {
      isWOW64 = !!fs.statSync(path.join(sysRoot, 'sysnative'));
    } catch (err) {}

    return isWOW64 ? 'x64' : 'x86';
  } else return undefined;
}

export function shouldSwitchToX64(): boolean {
  if (__WIN32__ === false) return false;

  if (process.arch === 'ia32') {
    const realArch = detectNativeArch();

    if (realArch === 'x64') {
      return true;
    }
  }

  return false;
}
