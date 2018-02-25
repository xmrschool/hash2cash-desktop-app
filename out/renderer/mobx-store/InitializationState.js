"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const Api_1 = require("../api/Api");
const fs = require("fs-extra");
const path = require("path");
const config = require('../../config.js');
const FileDownloader_1 = require("../utils/FileDownloader");
const MinerApi_1 = require("../api/MinerApi");
const MinerObserver_1 = require("./MinerObserver");
const sleep_1 = require("../utils/sleep");
const debug = require('debug')('app:mobx:initialization');
class InitializationState {
    constructor() {
        this.status = 'Collecting hardware information...';
        this.step = 0; // A progress bar step
        this.bechmarking = false;
        // Used for downloader
        this.speed = 0;
        this.downloaded = 0;
        this.totalSize = 0;
        this.downloading = false;
    }
    setUnexpectedError(error) {
        this.unexpectedError = error;
    }
    setHardware(hardware) {
        this.hardware = hardware;
    }
    async fetchManifest() {
        if (!this.hardware)
            throw new Error('Hardware is not defined');
        const manifest = await Api_1.default.mining.manifest(this.hardware);
        this.manifest = manifest;
        return manifest;
    }
    setStep(step) {
        this.step = step;
    }
    setText(progressText) {
        this.progressText = progressText;
    }
    formatPercents(relative) {
        return Math.round(relative * 100);
    }
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0)
            return '0';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]);
    }
    async benchmark() {
        if (!this.manifest || this.manifest.success === false) {
            throw new Error('Manifest not fetched');
        }
        await MinerApi_1.default.stopAll();
        // Wait till all workers are done
        await sleep_1.sleep(200);
        await MinerApi_1.default.getWorkers();
        if (MinerApi_1.default.workers.length === 0) {
            throw new Error('Failed to get any of workers. Seems to be strange!');
        }
        const profitableWorkers = MinerApi_1.default.findMostProfitableWorkers();
        console.log('Most profitable are: ', profitableWorkers);
        Object.keys(profitableWorkers).forEach(async (hardware) => {
            const miner = profitableWorkers[hardware][0];
            await miner.start();
            MinerObserver_1.default.observe(miner);
        });
    }
    async downloadBinaries() {
        if (!this.manifest || this.manifest.success === false)
            return console.error('Manifest isnt yet fetched');
        const { downloadable } = this.manifest;
        this.downloading = true;
        const uploader = new FileDownloader_1.default(downloadable);
        uploader.on('progress', (stats) => {
            debug('Progress is: ', stats);
            const { downloaded, totalSize, speed } = stats;
            const difference = 5 / 7 - 3 / 7;
            const percents = difference * (downloaded / totalSize);
            console.log('percents are: ', percents, 3 / 7);
            this.setText(`${this.formatPercents(3 / 7 + percents)}%, ${this.formatBytes(downloaded || 0)} / ${this.formatBytes(totalSize || 0)} @ ${this.formatBytes(speed || 0)}/s`);
            this.setStep(3 / 7 + percents);
            Object.assign(this, stats);
        });
        try {
            await uploader.fetch();
            localStorage.manifest = JSON.stringify(this.manifest);
            await fs.outputFile(path.join(config.MINERS_PATH, 'manifest.json'), JSON.stringify(this.manifest.downloadable));
        }
        catch (e) {
            console.error('Failed to download binaries: ', e);
            this.downloadError = e;
            this.downloading = false;
            throw e;
        }
        this.downloading = false;
    }
    setStatus(status) {
        this.status = status;
    }
}
__decorate([
    mobx_1.observable
], InitializationState.prototype, "hardware", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "manifest", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "unexpectedError", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "status", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "step", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "progressText", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "downloadError", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "bechmarking", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "speed", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "downloaded", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "totalSize", void 0);
__decorate([
    mobx_1.observable
], InitializationState.prototype, "downloading", void 0);
__decorate([
    mobx_1.action
], InitializationState.prototype, "setUnexpectedError", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "setHardware", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "fetchManifest", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "setStep", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "setText", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "benchmark", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "downloadBinaries", null);
__decorate([
    mobx_1.action
], InitializationState.prototype, "setStatus", null);
exports.InitializationState = InitializationState;
exports.default = new InitializationState();
//# sourceMappingURL=InitializationState.js.map