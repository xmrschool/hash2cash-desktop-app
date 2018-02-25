"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LoginState_1 = require("./LoginState");
const User_1 = require("./User");
const GlobalState_1 = require("./GlobalState");
const InitializationState_1 = require("./InitializationState");
const stores = {
    loginState: LoginState_1.default,
    user: User_1.default,
    globalState: GlobalState_1.default,
    initializationState: InitializationState_1.default,
};
exports.default = stores;
//# sourceMappingURL=index.js.map