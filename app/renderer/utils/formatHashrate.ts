const KH = 1024;
const MH = KH * KH;

export default function formatHashrate(hashrate: number) {
  if (hashrate > MH) {
    return `${(hashrate / MH).toFixed(3)} Mh/s`
  }
  if (hashrate > KH) {
    return `${(hashrate / KH).toFixed(2)} Kh/s`;
  }

  return `${hashrate.toFixed(1)} H/s`
}