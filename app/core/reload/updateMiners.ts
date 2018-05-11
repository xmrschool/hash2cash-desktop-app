import * as path from 'path';
import { Context, ExpectedReturn } from './reloader';
import { default as Api, Downloadable } from '../../renderer/api/Api';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import minerApi from '../../renderer/api/MinerApi';
import FileDownloaderAlone from '../../renderer/utils/FileDownloaderAlone';
import { sleep } from '../../renderer/utils/sleep';
const config = require('../../config.js');

export default async function updateMiners(
  ctx: Context
): Promise<ExpectedReturn> {
  ctx.setStatus('Checking if miners need to be updated...');

  const manifest = await Api.mining.manifest(ctx.state.collectedReport);
  const oldManifest = LocalStorage.manifest;

  if ((manifest as any).errors! || !manifest.success)
    throw new Error((manifest as any).errors[0]);

  const failed: string[] = [];
  let uptoDate = true;

  for (const downloadable of manifest.downloadable) {
    const local = oldManifest!.downloadable.find(
      d => d.name === downloadable.name
    );

    if (!local || local.md5 !== downloadable.md5) {
      uptoDate = false;
      ctx.setStatus(
        `New version of miner ${downloadable.name} (${
          local ? local.version : ''
        } → ${downloadable.version})`
      );
      // We stop workers which using that miner, because on Windows we can't replace file otherwise
      const runningWorkers = minerApi.workers.filter(
        d => d.data.requiredModules!.includes(downloadable.tag) && d.running
      );
      for (const worker of runningWorkers) {
        await worker.stop();
      }

      const downloader = new FileDownloaderAlone(downloadable);

      downloader.on('progress', stats => {
        const { downloaded, totalSize } = stats;

        ctx.setStatusWithoutAnimation(
          `New version of miner ${downloadable.name} (${
            local ? local.version : ''
          } → ${downloadable.version}) @ ${Math.round(
            downloaded / totalSize * 100
          )}%`
        );
      });

      try {
        await downloader.fetch();
      } catch (e) {
        ctx.setStatusWithoutAnimation(
          `Failed to download miner ${downloadable.name}, rolling back`
        );
        failed.push(downloadable.tag);

        await sleep(500);
      }
    }
  }

  const outerManifest = manifest.downloadable
    .map(d => {
      if (failed.includes(d.tag)) {
        return oldManifest!.downloadable.find(o => o.tag === o.tag);
      }

      return d;
    })
    .filter(d => typeof d !== 'undefined') as Downloadable[];
  LocalStorage.manifest = {
    success: true,
    downloadable: outerManifest,
  };
  // fs-extra is heavy and taking so many time to load it
  await require('fs-extra').outputFile(
    path.join(config.MINERS_PATH, 'manifest.json'),
    JSON.stringify(outerManifest)
  );

  if (uptoDate) {
    ctx.setStatus('Everything is up-to-date!');
    await sleep(1000);
  } else {
    await minerApi.getWorkers(true);
    ctx.refreshTrigger();
  }
  return {};
}
