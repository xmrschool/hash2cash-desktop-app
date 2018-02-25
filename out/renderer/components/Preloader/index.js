"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const styles = require('./Preloader.css');
const Preloader = ({ size }) => {
    const elementStyles = size ? { '--preloader-size': size + 'px' } : undefined;
    return (React.createElement("div", { className: styles.ball, style: elementStyles },
        React.createElement("div", null),
        React.createElement("div", null),
        React.createElement("div", null)));
};
exports.default = Preloader;
//# sourceMappingURL=index.js.map