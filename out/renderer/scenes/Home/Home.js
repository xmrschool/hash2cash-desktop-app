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
const Preloader_1 = require("components/Preloader");
const sleep_1 = require("utils/sleep");
const socket_1 = require("utils/socket");
const GlobalState_1 = require("mobx-store/GlobalState");
const User_1 = require("mobx-store/User");
const s = require('./Home.css');
exports.ANIMATION_TIME = 200;
let HomePage = class HomePage extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            animating: false,
        };
    }
    componentDidMount() {
        console.log('entered: ', this, window.location);
        this.onEntered();
    }
    async disappear() {
        this.setState({ animating: true });
        await sleep_1.sleep(exports.ANIMATION_TIME);
    }
    async onEntered() {
        await GlobalState_1.default.connectionPromise;
        await User_1.default.attemptToLogin();
        await this.disappear();
        this.props.history.push(User_1.default.authenticated ? '/dashboard' : '/login');
    }
    render() {
        return (React.createElement("div", { className: cx(s.root, this.state.animating && s.animating) },
            React.createElement(Preloader_1.default, { size: 100 })));
    }
};
HomePage = __decorate([
    socket_1.default
], HomePage);
exports.HomePage = HomePage;
exports.default = HomePage;
//# sourceMappingURL=Home.js.map