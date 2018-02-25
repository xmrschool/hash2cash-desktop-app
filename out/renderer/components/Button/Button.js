"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const cx = require("classnames");
const s = require('./Button.css');
const Button = (props) => {
    const className = props.className ? cx(s.button, props.disabled && s.disabled, props.className) : cx(s.button, props.disabled && s.disabled);
    return React.createElement("button", Object.assign({ className: className }, props));
};
exports.default = Button;
//# sourceMappingURL=Button.js.map