import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { parseWmicOutput } from './wmicParser';

export type PNPDevice = {
  Location?: { bus: number; device: number; func: number; };
  Name: string;
  PNPDeviceID: string;
  DriverVersion: string;
  AdapterRam: string;
  Status: string;
  AdapterCompatibility: string;
  DeviceId: string;
};
let wmic: string | boolean = false;

export function getWmicPath() {
  if (os.type() === 'Windows_NT' && !wmic) {
    if (fs.existsSync(process.env.WINDIR + '\\system32\\wbem\\wmic.exe')) {
      wmic = process.env.WINDIR + '\\system32\\wbem\\wmic.exe';
    } else wmic = 'wmic';
  }
  return wmic;
}

export async function getPnpDevices(): Promise<
  { DeviceID: string; Location: string }[]
> {
  return new Promise((resolve, reject) => {
    console.time('pnpQuerying');
    exec(
      `${getWmicPath()} path Win32_PnPSignedDriver get DeviceID, Location`,
      (error, stdout) => {
        console.timeEnd('pnpQuerying');

        if (error) return reject(error);

        try {
          resolve(parseWmicOutput(stdout));
        } catch (e) {
          reject(e);
        }
      }
    );
  }) as any;
}

export async function getGpus(): Promise<
  {
    Name: string;
    PNPDeviceID: string;
    DriverVersion: string;
    AdapterRam: string;
    Status: string;
    AdapterCompatibility: string;
  }[]
> {
  return new Promise((resolve, reject) => {
    exec(
      `${getWmicPath()} path win32_VideoController get Name, PNPDeviceID, DriverVersion, AdapterRAM, Status, AdapterCompatibility`,
      (error, stdout) => {
        if (error) return reject(error);

        resolve(parseWmicOutput(stdout));
      }
    );
  }) as any;
}

const regex = /PCI Bus (\d+), device (\d+), function (\d+)/i;
export function parseLocation(str: string) {
  const [, bus, device, func] = regex.exec(str) || ([] as any);

  return {
    bus: parseInt(bus, 10),
    device: parseInt(device, 10),
    func: parseInt(func, 10),
  };
}

export default async function getMergedGpus(): Promise<PNPDevice[]> {
  const [pnp, gpus] = await Promise.all([getPnpDevices(), getGpus()]);

  return gpus.map(gpu => {
    const pnpDevice = pnp.find(d => d.DeviceID === gpu.PNPDeviceID);
    const location = pnpDevice ? parseLocation(pnpDevice.Location) : undefined;

    return {
      ...gpu,
      Location: location,
      DeviceId: pnpDevice ? pnpDevice.DeviceID : '',
    };
  });
}

if (typeof window !== 'undefined') {
  (window as any).Devices = (window as any).Devices || {};

  (window as any).Devices.QueryWmicDevices = getMergedGpus;
}
