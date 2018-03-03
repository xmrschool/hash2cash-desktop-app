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
  const file = (await new Promise(resolve => {
    ipcRenderer.once('resolveUtil', (event: any, arg: string) => resolve(arg));
    ipcRenderer.send('resolveUtil', 'darwin/cudaDeviceQuery');
  })) as string;

  console.log('cuda directory is: ', file);
  const descriptor = spawn(file);

  const resp = await new Promise((resolve, reject) => {
    let outerData = '';
    descriptor.stdout.on('data', data => {
      outerData += data;
    });

    descriptor.on('close', () => {
      try {
        resolve(JSON.parse(outerData));
      } catch (e) {
        reject(e);
      }
    });
  });

  return resp as CollectorResponse;
}
