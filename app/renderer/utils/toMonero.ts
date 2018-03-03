import globalState from '../mobx-store/GlobalState';
import CurrenciesService from '../mobx-store/CurrenciesService';

export default function toMonero(hashes: number) {
  const service = CurrenciesService.ticker.XMR;

  return (
   (hashes / service.difficulty) * service.blockReward * globalState.userShare
  );
}
