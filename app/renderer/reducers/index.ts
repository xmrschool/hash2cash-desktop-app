import { combineReducers, Reducer } from 'redux';
import { routerReducer as routing, RouterState } from 'react-router-redux';
import runtime, { RuntimeState } from './runtime';

const rootReducer = combineReducers({
  runtime: runtime as Reducer<any>,
  routing: routing as Reducer<any>,
}) as Reducer<any>;

export interface IState {
  runtime: RuntimeState;
  routing: RouterState;
}

export default rootReducer;
