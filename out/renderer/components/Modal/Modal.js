"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const s = require('./Modal.scss');
function Modal(props) {
    return React.createElement("div", { className: s.modal }, props.children);
}
exports.default = Modal;
//# sourceMappingURL=Modal.js.map