import * as path from 'path';
import * as fs from 'fs-extra';
import { defineMessages } from 'react-intl';
import { Context, ExpectedReturn } from './reloader';
import { default as Api, Downloadable } from '../../renderer/api/Api';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import minerApi from '../../renderer/api/MinerApi';
import FileDownloaderAlone from '../../renderer/utils/FileDownloaderAlone';
import { sleep } from '../../renderer/utils/sleep';
import { intl } from '../../renderer/intl';
const config = require('../../config.js');

const messages = defineMessages({
  collecting: {
    id: 'core.reload.minerUpdater.checking',
    defaultMessage: 'Checking for available miner updates...',
  },
  newVersion: {
    id: 'core.reload.minerUpdater.newVersion',
    defaultMessage:
      'New version of {name} available {oldVersion} → {newVersion}',
  },
  failed: {
    id: 'core.reload.minerUpdater.failed',
    defaultMessage: 'Failed to download miner {name}, rolling back',
  },
  upToDate: {
    id: 'core.reload.minerUpdater.uptodate',
    defaultMessage: 'Everything is up-to-date!',
  },
});

export default async function updateMiners(
  ctx: Context
): Promise<ExpectedReturn> {
  ctx.setStatus(intl.formatMessage(messages.collecting));

  const manifest = await Api.mining.manifest(ctx.state.collectedReport);
  const oldManifest = LocalStorage.manifest;

  if ((manifest as any).errors! || !manifest.success)
    throw new Error((manifest as any).errors[0]);

  LocalStorage.manifest = manifest;

  const failed: string[] = [];
  let uptoDate = true;

  for (const downloadable of manifest.downloadable) {
    const local = oldManifest!.downloadable.find(
      d => d.name === downloadable.name
    );

    const outputDir = await FileDownloaderAlone.getDirectory(downloadable);
    const unpackedExists = await (fs.exists as any)(outputDir + '/unpacked');

    if (!local || local.md5 !== downloadable.md5 || !unpackedExists) {
      uptoDate = false;
      const message = intl.formatMessage(messages.newVersion, {
        name: downloadable.name,
        oldVersion: local ? local.version : 0,
        newVersion: downloadable.version,
      });

      ctx.setStatus(message);
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
          `${message} @ ${Math.round(downloaded / totalSize * 100)}%`
        );
      });

      try {
        await downloader.fetch();
      } catch (e) {
        const message = intl.formatMessage(messages.failed, {
          name: downloadable.name,
        });

        ctx.setStatusWithoutAnimation(message);
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
  // fs-extra is heavy and taking so many time to load it
  await require('fs-extra').outputFile(
    path.join(config.MINERS_PATH, 'manifest.json'),
    JSON.stringify(outerManifest)
  );

  if (uptoDate) {
    ctx.setStatus(intl.formatMessage(messages.upToDate));
    await sleep(1000);
  } else {
    await minerApi.getWorkers(true);
  }
  return {};
}
