import { EventEmitter } from 'events';
import { Response as OpenCLResponse } from 'opencl-detector';
import { Response as CudaResponse } from 'cuda-detector';

import { AUTH_TOKEN } from '../../core/storage/actions';
import { AppInfo, Architecture, SuccessManifest } from '../api/Api';
import { Currency } from '../mobx-store/CurrenciesService';
import { SettingsStore } from '../mobx-store/UserOptions';
import { LocaleWithData } from '../intl';

export type Benchmark = {
  time: Date;
  data: {
    speed?: number | null;
    name: string;
  }[];
};

export type CollectedReport = {
  openCl?: OpenCLResponse;
  cuda?: CudaResponse;
};

export function safeParse(json: string) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export class LocalStorage extends EventEmitter {
  static get authToken(): string | null {
    return localStorage[AUTH_TOKEN];
  }

  static set authToken(val: string | null) {
    localStorage[AUTH_TOKEN] = val;
  }

  static get rigName(): string | null {
    return localStorage.rigName;
  }

  static set rigName(val: string | null) {
    localStorage.rigName = val;
  }

  static get appInfo(): AppInfo | null {
    return safeParse(localStorage.appInfo);
  }

  static set appInfo(val: AppInfo | null) {
    localStorage.appInfo = JSON.stringify(val);
  }

  static get currentLocale(): LocaleWithData | null {
    return safeParse(localStorage.currentLocale);
  }

  static set currentLocale(val: LocaleWithData | null) {
    localStorage.currentLocale = JSON.stringify(val);
  }

  static get ticker(): Currency[] | null {
    return safeParse(localStorage.ticker);
  }

  static set ticker(val: Currency[] | null) {
    localStorage.ticker = JSON.stringify(val);
  }

  static get benchmark(): Benchmark | null {
    return safeParse(localStorage.benchmark);
  }

  static set benchmark(val: Benchmark | null) {
    localStorage.benchmark = JSON.stringify(val);
  }

  static get collectedReport(): Architecture | null {
    return safeParse(localStorage.collectedReport);
  }

  static set collectedReport(val: Architecture | null) {
    localStorage.collectedReport = JSON.stringify(val);
  }

  static get manifest(): SuccessManifest | null {
    return safeParse(localStorage.manifest);
  }

  static set manifest(val: SuccessManifest | null) {
    localStorage.manifest = JSON.stringify(val);
  }

  static get rawCollectedReport(): CollectedReport | null {
    return safeParse(localStorage._rawCollectedReport);
  }

  static set rawCollectedReport(val: CollectedReport | null) {
    localStorage._rawCollectedReport = JSON.stringify(val);
  }

  static get settings(): SettingsStore | null {
    return safeParse(localStorage.settings);
  }

  static set settings(val: SettingsStore | null) {
    localStorage.settings = JSON.stringify(val);
  }

  static get userId(): string | null {
    return localStorage.userId;
  }

  static set userId(val: string | null) {
    localStorage.userId = val;
  }
}
