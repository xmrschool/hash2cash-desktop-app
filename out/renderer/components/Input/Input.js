"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const cx = require("classnames");
const s = require('./Input.css');
class Input extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            shaking: false,
        };
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.error !== this.props.error && nextProps.error !== null) {
            return this.shake();
        }
    }
    shake() {
        this.setState({ shaking: true });
        setTimeout(() => this.setState({ shaking: false }), 430);
    }
    render() {
        const _a = this.props, { label, placeholder, className, error } = _a, inputProps = __rest(_a, ["label", "placeholder", "className", "error"]);
        const shouldShake = this.state.shaking;
        return (React.createElement("div", { className: s.root },
            React.createElement("span", { className: s.label }, label || placeholder),
            React.createElement("div", { className: s.inputContainer },
                React.createElement("input", Object.assign({ className: cx(s.input, className, shouldShake && s.shaking) }, inputProps)),
                !!error && React.createElement("div", { className: s.error }, error))));
    }
}
exports.default = Input;
//# sourceMappingURL=Input.js.map