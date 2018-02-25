"use strict";
const redux_1 = require("redux");
const redux_thunk_1 = require("redux-thunk");
const history_1 = require("history");
const react_router_redux_1 = require("react-router-redux");
const reducers_1 = require("reducers");
const history = history_1.createHashHistory();
const router = react_router_redux_1.routerMiddleware(history);
const enhancer = redux_1.applyMiddleware(redux_thunk_1.default, router);
module.exports = {
    history,
    configureStore(initialState) {
        return redux_1.createStore(reducers_1.default, initialState, enhancer);
    },
};
//# sourceMappingURL=configureStore.production.js.map