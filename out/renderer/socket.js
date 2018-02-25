"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
const CurrenciesService_1 = require("./mobx-store/CurrenciesService");
const config = require('../config.js'); // tslint:disable-line
const socket = io(config.SOCKET_URL);
// First time we have to manually ask for appInfo
socket.emit('appInfo', '', (response) => {
    localStorage.appInfo = JSON.stringify(response);
    CurrenciesService_1.default.setTickerFromObject(response.ticker);
});
// Then we subscribe to updates
socket.on('appInfo', (response) => {
    localStorage.appInfo = JSON.stringify(response);
});
self.window.socket = socket;
exports.default = socket;
//# sourceMappingURL=socket.js.map