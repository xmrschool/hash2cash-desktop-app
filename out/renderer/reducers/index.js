"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redux_1 = require("redux");
const react_router_redux_1 = require("react-router-redux");
const runtime_1 = require("./runtime");
const rootReducer = redux_1.combineReducers({
    runtime: runtime_1.default,
    routing: react_router_redux_1.routerReducer,
});
exports.default = rootReducer;
//# sourceMappingURL=index.js.map