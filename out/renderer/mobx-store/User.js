"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const actions_1 = require("../../shared/storage/actions");
const Api_1 = require("../api/Api");
const debug = require('debug')('app:mobx:user');
class User {
    constructor() {
        this.authenticated = false;
        this.accounts = [];
        this.profile = {};
        this.attachError = false;
        if (localStorage[actions_1.AUTH_TOKEN]) {
            debug('We have jwt token in localStorage, so we setting it');
            this.setToken(localStorage[actions_1.AUTH_TOKEN]);
        }
    }
    setToken(jwtToken) {
        this.jwtToken = jwtToken;
    }
    setUser(user) {
        debug('Setting user: ', user);
        Object.assign(this, user);
    }
    async attemptToLogin() {
        if (!this.jwtToken)
            return false;
        const resp = await Api_1.default.auth.attach(this.jwtToken);
        debug('Authentication result:', resp);
        if (!resp.success && resp.error) {
            this.attachError = resp.error;
            return false;
        }
        if (resp.user) {
            this.setUser(resp.user);
            this.authenticated = true;
            return resp.user;
        }
        return false;
    }
}
__decorate([
    mobx_1.observable
], User.prototype, "jwtToken", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "id", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "email", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "createdAt", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "authenticated", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "accounts", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "profile", void 0);
__decorate([
    mobx_1.observable
], User.prototype, "attachError", void 0);
__decorate([
    mobx_1.action
], User.prototype, "setToken", null);
__decorate([
    mobx_1.action
], User.prototype, "setUser", null);
__decorate([
    mobx_1.action
], User.prototype, "attemptToLogin", null);
exports.User = User;
exports.default = new User();
//# sourceMappingURL=User.js.map