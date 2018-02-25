"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const cx = require("classnames");
const mobx_react_1 = require("mobx-react");
const Input_1 = require("components/Input");
const Button_1 = require("components/Button");
const Logo_1 = require("components/Logo");
const socket_1 = require("utils/socket");
const LoginState_1 = require("mobx-store/LoginState");
const Home_1 = require("../Home/Home");
const sleep_1 = require("../../utils/sleep");
const s = require('./Login.css');
let LoginContainer = class LoginContainer extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            appeared: false,
        };
    }
    componentDidMount() {
        setTimeout(() => this.setState({ appeared: true }), 10);
    }
    componentWillUnmount() {
        this.disappear();
    }
    async disappear() {
        this.setState({ appeared: false });
        await sleep_1.sleep(Home_1.ANIMATION_TIME);
    }
    renderSecondView() {
        const hasAccount = LoginState_1.default.emailInfo.hasAccount;
        return (React.createElement("div", { className: s.secondView },
            React.createElement(Input_1.default, { value: LoginState_1.default.password, onChange: event => LoginState_1.default.setPassword(event.target.value), type: "password", label: "password", autoFocus: true, placeholder: "your@mail.com", error: LoginState_1.default.passwordError }),
            React.createElement("p", { className: s.warn }, hasAccount ? ('Welcome back! Enter you password to get in') : (React.createElement("span", null, "Using our service you agree with our ToS and privacy policy")))));
    }
    async submit(event) {
        event.preventDefault();
        if (await LoginState_1.default.submit()) {
            await this.disappear();
            this.props.history.push('/dashboard');
        }
    }
    render() {
        const { allowedToContinue, hasAccount } = LoginState_1.default.emailInfo;
        return (React.createElement("form", { onSubmit: event => this.submit(event) },
            React.createElement("div", { className: cx(s.root, this.state.appeared && s.appeared) },
                React.createElement("div", { className: s.container },
                    React.createElement("div", { className: s.logoContainer },
                        React.createElement(Logo_1.default, { className: s.logo })),
                    React.createElement(Input_1.default, { value: LoginState_1.default.email, onChange: event => LoginState_1.default.setEmail(event.target.value), label: "your email", placeholder: "your@mail.com", error: LoginState_1.default.error }),
                    allowedToContinue && this.renderSecondView(),
                    React.createElement("div", { className: s.loginContainer },
                        React.createElement(Button_1.default, { disabled: LoginState_1.default.submitting, type: "submit" }, allowedToContinue
                            ? hasAccount ? 'Login' : 'Register'
                            : 'Next'))))));
    }
};
LoginContainer = __decorate([
    socket_1.default,
    mobx_react_1.observer
], LoginContainer);
exports.default = LoginContainer;
//# sourceMappingURL=LoginContainer.js.map