import loginState, { LoginState } from './LoginState';
import user, { User } from './User';
import globalState, { GlobalState } from './GlobalState';
import initializationState, {
  InitializationState,
} from './InitializationState';
import currenciesService, { CurrenciesService } from './CurrenciesService';

export type MobxState = {
  loginState: LoginState;
  user: User;
  globalState: GlobalState;
  initializationState: InitializationState;
  currenciesService: CurrenciesService;
};

const stores = {
  loginState,
  user,
  globalState,
  initializationState,
  currenciesService,
};

export default stores;
