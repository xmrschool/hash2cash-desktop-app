"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const safeParse_1 = require("../utils/safeParse");
const mobx_1 = require("mobx");
class UserOptions {
    constructor() {
        this.store = {};
        this.getFromLocalStorage();
    }
    getDefaults() {
        return {
            currency: navigator.language === 'ru' ? 'RUB' : 'USD',
            locale: navigator.language === 'ru' ? 'ru_RU' : 'en_US',
        };
    }
    get(key) {
        return this.store[key];
    }
    set(key, value) {
        this.store[key] = value;
        this.commit();
        return this;
    }
    commit() {
        localStorage.options = JSON.stringify(this.store);
    }
    getFromLocalStorage() {
        const defaults = this.getDefaults();
        const savedSettings = safeParse_1.default(localStorage.settings, defaults);
        const outerSettings = Object.assign({}, defaults, savedSettings);
        Object.keys(outerSettings).forEach(d => {
            this.store[d] = outerSettings[d];
        });
    }
}
__decorate([
    mobx_1.observable
], UserOptions.prototype, "store", void 0);
exports.UserOptions = UserOptions;
exports.default = new UserOptions();
//# sourceMappingURL=UserOptions.js.map