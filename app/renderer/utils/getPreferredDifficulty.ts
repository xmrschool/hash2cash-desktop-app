// Hashrate per second multiplied by 60 seconds
export default function getDifficulty(algorithm: string) {
  try {
    const benchmarks = JSON.parse(localStorage.benchmarks).data;

    return benchmarks[algorithm].hashrate * 60;
  } catch (e) {
    // 3000 is default
    return 3000;
  }
}