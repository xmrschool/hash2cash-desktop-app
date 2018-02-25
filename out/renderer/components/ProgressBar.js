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
const progressbar_js_1 = require("progressbar.js");
class ProgressBar extends React.Component {
    componentDidMount() {
        this.bar = new progressbar_js_1.Line(document.getElementById('init-circle'), {
            strokeWidth: 2,
            easing: 'easeInOut',
            duration: 1000,
            color: '#fecb16',
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: { width: '100%', height: '100%' },
            text: {
                style: {
                    // Text color.
                    // Default: same as stroke color (options.color)
                    color: '#fff',
                    position: 'absolute',
                    right: '0',
                    top: '30px',
                    padding: 0,
                    margin: 0,
                    transform: null,
                },
                autoStyleContainer: false,
            },
            from: { color: '#FFEA82' },
            to: { color: '#ED6A5A' },
        });
    }
    componentWillReceiveProps(nextProps) {
        const { step, text } = nextProps;
        if (text !== this.props.text) {
            this.bar.setText(text);
        }
        if (step !== this.props.step) {
            this.bar.animate(step);
            if (!text)
                this.bar.setText(Math.round(step * 100) + ' %');
        }
    }
    render() {
        const _a = this.props, { step, text } = _a, props = __rest(_a, ["step", "text"]);
        return React.createElement("div", Object.assign({ id: "init-circle" }, props));
    }
}
exports.default = ProgressBar;
//# sourceMappingURL=ProgressBar.js.map