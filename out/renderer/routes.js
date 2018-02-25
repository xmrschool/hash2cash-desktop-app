"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_router_1 = require("react-router");
const Home_1 = require("scenes/Home");
const LoginContainer_1 = require("scenes/LoginContainer");
const Dashboard_1 = require("scenes/Dashboard");
const Initialization_1 = require("scenes/Initialization");
const Routes = () => {
    console.log('Routes are being rendered');
    return (React.createElement(react_router_1.Switch, null,
        React.createElement(react_router_1.Route, { exact: true, path: "/login", component: LoginContainer_1.default }),
        React.createElement(react_router_1.Route, { exact: true, path: "/dashboard", component: Dashboard_1.default }),
        React.createElement(react_router_1.Route, { exact: true, path: "/init", component: Initialization_1.default }),
        React.createElement(react_router_1.Route, { exact: true, path: "/", component: Home_1.default })));
};
exports.default = Routes;
//# sourceMappingURL=routes.js.map