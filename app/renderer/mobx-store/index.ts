import loginState, { LoginState } from './LoginState';
import user, { User } from './User';
import globalState, { GlobalState } from './GlobalState';
import initializationState, {
  InitializationState,
} from './InitializationState';
import currenciesService, { CurrenciesService } from './CurrenciesService';
import runtimeError, { RuntimeError } from './RuntimeError';
import { default as reloadState, ReloadState } from './ReloadState';

export type MobxState = {
  loginState: LoginState;
  user: User;
  globalState: GlobalState;
  initializationState: InitializationState;
  currenciesService: CurrenciesService;
  runtimeError: RuntimeError;
  reloadState: ReloadState;
};

const stores = {
  loginState,
  user,
  globalState,
  initializationState,
  currenciesService,
  runtimeError,
  reloadState,
};

export default stores;
