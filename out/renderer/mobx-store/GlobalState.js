"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const electron_1 = require("electron");
const socket_1 = require("socket");
const debug = require('debug')('app:mobx:globalState');
exports.DEFAULT_TOAST_TIMEOUT = 4000;
class GlobalState {
    constructor() {
        this.socketConnected = false;
        this.socketCantConnect = false;
        this.userShare = 0.7;
        this.waitTilSocket();
        this.waitForPort();
    }
    waitForPort() {
        electron_1.ipcRenderer.on('miner-server-port', (e, port) => {
            this.setMinerPort(port);
        });
    }
    waitTilSocket() {
        this.setSocketState(false); // start our timeout
        this.connectionPromise = new Promise(resolve => {
            this.connectionResolve = resolve;
            socket_1.default.on('connect', () => {
                debug('Socket.io is connected');
                this.setSocketState();
                this.connectionResolve();
            });
            socket_1.default.on('disconnect', () => {
                debug('Socket.io disconnected');
                this.setSocketState(false);
                this.connectionPromise = new Promise(resolve => (this.connectionResolve = resolve));
            });
        });
    }
    setMinerPort(port) {
        this.minerPort = port;
    }
    setSocketState(state = true) {
        this.socketConnected = state;
        if (state) {
            clearTimeout(this.connectionTimeout);
            this.socketCantConnect = false;
            this.closeToast();
        }
        else {
            this.connectionTimeout = setTimeout(() => this.unableToConnect(), 5000);
        }
    }
    unableToConnect() {
        this.socketCantConnect = true;
        this.setToast({
            message: 'Failed to connect to server, probably no internet. Trying again...',
            type: 'danger',
            timeout: Infinity,
        });
    }
    setToast(toast) {
        this.toast = toast;
        if (toast.timeout !== Infinity)
            setTimeout(() => (this.toast = undefined), toast.timeout || exports.DEFAULT_TOAST_TIMEOUT);
    }
    closeToast() {
        this.toast = undefined;
    }
}
__decorate([
    mobx_1.observable
], GlobalState.prototype, "minerPort", void 0);
__decorate([
    mobx_1.observable
], GlobalState.prototype, "socketConnected", void 0);
__decorate([
    mobx_1.observable
], GlobalState.prototype, "socketCantConnect", void 0);
__decorate([
    mobx_1.observable
], GlobalState.prototype, "userShare", void 0);
__decorate([
    mobx_1.observable
], GlobalState.prototype, "toast", void 0);
__decorate([
    mobx_1.action
], GlobalState.prototype, "waitForPort", null);
__decorate([
    mobx_1.action
], GlobalState.prototype, "waitTilSocket", null);
__decorate([
    mobx_1.action
], GlobalState.prototype, "setSocketState", null);
__decorate([
    mobx_1.action
], GlobalState.prototype, "unableToConnect", null);
__decorate([
    mobx_1.action
], GlobalState.prototype, "setToast", null);
__decorate([
    mobx_1.action
], GlobalState.prototype, "closeToast", null);
exports.GlobalState = GlobalState;
exports.default = new GlobalState();
//# sourceMappingURL=GlobalState.js.map