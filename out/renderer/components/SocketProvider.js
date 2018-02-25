"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const PropTypes = require("prop-types");
class SocketProvider extends react_1.Component {
    getChildContext() {
        return {
            socket: this.props.socket,
        };
    }
    render() {
        return this.props.children;
    }
}
SocketProvider.propTypes = {
    socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
SocketProvider.defaultProps = {
    socket: false,
};
SocketProvider.childContextTypes = {
    socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
exports.default = SocketProvider;
//# sourceMappingURL=SocketProvider.js.map