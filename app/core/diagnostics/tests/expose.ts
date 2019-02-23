import { PoolResolver } from './poolResolver';
import { LocalStorage } from '../../../renderer/utils/LocalStorage';

if (typeof window !== 'undefined') {
  (window as any).checkPools = async () => {
    const resolver = new PoolResolver();

    console.log("We're on it...");
    await resolver.resolve();

    if (LocalStorage.poolsReport) {
      let output = '';
      LocalStorage.poolsReport.forEach(value => {
        output +=
          `[${value.isTls ? '🔒' : '  '}] ${value.host}:${value.port}`.padEnd(
            30
          ) + ` - ${value.isOk ? 'OK!' : 'Failed to connect'}\n`;
      });

      console.log(output);
    }
  };
}
