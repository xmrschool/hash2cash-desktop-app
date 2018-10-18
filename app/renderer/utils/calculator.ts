export function calculateMiningShare(speed: number, ticker: any): number {
  const totalSpeed = ticker.totalHashrate;
  // ToDo integer bug in Chrome, which produce invalid results...
  return speed / (totalSpeed + 0.000001 + speed);
}

export function calculateReturnPerDay(
  miningShare: number,
  ticker: any
): number {
  return miningShare * 86400 / ticker.blockTime * ticker.blockReward;
}

export default function calculateDailyReturn(speed: number, ticker: any) {
  const miningShare = calculateMiningShare(speed, ticker);

  return (
    calculateReturnPerDay(miningShare, ticker) * ((ticker.share || 60) / 100)
  );
}
