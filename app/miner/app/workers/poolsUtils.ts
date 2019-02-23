import { LocalStorage } from '../../../renderer/utils/LocalStorage';

// This applies only for Monero. Usually firewalls are only used in there.
// ToDo for ETH
export function getAlivePool(algo: string, isTls = false): string | null {
  const alivePools = LocalStorage.poolsReport;

  if (alivePools && algo === 'cryptonight') {
    const arrayOfLivePools = alivePools.filter(d => d.isOk);

    if (isTls) {
      const { host, port } = arrayOfLivePools.find(d => d.isTls)!;
      return `${host}:${port}`;
    } else {
      const { host, port } = arrayOfLivePools.find(d => !d.isTls)!;
      return `${host}:${port}`;
    }
  }

  const pool = LocalStorage.appInfo!.pools[algo];

  if (pool) {
    // Temporarily workaround before this fixed on backend
    return isTls ? (pool.tlsUrl || 'xmr.pool.hashto.cash:443') : pool.url;
  }

  return null;
}
