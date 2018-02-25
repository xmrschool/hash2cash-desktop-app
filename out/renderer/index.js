"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_dom_1 = require("react-dom");
const react_hot_loader_1 = require("react-hot-loader");
const Promise = require("bluebird");
const Root_1 = require("components/Root");
const socket_1 = require("./socket");
require("./app.global.scss");
require("api/storage");
Promise.promisifyAll(require('electron-json-storage'));
const { configureStore, history } = require('./store/configureStore');
const store = configureStore();
react_dom_1.render(React.createElement(react_hot_loader_1.AppContainer, null,
    React.createElement(Root_1.default, { store: store, history: history, socket: socket_1.default })), document.getElementById('root'));
if (module.hot) {
    module.hot.accept('components/Root', () => {
        const NextRoot = require('components/Root').default;
        react_dom_1.render(React.createElement(react_hot_loader_1.AppContainer, null,
            React.createElement(NextRoot, { store: store, history: history, socket: socket_1.default })), document.getElementById('root'));
    });
}
//# sourceMappingURL=index.js.map