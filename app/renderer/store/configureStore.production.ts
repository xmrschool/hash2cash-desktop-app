import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createHashHistory } from 'history';
import { routerMiddleware } from 'react-router-redux';
import rootReducer from 'reducers';

const history = createHashHistory();
const router = routerMiddleware(history);
const enhancer = applyMiddleware(thunk, router);

export = {
  history,
  configureStore(initialState: Object | void) {
    return createStore(rootReducer, initialState, enhancer);
  },
};
