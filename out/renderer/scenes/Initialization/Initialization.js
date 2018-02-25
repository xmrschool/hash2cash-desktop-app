"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const mobx_react_1 = require("mobx-react");
const cx = require("classnames");
const Home_1 = require("scenes/Home/Home");
const sleep_1 = require("utils/sleep");
const InitializationState_1 = require("mobx-store/InitializationState");
const MinerObserver_1 = require("mobx-store/MinerObserver");
const collector_1 = require("../../../shared/hardware/collector");
const ProgressBar_1 = require("../../components/ProgressBar");
const Modal_1 = require("../../components/Modal/Modal");
const Button_1 = require("../../components/Button/Button");
const s = require('./Initialization.scss');
const warning = require('./warning.svg');
const debug = require('debug')('app:init');
let initializationState = InitializationState_1.default;
let Initialization = class Initialization extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            appeared: false,
        };
    }
    componentDidMount() {
        setTimeout(() => this.setState({ appeared: true }), 10);
        this.action();
    }
    componentWillUnmount() {
        this.disappear();
    }
    async disappear() {
        this.setState({ appeared: false });
        await sleep_1.sleep(Home_1.ANIMATION_TIME);
    }
    async action() {
        try {
            const hardware = await collector_1.default();
            initializationState.setHardware(hardware);
            initializationState.setStep(1 / 7);
            debug('1/7, hardware collected: ', hardware);
            initializationState.setStep(2 / 7);
            initializationState.setStatus('Fetching download manifest...');
            const manifest = await initializationState.fetchManifest();
            debug('2/7, fetched manifest: ', manifest);
            initializationState.setStep(3 / 7);
            initializationState.setStatus('Downloading binaries...');
            await initializationState.downloadBinaries();
            debug('3/7 benchmarking');
            initializationState.bechmarking = true;
            await initializationState.benchmark();
        }
        catch (e) { }
    }
    formatPower(device) {
        return device.type === 'cpu'
            ? `${parseFloat(device.collectedInfo.speed)}GHz * ${device.collectedInfo.cores}`
            : `${device.collectedInfo.vram}Gb VRAM`;
    }
    buildKey(device) {
        return device.type === 'gpu' ? device.deviceID : 'cpu';
    }
    renderModel(device) {
        if (device.type === 'gpu' && device.unavailableReason) {
            return (React.createElement("div", { style: { flexGrow: 1 } },
                React.createElement("div", { className: s.unavailable },
                    React.createElement("span", { className: s.model }, device.model),
                    React.createElement("img", { className: s.warning, src: warning })),
                React.createElement("div", { className: s.reasonContainer }, device.unavailableReason)));
        }
        return React.createElement("span", { className: s.model }, device.model);
    }
    async reload() {
        initializationState = new InitializationState_1.InitializationState();
        this.forceUpdate();
        await sleep_1.sleep(1000);
        this.action();
    }
    renderBenchmarkDetails() {
        return (React.createElement("div", null, MinerObserver_1.default.workers.map(worker => (React.createElement("div", { key: worker.name, className: cx(s.hardware) },
            React.createElement("span", null, worker.name),
            React.createElement("span", { className: s.power }, MinerObserver_1.default.dailyProfit(worker)))))));
    }
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: cx(s.root, this.state.appeared && s.appeared, initializationState.downloadError && s.blurred) },
                React.createElement("h2", null, initializationState.status),
                React.createElement(ProgressBar_1.default, { className: s.circle, step: initializationState.step, text: initializationState.progressText }),
                React.createElement("div", { className: s.hardwares }, initializationState.hardware &&
                    initializationState.hardware.devices.map(device => (React.createElement("div", { key: this.buildKey(device), className: cx(s.hardware, device.unavailableReason && s.behind) },
                        React.createElement("span", { className: s.badge }, device.type),
                        this.renderModel(device),
                        React.createElement("span", { className: s.power }, this.formatPower(device)))))),
                initializationState.bechmarking && this.renderBenchmarkDetails()),
            initializationState.downloadError && (React.createElement(Modal_1.default, null,
                React.createElement("h2", null, "It seems that error happened"),
                React.createElement("p", { style: { opacity: 0.6 } },
                    "Failed to download miner",
                    ' ',
                    initializationState.downloadError.miner.name,
                    " (",
                    initializationState.downloadError.message,
                    ")"),
                React.createElement("p", null, "You can try again, or if you think that problem is on our side, get us in touch"),
                React.createElement(Button_1.default, { onClick: () => this.reload(), style: { marginTop: 40 } }, "Try again")))));
    }
};
Initialization = __decorate([
    mobx_react_1.inject((state) => state.initializationState),
    mobx_react_1.observer
], Initialization);
exports.default = Initialization;
//# sourceMappingURL=Initialization.js.map