import { app as _app, remote } from 'electron';
import { AUTH_TOKEN } from './storage/actions';
import * as os from 'os';
import * as Sentry from '@sentry/electron';
import { LocalStorage } from '../renderer/utils/LocalStorage';

const app = _app || remote.app;
export function clearLocalStorage() {
  if (typeof localStorage === 'undefined') return {};
  const storage = Object.assign({}, localStorage, {});
  delete storage[AUTH_TOKEN];

  return storage;
}

Sentry.init({
  dsn: 'https://b50bca5143f4480dad67a63ca18cd90f@sentry.hashtocash.net/4',
  environment: process.env.NODE_ENV,
  release: __RELEASE__,
});

function configureScope() {
  Sentry.configureScope(scope => {
    scope.setExtra('localStorage', clearLocalStorage());
  });
}

export function getSystemContext() {
  return {
    process: process.type || 'main',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: os.platform(),
    platform_release: os.release(),
    app_version: app.getVersion(),
  };
}

export function getUser(): { id: string } | undefined {
  if (typeof localStorage !== 'undefined' && localStorage.userId) {
    return {
      id: LocalStorage.userId!,
    };
  }

  return undefined;
}

export default function trackError(e: Error, extra?: any) {
  if (__DEV__) return;

  configureScope()

  Sentry.captureException(e);
}
