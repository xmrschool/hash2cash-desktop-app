import { findAPortNotInUse } from './portfinder';

export function getPort(startingAt: number): Promise<number> {
  return findAPortNotInUse(startingAt);
}

export function timeout(ms = 5000): Promise<false> {
  return new Promise(resolve => setTimeout(() => resolve(false), ms)) as any;
}
