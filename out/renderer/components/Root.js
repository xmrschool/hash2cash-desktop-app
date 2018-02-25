"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_redux_1 = require("react-redux");
const react_router_redux_1 = require("react-router-redux");
const mobx_react_1 = require("mobx-react");
const routes_1 = require("routes");
const mobx_store_1 = require("mobx-store");
const SocketProvider_1 = require("./SocketProvider");
const mobx_react_devtools_1 = require("mobx-react-devtools");
const Toast_1 = require("./Toast");
function Root({ store, history, socket }) {
    const Fragment = React.Fragment;
    return (React.createElement(React.Fragment, null,
        React.createElement(mobx_react_1.Provider, Object.assign({}, mobx_store_1.default),
            React.createElement(react_redux_1.Provider, { store: store },
                React.createElement(SocketProvider_1.default, { socket: socket },
                    React.createElement(Fragment, null,
                        React.createElement(react_router_redux_1.ConnectedRouter, { history: history, store: store },
                            React.createElement(routes_1.default, null)),
                        React.createElement(Toast_1.default, null))))),
        process.env.NODE_ENV === 'development' && React.createElement(mobx_react_devtools_1.default, null)));
}
exports.default = Root;
//# sourceMappingURL=Root.js.map