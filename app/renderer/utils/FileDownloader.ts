import * as electron from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';

import { EventEmitter } from 'events';
import { Downloadable } from '../api/Api';
import extract7z from '../../core/7z/extractPromise';
import { getRequestArgs } from '../../core/cas';

const md5File = require('md5-file/promise');
const DecompressZip = require('decompress-zip');
const app = electron.app || electron.remote.app;
const debug = require('debug')('app:fileDownloader');
export const librariesPath = path.join(app.getPath('userData'), 'libraries');

debug('userData location is %s', librariesPath);
type DownloadErrorOptions = {
  context: 'request' | 'md5' | 'unexpected';
  code?: string;
  details?: any;
  miner?: Downloadable;
  formattedMessage: string;
};

export class DownloadError extends Error {
  context?: 'request' | 'md5' | 'unexpected';
  code?: string;
  details: any;
  miner?: Downloadable;
  formattedMessage!: string;

  constructor(error: DownloadErrorOptions) {
    super();

    Object.assign(this, error);
    this.stack = new Error().stack;
  }

  get message(): string {
    return this.formattedMessage;
  }
}

export function extractZip(fileName: string, output: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(fileName);

    unzipper.on('error', reject);
    unzipper.on('extract', resolve);

    unzipper.extract({
      path: output,
    });
  });
}

export async function extractFile(
  format: '7z' | 'zip',
  fileName: string,
  output: string
): Promise<boolean> {
  debug('Trying to unpack format: ', { format, fileName, output });
  switch (format) {
    case 'zip':
      await extractZip(fileName, output);

      fs.writeFile(path.join(output, 'unpacked'), 'yeaah boy');
      return true;
    case '7z':
      await extract7z(fileName, output);

      fs.writeFile(path.join(output, 'unpacked'), 'yeaah boy');

      return true;
    default:
      return false;
  }
}

export default class FileDownloader extends EventEmitter {
  downloadable: Downloadable[];
  queue: any;
  totalSize: number = 0;
  speed: number = 0;
  downloaded: number = 0;

  interval?: number;

  constructor(downloadable: Downloadable[]) {
    super();

    const PQueue = require('p-queue');
    this.downloadable = downloadable;
    this.queue = new PQueue({ concurrency: 1 });
  }

  async getDirectory(miner: Downloadable) {
    const dir = path.join(librariesPath, miner.name);

    await require('fs-extra').ensureDir(dir);

    return dir;
  }

  emitAll() {
    const { speed, downloaded, totalSize } = this;

    this.emit('progress', { speed, downloaded: downloaded || 1, totalSize });
  }

  broadcastEvents() {
    this.emitAll(); // Immediately emit changes
  }

  stopBroadcasting() {
    clearInterval(this.interval!);
  }

  async validateMD5(filename: string, miner: Downloadable) {
    const compiledMd5 = await md5File(filename);

    if (compiledMd5 !== miner.md5) {
      throw new DownloadError({
        context: 'md5',
        code: 'md5.mismatch',
        details: { filename, compiledMd5 },
        formattedMessage: `MD5 hash doesn't match (source: ${
          miner.md5
        }, outer: ${compiledMd5})`,
      });
    }
  }

  // We don't want request along with main bundle because it's too big
  async fetch(): Promise<any> {
    // This modules are take long to load... so we require it lazily
    const fs = require('fs-extra');
    const request = require('request');
    const progress = require('request-progress');

    const exists = fs.exists as any;
    return new Promise((globalResolve, globalReject) => {
      // We have global scope here because we need to catch that errors
      this.totalSize = this.downloadable.reduce((left: any, right) => {
        return (left.size || left) + right.size;
      }, 0);

      Promise.all(
        this.downloadable.map(async miner =>
          this.queue
            .add(
              async () =>
                new Promise(async (resolve, reject) => {
                  try {
                    const outputDir = await this.getDirectory(miner);
                    const realFileName = !miner.format
                      ? '/downloaded'
                      : `/downloaded.${miner.format}`;
                    const futurePathToFile = outputDir + realFileName;

                    debug(
                      'If path exists?',
                      await exists(futurePathToFile),
                      futurePathToFile
                    );
                    if (await exists(futurePathToFile)) {
                      // We have to check if hash is valid, if so, skip downloading
                      try {
                        await this.validateMD5(futurePathToFile, miner);

                        await extractFile(
                          miner.format,
                          futurePathToFile,
                          outputDir
                        );
                        return resolve();
                      } catch (e) {
                        debug("Can't resolve exiting library", e);
                      }
                    }

                    let localDownloaded = 0;

                    debug(
                      'Fetching up miner: ',
                      miner,
                      ' to directory ',
                      outputDir
                    );

                    const downloader = progress(
                      request.get({ url: miner.downloadUrl, ...getRequestArgs() }),
                      {
                        throttle: 500,
                      }
                    );

                    downloader.on('progress', (stats: any) => {
                      debug('Download progress: ', stats);
                      this.speed = stats.speed;
                      this.downloaded =
                        this.downloaded -
                        localDownloaded +
                        stats.size.transferred;
                      localDownloaded = stats.size.transferred;

                      this.emitAll();
                    });

                    downloader.on('error', (data: any) => {
                      debug('Failed to download miner: ', data);
                      reject(data);
                      this.stopBroadcasting();
                    });

                    downloader.on('end', async (data: any) => {
                      try {
                        debug('Downloaded', data);

                        await this.validateMD5(futurePathToFile, miner);
                        await extractFile(
                          miner.format,
                          futurePathToFile,
                          outputDir
                        );

                        resolve(data);
                        this.stopBroadcasting();
                      } catch (e) {
                        reject(e);
                      }
                    });

                    debug('Saving to: ', futurePathToFile);
                    downloader.pipe(fs.createWriteStream(futurePathToFile));
                    this.broadcastEvents();
                  } catch (e) {
                    reject(e);
                  }
                })
            )
            .catch((error: any) => {
              if (error instanceof DownloadError) {
                error.miner = miner;
              } else
                error = new DownloadError({
                  context: 'unexpected',
                  details: error,
                  miner,
                  formattedMessage: `Unexpected error happened: ${
                    error && error.message ? error.message : error
                  }`,
                });

              globalReject(error);
            })
        )
      ).then(globalResolve);
    });
  }
}
