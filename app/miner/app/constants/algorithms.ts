export type Algorithms = 'cryptonight' | 'ether' | 'equihash';

export const algorithmsDefaultDiff = {
  cryptonight: 3000,
  ether: 10000,
  equihash: 10000,
} as { [key in Algorithms]: number };

export const algorithmsMaxDiff = {
  cryptonight: 50000,
  ether: 10000,
  equihash: 10000,
} as { [key in Algorithms]: number };
