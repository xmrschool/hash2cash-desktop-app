"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const cx = require("classnames");
const Home_1 = require("scenes/Home/Home");
const sleep_1 = require("utils/sleep");
const Button_1 = require("components/Button");
const s = require('./Dashboard.css');
class Dashboard extends React.Component {
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
    async navigate() {
        await this.disappear();
        return this.props.history.push('/init');
    }
    render() {
        return (React.createElement("div", { className: cx(s.root, this.state.appeared && s.appeared) },
            React.createElement("h2", null, "To start, we need to clarify some things"),
            React.createElement("p", { className: s.hey }, "Some antiviruses are taking our app as virus. And the reason for this is apps which mine cryptocurrency without a user's contest. Hash to cash \u2013 is not a virus. Antivirus can't detect if a user gives permission, so it just bans every miner."),
            React.createElement("p", null, "If your antivirus made a mistake, add the Hash to Cash app folder to antivirus exception list."),
            React.createElement("p", { className: s.time }, "We need about 7 minutes to download miner binaries and do benchmark test. Please, be patient"),
            React.createElement("div", { className: s.button },
                React.createElement(Button_1.default, { onClick: () => this.navigate() }, "Ok, start"))));
    }
}
exports.default = Dashboard;
//# sourceMappingURL=Dashboard.js.map