"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_dom_1 = require("react-dom");
const mobx_react_1 = require("mobx-react");
const GlobalState_1 = require("mobx-store/GlobalState");
const cx = require("classnames");
const s = require('./Toast.css');
const close = require('../../../shared/icon/close.svg');
let Toast = class Toast extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            lastToast: undefined,
        };
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.toast) {
            this.setState({ lastToast: nextProps.toast });
        }
    }
    renderToast() {
        const shouldShow = !!this.props.toast;
        const toast = this.props.toast || this.state.lastToast || null;
        return (React.createElement("div", { className: cx(s.toast, shouldShow && s.show) },
            toast && React.createElement("div", { className: s.message }, toast.message),
            toast &&
                toast.closable && (React.createElement("div", { onClick: GlobalState_1.default.closeToast },
                React.createElement("img", { src: close })))));
    }
    render() {
        const element = document.getElementById('notify');
        if (!element) {
            console.error('Cant find a notify element with #notify id. Notifies wont show');
            return null;
        }
        return react_dom_1.createPortal(this.renderToast(), element);
    }
};
Toast = __decorate([
    mobx_react_1.inject((state) => ({ toast: state.globalState.toast })),
    mobx_react_1.observer
], Toast);
exports.default = Toast;
//# sourceMappingURL=Toast.js.map