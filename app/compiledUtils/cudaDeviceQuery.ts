import { spawn } from 'child_process';
import { ipcRenderer } from 'electron';
export type CudaDevice = {
  name: string;
  index: number;
  memory: number;
  memoryBytes: number;
  driverVersion: string;
  runtimeVersion: string;
  freeMemory: number;
  totalMemory: number;
  // This values used for xmr-stak miner
  deviceThreads: number;
  deviceBlocks: number;
  pciDomainID: number;
  pciBusID: number;
  pciDeviceID: number;
};

export type CollectorResponse = {
  success?: boolean;
  error?: string;
  totalCount: number;
  devices: CudaDevice[];
};

// In case it's not webpack
if (process.env.NODE_ENV === 'test') {
  (global as any).__DARWIN__ = process.platform === 'darwin';
  (global as any).__WIN32__ = process.platform === 'win32';
}

export default async function cudaDeviceQuery(): Promise<CollectorResponse> {
  const extension = __WIN32__ ? '.exe' : '';
  const file = (await new Promise(resolve => {
    ipcRenderer.once('resolveUtil', (event: any, arg: string) => resolve(arg));
    ipcRenderer.send(
      'resolveUtil',
      `${process.platform}/cudaDeviceQuery${extension}`,
    );
  })) as string;

  console.log('cuda directory is: ', file);
  const descriptor = spawn(file);

  const resp = await new Promise((resolve, reject) => {
    let outerData = '';
    descriptor.stdout.on('data', data => {
      outerData += data;
    });

    descriptor.on('error', e => {
      console.error(
        'Failed to get cuda devices. Returning nothing as fallback!',
        e,
      );
      resolve({
        totalCount: 0,
        devices: [],
      });
    });
    descriptor.on('close', () => {
      try {
        console.log('Received data from cuda: ', outerData);
        resolve(JSON.parse(outerData));
      } catch (e) {
        console.error('Failed to get any cudaDevices!', e);
        resolve({ totalCount: 0, devices: [] });
      }
    });
  });

  return resp as CollectorResponse;
}
