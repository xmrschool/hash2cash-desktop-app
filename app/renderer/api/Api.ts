import socket from 'socket';
import { Systeminformation } from 'systeminformation';
import { CudaCollectedDevice } from 'cuda-detector';
import { OpenCLCollectedDevice } from 'opencl-detector';
import { CpuInfo } from 'cpuid-detector';
import { Currency } from '../mobx-store/CurrenciesService';
import { PNPDevice } from '../../core/windows/wmic';

const debug = require('debug')('app:socket');

export type Pool = {
  isOk: boolean;
  proto: string;
  url: string;
  unavialbleReason: string | null;
  status: 'ok' | 'down';
};

export enum PossibleArches {
  'x64',
  'ia32',
}

export type Driver = {
  vendor: 'nvidia';
  generation: any; // ToDo how to determine generation? By CUDA version?
  isMobile: boolean;
  major: number;
  arch: PossibleArches;
  series: SeriesFilter[];
  version: string; // 1.4.5
  downloadLink: string;
};

export type SeriesFilter = {
  maximalSupported?: number;
  minimalSupported?: number;
  type?: string;
  seriesList?: string[];
};

export type AppInfo = {
  pools: { [key: string]: Pool };
  ticker: Currency[];
  userShare: number;
  drivers: Driver[];
  locales: {
    [locale: string]: {
      locale: string;
      id: string;
      link: string;
    };
  };
};

export type EmailInfoResponse = {
  allowedToContinue: boolean; // If we can show password field
  hasAccount?: boolean;
  reason?: string; // A reason why you can't get in here
};

export type AuthAttempt = {
  email: string;
  password: string;
  secondPassword?: string; // 2FA, idk how to call it here
};

export type AuthAttemptResponse = {
  success: boolean;
  token?: string;
  email?: string;
  id?: string;
  error?:
    | '2fa_invalid'
    | 'sign_through_site'
    | 'invalid_password'
    | 'email_forbidden'
    | string;
  redirectUrl?: string;
};

export type Profile = {
  displayName?: string;
  picture?: string;
};

export type Account = {
  id: string;
  name: string;
  value: number;
};

export type IUser = {
  id: string;
  email?: string;
  createdAt?: string;
  profile: Profile;
  accounts: Account[];
};

export type AuthAttachResponse = {
  success: boolean;
  error?: string;
  user?: IUser;
};

export type AuthThroughSite = {
  token?: string;
  error?: string;
};

// ToDo We actually have to use enum constans here
export type _CudaDevice = {
  type: 'gpu';
  platform: 'cuda';
  memory?: number;
  deviceID: string;
  model: string;
  unavailableReason?: string;
  warning?: string;
  driverVersion?: string | null;
  wmic?: PNPDevice;
  collectedInfoType?: string;
  collectedInfo: CudaCollectedDevice;
};

export type _OpenCLDevice = {
  type: 'gpu';
  platform: 'opencl';
  memory?: number;
  deviceID: string;
  model: string;
  unavailableReason?: string;
  warning?: string;
  driverVersion?: string | null;
  wmic?: PNPDevice;
  collectedInfoType?: string;
  collectedInfo: OpenCLCollectedDevice;
};

export type CpuDevice = {
  type: 'cpu';
  platform: 'amd' | 'intel';
  model: string;
  unavailableReason?: string;
  warning?: string;
  driverVersion?: string | null;
  wmic?: PNPDevice;
  collectedInfoType?: string;
  collectedInfo: Systeminformation.CpuData | CpuInfo;
};

export type Device = CpuDevice | _CudaDevice | _OpenCLDevice;
export type Architecture = {
  uuid: string;
  platform?: 'darwin' | 'win32' | 'linux';
  cpuArch: 'x32' | 'x64';
  platformVersion: string;
  appVersion: string;
  reportVersion?: number;
  warnings: string[];
  devices: Device[];
  wmicDevices?: any;
};

export type Downloadable = {
  name: string;
  tag: string;
  size: number; // in kbytes
  format: 'zip' | '7z'; // only zip is supported
  id: string; // and id to file (saved to manifest/${id}
  md5: string;
  downloadUrl: string;
  version: string;
};

export type FailedManifest = {
  success: false;
  errors: string[];
};

export type DriverOffer = {
  vendor: 'nvidia';
  generation: any; // ToDo how to determine generation? By CUDA version?
  isMobile: boolean;
  major: number;
  arch: PossibleArches;
  version: string; // 1.4.5
  downloadLink: string;
};

export type SuccessManifest = {
  success: true;
  warnings?: string[];
  downloadable: Downloadable[];
  minerIds: (string | null)[];
};

export type Metrics = {
  id: string;
  minute: number;
  hourly?: number;
  max?: number;
};

export type Manifest = FailedManifest | SuccessManifest;

export function builder<T, D>(method: string, withTimeout = true) {
  return function query(data: T): Promise<D> {
    return new Promise((resolve, reject) => {
      debug(`[${method}] =>`, data);

      let timeout: any;
      if (withTimeout) {
        timeout = setTimeout(() => reject(`Timeout error when requesting ${method}`), 15000);
      }
      socket.emit(method, data, (response: any) => {
        debug(`[${method}] <=`, response);
        if (timeout) clearTimeout(timeout);
        resolve(response);
      });
    });
  };
}

export default {
  auth: {
    emailInfo: builder<string, EmailInfoResponse>('auth.emailInfo'),
    attempt: builder<AuthAttempt, AuthAttemptResponse>('auth.attempt'),
    attach: builder<string, AuthAttachResponse>('auth.attach'),
    loginThroughWebsite: builder<undefined, AuthThroughSite>(
      'auth.loginThroughWebsite',
      false
    ),
  },
  mining: {
    manifest: builder<Architecture, Manifest>('mining.manifest'),
    submitMetrics: builder<Metrics, { accepted: boolean }>(
      'mining.submitMetrics'
    ),
  },
};
