"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("socket");
const debug = require('debug')('app:socket');
function builder(method) {
    return function query(data) {
        return new Promise((resolve, reject) => {
            debug(`[${method}] =>`, data);
            setTimeout(() => reject('Timeout error'), 4000);
            socket_1.default.emit(method, data, (response) => {
                debug(`[${method}] <=`, response);
                resolve(response);
            });
        });
    };
}
exports.builder = builder;
exports.default = {
    auth: {
        emailInfo: builder('auth.emailInfo'),
        attempt: builder('auth.attempt'),
        attach: builder('auth.attach'),
    },
    mining: {
        manifest: builder('mining.manifest'),
    },
};
//# sourceMappingURL=Api.js.map