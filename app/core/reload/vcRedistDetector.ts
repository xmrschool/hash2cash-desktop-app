import * as Winreg from 'winreg';

const arch = require('os').arch();
const dep = arch === 'ia32' ? 'x86' : 'amd64';
const regKey = new Winreg({
  hive: Winreg.HKCR,
  // https://stackoverflow.com/a/34209692/5463706
  key: `\\Installer\\Dependencies\\,,${dep},14.0,bundle`,
});

const debug = require('debug')('app:vsdetector');

export const vcRedists = {
  x64:
    'https://download.visualstudio.microsoft.com/download/pr/11100230/15ccb3f02745c7b206ad10373cbca89b/VC_redist.x64.exe',
  ia32:
    'https://download.visualstudio.microsoft.com/download/pr/11100229/78c1e864d806e36f6035d80a0e80399e/VC_redist.x86.exe',
};

export function isOk() {
  return new Promise(resolve => {
    regKey.get('DisplayName', (err, item) => {
      if (err) {
        resolve(false);
        return;
      }

      const name = item.value;

      debug('Detected version: ', name);
      resolve(name.includes('2017'));
    });
  });
}

export function downloadAndInstall(speedReceiver: Function, outerPath: string) {
  return new Promise((resolve, reject) => {
    const fs = require('fs-extra');
    const request = require('request');
    const progress = require('request-progress');
    const child_process = require('child_process');

    const downloader = progress(
      request.get(vcRedists[(arch as 'x64') || 'ia32']),
      {
        throttle: 500,
      }
    );

    downloader.on('error', (err: any) => reject(err));
    downloader.on('progress', (stats: any) => {
      speedReceiver(stats);
    });
    downloader.on('end', async () => {
      // Execute through cmd (so, it will wait)
      const descriptor = child_process.spawn('cmd', [
        '/S',
        '/C',
        outerPath,
        '/install',
        '/norestart',
        '/passive',
      ]);

      descriptor.on('exit', async () => {
        const result = await isOk();

        result ? resolve(true) : reject('Failed to install VCRedist');
      });
    });

    downloader.pipe(fs.createWriteStream(outerPath));
  });
}
