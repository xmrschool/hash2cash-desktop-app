"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const Api_1 = require("../api/Api");
const actions_1 = require("../../shared/storage/actions");
class LoginState {
    constructor() {
        this.email = '';
        this.error = null;
        this.submitting = false;
        this.emailInfo = { allowedToContinue: false };
        this.password = '';
        this.passwordError = null;
    }
    // Email actions
    setEmail(email) {
        this.email = email;
        this.emailInfo = { allowedToContinue: false };
        if (this.error) {
            this.dispatchError(null);
            this.dispatchPasswordError(null);
        }
    }
    dispatchError(error) {
        this.error = error;
        this.submitting = false;
        return false;
    }
    // Password actions
    setPassword(password) {
        this.password = password;
        if (this.passwordError)
            this.dispatchPasswordError(null);
    }
    dispatchPasswordError(error) {
        this.passwordError = error;
        this.submitting = false;
        return false;
    }
    async attempt() {
        try {
            this.submitting = true;
            if (this.password.length < 5)
                return this.dispatchPasswordError('length of password must be at most 5');
            const response = await Api_1.default.auth.attempt({
                email: this.email,
                password: this.password,
            });
            if (!response.success) {
                if (response.error)
                    return this.dispatchPasswordError(response.error);
                return this.dispatchPasswordError('unexpected_error');
            }
            localStorage[actions_1.AUTH_TOKEN] = response.token;
            this.submitting = false;
            return true;
        }
        catch (e) {
            this.submitting = false;
            this.dispatchPasswordError(e.message);
            return false;
        }
    }
    async submit(event) {
        try {
            if (event)
                event.preventDefault();
            if (this.emailInfo.allowedToContinue)
                return this.attempt(); // We already submitted email
            this.submitting = true;
            if (!this.email.includes('@'))
                return this.dispatchError('email must contain @');
            const response = await Api_1.default.auth.emailInfo(this.email);
            if (!response.allowedToContinue) {
                return response.reason ? this.dispatchError(response.reason) : false;
            }
            this.emailInfo = response;
            this.submitting = false;
            return false;
        }
        catch (e) {
            this.submitting = false;
            this.dispatchError(e.message);
            return false;
        }
    }
}
__decorate([
    mobx_1.observable
], LoginState.prototype, "email", void 0);
__decorate([
    mobx_1.observable
], LoginState.prototype, "error", void 0);
__decorate([
    mobx_1.observable
], LoginState.prototype, "submitting", void 0);
__decorate([
    mobx_1.observable
], LoginState.prototype, "emailInfo", void 0);
__decorate([
    mobx_1.observable
], LoginState.prototype, "password", void 0);
__decorate([
    mobx_1.observable
], LoginState.prototype, "passwordError", void 0);
__decorate([
    mobx_1.action
], LoginState.prototype, "setEmail", null);
__decorate([
    mobx_1.action
], LoginState.prototype, "dispatchError", null);
__decorate([
    mobx_1.action
], LoginState.prototype, "setPassword", null);
__decorate([
    mobx_1.action
], LoginState.prototype, "dispatchPasswordError", null);
__decorate([
    mobx_1.action
], LoginState.prototype, "attempt", null);
__decorate([
    mobx_1.action
], LoginState.prototype, "submit", null);
exports.LoginState = LoginState;
exports.default = new LoginState();
//# sourceMappingURL=LoginState.js.map