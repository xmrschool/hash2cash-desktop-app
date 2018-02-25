"use strict";
// A script which updates such data as enabled currencies, currency rates, etc
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
const config = require('../config.js');
function updateData() {
    const socket = io(config.SOCKET_URL);
    socket.emit('info', (response) => {
        localStorage.currencies = response.currencies;
    });
}
exports.default = updateData;
//# sourceMappingURL=updater.js.map