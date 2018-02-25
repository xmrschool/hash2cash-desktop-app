import { promisifyAll } from 'bluebird';
import * as storage from 'electron-json-storage';

promisifyAll(storage);

module.exports = storage;