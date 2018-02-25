"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const electron_1 = require("electron");
const path = require("path");
class Server extends events_1.EventEmitter {
    constructor() {
        super();
        this.window = new electron_1.BrowserWindow({
            show: false,
        });
    }
    load(appWindow) {
        this.window.loadURL(`file://${path.join(__dirname, '../miner/app/index.html')}`);
        this.window.webContents.once('did-finish-load', () => {
            if (__DEV__) {
                this.window.webContents.openDevTools();
            }
        });
        electron_1.ipcMain.on('miner-server-port', (e, port) => {
            console.log('received port: ', port);
            appWindow.sendMinerPort(port);
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map