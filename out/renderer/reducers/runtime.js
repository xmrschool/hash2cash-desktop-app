"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const action_types_1 = require("store/action-types");
function runtime(state = {}, action) {
    switch (action.type) {
        case action_types_1.SET_RUNTIME_VARIABLE:
            return Object.assign({}, state, { [action.payload.name]: action.payload.value });
        default:
            return state;
    }
}
exports.default = runtime;
//# sourceMappingURL=runtime.js.map