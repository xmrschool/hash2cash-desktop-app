"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bluebird_1 = require("bluebird");
const storage = require("electron-json-storage");
bluebird_1.promisifyAll(storage);
module.exports = storage;
//# sourceMappingURL=storage.js.map