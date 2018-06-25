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
  dsn: 'https://b61f08f7e6994a1f9ae83b3e7d49f004@sentry.hashtocash.net/4',
  environment: process.env.NODE_ENV,
  release: __RELEASE__,
});

Sentry.setTagsContext({
  process: process.type || 'main',
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: os.platform(),
  platform_release: os.release(),
  app_version: app.getVersion(),
});

Sentry.setExtraContext({
  localStorage: clearLocalStorage(),
});

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

  const user = getUser();
  if (user && user.id) Sentry.setUserContext(user);
  Sentry.setExtraContext({
    localStorage: clearLocalStorage(),
    extra: JSON.stringify(extra || {}),
  });

  Sentry.captureException(e);
}
