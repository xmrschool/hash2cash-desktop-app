import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { defaultStrategy, runStrategy } from './strategy';

export function triggerDisable() {
  LocalStorage.smartStrategy = false;
  enableStrategyIfNeeded();
}

export function enableStrategyIfNeeded() {
  if (LocalStorage.smartStrategy) {
    console.log('Running strategy: ');
    runStrategy(localStorage.strategyCode || defaultStrategy)
  } else {
    if ((window as any).currentStrategyHandler) {
      (window as any).currentStrategyHandler.stop();
    }
  }
}