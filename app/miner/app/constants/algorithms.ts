export type Algorithms = 'MoneroCryptonight' | 'ether' | 'equihash' | 'GpuCryptonight';

export const algorithmsDefaultDiff = {
  MoneroCryptonight: 3000,
  GpuCryptonight: 4000,
  ether: 10000,
  equihash: 10000,
} as { [key in Algorithms]: number };

export const algorithmsMaxDiff = {
  MoneroCryptonight: 19999,
  ether: 10000,
  GpuCryptonight: 19999,
  equihash: 10000,
} as { [key in Algorithms]: number };
