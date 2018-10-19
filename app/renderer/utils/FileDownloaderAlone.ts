import * as electron from 'electron';
import * as path from 'path';

import { EventEmitter } from 'events';
import { Downloadable } from '../api/Api';
import { extractFile } from './FileDownloader';
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

export default class FileDownloaderAlone extends EventEmitter {
  downloadable: Downloadable;
  queue: any;
  totalSize: number = 0;
  speed: number = 0;
  downloaded: number = 0;

  interval?: number;

  constructor(downloadable: Downloadable) {
    super();

    this.downloadable = downloadable;
    this.totalSize = downloadable.size;
  }

  static async getDirectory(miner: Downloadable) {
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

  unpackFile(filename: string, output: string) {
    return new Promise((resolve, reject) => {
      const unzipper = new DecompressZip(filename);

      unzipper.on('error', reject);
      unzipper.on('extract', resolve);

      unzipper.extract({
        path: output,
      });
    });
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
    // This modules are take long to load... so we requrie it lazily
    const fs = require('fs-extra');
    const request = require('request');
    const progress = require('request-progress');

    const exists = fs.exists as any;
    const miner = this.downloadable;

    return new Promise(async (resolve, reject) => {
      try {
        const outputDir = await FileDownloaderAlone.getDirectory(miner);
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
            await extractFile(miner.format, futurePathToFile, outputDir);

            return resolve();
          } catch (e) {
            debug("Can't resolve exiting library", e);
          }
        }

        debug('Fetching up miner: ', miner, ' to directory ', outputDir);

        const downloader = progress(request.get({ url: miner.downloadUrl, ...getRequestArgs() }), {
          throttle: 500,
        });

        downloader.on('progress', (stats: any) => {
          debug('Download progress: ', stats);
          this.speed = stats.speed;
          this.downloaded = stats.size.transferred;

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
            await extractFile(miner.format, futurePathToFile, outputDir);

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
    });
  }
}
