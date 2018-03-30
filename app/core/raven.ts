import { app as _app, remote } from 'electron';
import { merge } from 'lodash';
import { AUTH_TOKEN } from './storage/actions';
import * as os from 'os';
import { CaptureOptions } from 'raven';
import { LocalStorage } from '../renderer/utils/LocalStorage';

let Raven: any;
if (_app) {
  Raven = require('raven');
} else {
  Raven = require('raven-js');
}

const app = _app || remote.app;
export function clearLocalStorage() {
  if (typeof localStorage === 'undefined') return {};
  const storage = Object.assign({}, localStorage, {});
  delete storage[AUTH_TOKEN];

  return storage;
}

const raven = Raven.config(
  'https://3bcaab9b12b240638f55b4121bb61982@sentry.io/297915',
  {
    environment: process.env.NODE_ENV,
    release: app.getVersion(),
    tags: {
      process: process.type || 'main',
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: os.platform(),
      platform_release: os.release(),
      app_version: app.getVersion(),
    },
    extra: {
      localStorage: clearLocalStorage(),
    },
  }
).install();

export function getUser() {
  if (typeof localStorage !== 'undefined' && localStorage.userId) {
    return {
      id: LocalStorage.userId,
    };
  }

  return undefined;
}

export default function trackError(e: Error, options?: CaptureOptions) {
  if (!__DEV__)
    raven.captureException(
      e,
      merge(
        {
          extra: {
            localStorage: clearLocalStorage(),
          },
          user: getUser(),
        },
        options
      )
    );
}
