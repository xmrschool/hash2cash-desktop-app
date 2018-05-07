const electron = require('electron');
const path = require('path');
const app = electron.app || electron.remote.app;

const APP_NAME = 'Hash to Cash';
const APP_TEAM = 'Hash to Cash';
const APP_VERSION = require('./renderer/package.json').version;
const IS_PRODUCTION = isProduction();

module.exports = {
  AUTO_UPDATE_URL: 'https://hashto.cash/desktop/update',
  CRASH_REPORT_URL: 'https://hashto.cash/desktop/crash-report',
  SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:7639',
  BASE_URL: 'https://hashto.cash/',
  UTM_TAGS: {
    utm_source: 'desktop',
  },

  APP_COPYRIGHT: 'Copyright © 2018 ' + APP_TEAM,
  APP_NAME,
  APP_VERSION,
  APP_TEAM,
  IS_PRODUCTION,

  MINERS_PATH: path.join(app.getPath('userData'), 'libraries'),
  CONFIG_PATH: path.join(app.getPath('userData'), 'storage'),
  RENDERER_PATH: path.join(__dirname, 'renderer'),
};

function isProduction() {
  return false;
}
