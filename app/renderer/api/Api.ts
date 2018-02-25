import socket from 'socket';
import { Systeminformation } from 'systeminformation';

const debug = require('debug')('app:socket');

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

export type GpuDevice = {
  type: 'gpu';
  platform?: 'nvidia' | 'amd';
  deviceID: string;
  model: string;
  unavailableReason?: string;
  driverVersion?: string | null;
  collectedInfo: Systeminformation.GraphicsControllerInfo;
};

export type CpuDevice = {
  type: 'cpu';
  platform: 'amd' | 'intel';
  model: string;
  unavailableReason?: string;
  driverVersion?: string | null;
  collectedInfo: Systeminformation.CpuData;
};

export type Device = CpuDevice | GpuDevice;
export type Architecture = {
  uuid: string;
  platform?: 'darwin' | 'win32' | 'linux';
  warnings: string[];
  devices: Device[];
};

export type Downloadable = {
  name: string;
  size: number; // in kbytes
  format: 'zip'; // only zip is supported
  id: string; // and id to file (saved to manifest/${id}
  md5: string;
  downloadUrl: string;
  version: string;
};

export type FailedManifest = {
  success: false;
  errors: string[];
};

export type Manifest =
  | FailedManifest
  | {
      success: true;
      warnings?: string[];
      downloadable: Downloadable[];
    };

export function builder<T, D>(method: string) {
  return function query(data: T): Promise<D> {
    return new Promise((resolve, reject) => {
      debug(`[${method}] =>`, data);

      setTimeout(() => reject('Timeout error'), 4000);
      socket.emit(method, data, (response: any) => {
        debug(`[${method}] <=`, response);
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
  },
  mining: {
    manifest: builder<Architecture, Manifest>('mining.manifest'),
  },
};
