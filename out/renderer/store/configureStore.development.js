"use strict";
const redux_1 = require("redux");
const redux_thunk_1 = require("redux-thunk");
const history_1 = require("history");
const react_router_redux_1 = require("react-router-redux");
const redux_logger_1 = require("redux-logger");
const reducers_1 = require("reducers");
const actionCreators = { push: react_router_redux_1.push };
const logger = redux_logger_1.createLogger({
    level: 'info',
    collapsed: true,
});
const history = history_1.createHashHistory();
const router = react_router_redux_1.routerMiddleware(history);
// If Redux DevTools Extension is installed use it, otherwise use Redux compose
/* eslint-disable no-underscore-dangle */
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        actionCreators,
    })
    : redux_1.compose;
/* eslint-enable no-underscore-dangle */
const enhancer = composeEnhancers(redux_1.applyMiddleware(redux_thunk_1.default, router, logger));
module.exports = {
    history,
    configureStore(initialState) {
        const store = redux_1.createStore(reducers_1.default, initialState, enhancer);
        if (module.hot) {
            module.hot.accept('../reducers', () => store.replaceReducer(require('reducers')) // eslint-disable-line global-require
            );
        }
        return store;
    },
};
//# sourceMappingURL=configureStore.development.js.map