import loginState, { LoginState } from './LoginState';
import user, { User } from './User';
import globalState, { GlobalState } from './GlobalState';
import initializationState, {
  InitializationState,
} from './InitializationState';

export type MobxState = {
  loginState: LoginState;
  user: User;
  globalState: GlobalState;
  initializationState: InitializationState;
};

const stores = {
  loginState,
  user,
  globalState,
  initializationState,
};

export default stores;
