"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
function getPort(startingAt) {
    function getNextAvailablePort(currentPort, cb) {
        const server = net.createServer();
        server.listen(currentPort, () => {
            server.once('close', () => {
                cb(currentPort);
            });
            server.close();
        });
        server.on('error', _ => {
            getNextAvailablePort(++currentPort, cb);
        });
    }
    return new Promise(resolve => {
        getNextAvailablePort(startingAt, resolve);
    });
}
exports.getPort = getPort;
//# sourceMappingURL=utils.js.map