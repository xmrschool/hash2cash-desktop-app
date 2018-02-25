"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const PropTypes = require("prop-types");
function socketConnect(Target) {
    function SocketConnect(props, context) {
        return react_1.createElement(Target, Object.assign({}, props, {
            socket: context.socket,
        }));
    }
    SocketConnect.contextTypes = {
        socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    };
    return SocketConnect;
}
exports.default = socketConnect;
//# sourceMappingURL=socket.js.map