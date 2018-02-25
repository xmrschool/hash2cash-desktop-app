"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PQueue = require("p-queue");
const request = require("request");
const progress = require("request-progress");
const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");
const events_1 = require("events");
const md5File = require('md5-file/promise');
const DecompressZip = require('decompress-zip');
const app = electron.app || electron.remote.app;
const debug = require('debug')('app:fileDownloader');
exports.librariesPath = path.join(app.getPath('userData'), 'libraries');
class DownloadError extends Error {
    constructor(error) {
        super();
        Object.assign(this, error);
        this.stack = new Error().stack;
    }
    get message() {
        return this.formattedMessage;
    }
}
exports.DownloadError = DownloadError;
class FileDownloader extends events_1.EventEmitter {
    constructor(downloadable) {
        super();
        this.totalSize = 0;
        this.speed = 0;
        this.downloaded = 0;
        this.downloadable = downloadable;
        this.queue = new PQueue({ concurrency: 1 });
    }
    async getDirectory(miner) {
        const dir = path.join(exports.librariesPath, miner.name);
        await fs.ensureDir(dir);
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
        clearInterval(this.interval);
    }
    unpackFile(filename, output) {
        return new Promise((resolve, reject) => {
            const unzipper = new DecompressZip(filename);
            unzipper.on('error', reject);
            unzipper.on('extract', resolve);
            unzipper.extract({
                path: output,
            });
        });
    }
    async validateMD5(filename, miner) {
        const compiledMd5 = await md5File(filename);
        if (compiledMd5 !== miner.md5) {
            throw new DownloadError({
                context: 'md5',
                code: 'md5.mismatch',
                details: { filename, compiledMd5 },
                formattedMessage: `MD5 hash doesn't match (source: ${miner.md5}, outer: ${compiledMd5})`,
            });
        }
    }
    async fetch() {
        return new Promise((globalResolve, globalReject) => {
            // We have global scope here because we need to catch that errors
            this.totalSize = this.downloadable.reduce((left, right) => {
                return (left.size || left) + right.size;
            }, 0);
            Promise.all(this.downloadable.map(async (miner) => this.queue
                .add(async () => new Promise(async (resolve, reject) => {
                try {
                    const outputDir = await this.getDirectory(miner);
                    const realFileName = !miner.format
                        ? '/downloaded'
                        : `/downloaded.${miner.format}`;
                    const futurePathToFile = outputDir + realFileName;
                    debug('If path exists?', await fs.exists(futurePathToFile), futurePathToFile);
                    if (await fs.pathExists(futurePathToFile)) {
                        // We have to check if hash is valid, if so, skip downloading
                        try {
                            await this.validateMD5(futurePathToFile, miner);
                            if (miner.format === 'zip') {
                                // Additional, we should check if file was unpacked properly
                                if (!await fs.pathExists(outputDir + '/unpacked'))
                                    await this.unpackFile(futurePathToFile, outputDir);
                            }
                            return resolve();
                        }
                        catch (e) {
                            debug("Can't resolve exiting library", e);
                        }
                    }
                    let localDownloaded = 0;
                    debug('Fetching up miner: ', miner, ' to directory ', outputDir);
                    const downloader = progress(request.get(miner.downloadUrl), {
                        throttle: 500,
                    });
                    downloader.on('progress', stats => {
                        debug('Download progress: ', stats);
                        this.speed = stats.speed;
                        this.downloaded =
                            this.downloaded -
                                localDownloaded +
                                stats.size.transferred;
                        localDownloaded = stats.size.transferred;
                        this.emitAll();
                    });
                    downloader.on('error', data => {
                        debug('Failed to download miner: ', data);
                        reject(data);
                        this.stopBroadcasting();
                    });
                    downloader.on('end', async (data) => {
                        try {
                            debug('Downloaded', data);
                            await this.validateMD5(futurePathToFile, miner);
                            if (miner.format === 'zip') {
                                await this.unpackFile(futurePathToFile, outputDir);
                                await fs.outputFile(outputDir + '/unpacked', '');
                            }
                            resolve(data);
                            this.stopBroadcasting();
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                    debug('Saving to: ', futurePathToFile);
                    downloader.pipe(fs.createWriteStream(futurePathToFile));
                    this.broadcastEvents();
                }
                catch (e) {
                    reject(e);
                }
            }))
                .catch(error => {
                if (error instanceof DownloadError) {
                    error.miner = miner;
                }
                else
                    error = new DownloadError({
                        context: 'unexpected',
                        details: error,
                        miner,
                        formattedMessage: `Sorry, seems that unexpected error happened: ${error.message}`,
                    });
                globalReject(error);
            }))).then(globalResolve);
        });
    }
}
exports.default = FileDownloader;
//# sourceMappingURL=FileDownloader.js.map