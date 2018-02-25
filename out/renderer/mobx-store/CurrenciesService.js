"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-use-before-define */
const EventEmitter = require("events");
const mobx_1 = require("mobx");
const socket_1 = require("../socket");
const debug = require('debug')('app:services:currencies');
var AllowedCurrenciesEnum;
(function (AllowedCurrenciesEnum) {
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["USD"] = 0] = "USD";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["RUB"] = 1] = "RUB";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["BTC"] = 2] = "BTC";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["ETH"] = 3] = "ETH";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["XMR"] = 4] = "XMR";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["ZEC"] = 5] = "ZEC";
    AllowedCurrenciesEnum[AllowedCurrenciesEnum["XRP"] = 6] = "XRP";
})(AllowedCurrenciesEnum = exports.AllowedCurrenciesEnum || (exports.AllowedCurrenciesEnum = {}));
exports.currencies = ['USD', 'RUB', 'BTC', 'ETH', 'XMR', 'ZEC', 'XRP'];
const fiatCurrency = {
    type: 'fiat',
    allowedExchangeDirections: ['RUB', 'XRP', 'USD'],
    precision: 2,
};
const cryptoCurrency = {
    type: 'crypto',
    allowedExchangeDirections: ['RUB', 'XRP', 'USD', 'BTC', 'ETH'],
    precision: 10,
};
const defaultOptions = {
    USD: Object.assign({}, fiatCurrency, { priceUsd: 1, precision: 2 }),
    RUB: fiatCurrency,
    BTC: cryptoCurrency,
    ETH: cryptoCurrency,
    XMR: cryptoCurrency,
    ZEC: cryptoCurrency,
    XRP: {
        type: 'crypto',
        allowedExchangeDirections: ['RUB', 'XRP', 'USD', 'BTC', 'ETH'],
        precision: 2,
    },
};
class CurrencyInstance {
    constructor(currency) {
        Object.assign(this, currency);
    }
    exchange(to, amount) {
        return currenciesService.exchange(this.symbol, to, amount);
    }
}
exports.CurrencyInstance = CurrencyInstance;
let currenciesService;
class CurrenciesService extends EventEmitter {
    constructor() {
        super();
        this.ticker = {};
        setTimeout(() => this.subscribeToTickerUpdates(), 1000);
    }
    async subscribeToTickerUpdates() {
        console.log('socket is: ', socket_1.default);
        socket_1.default.on('tickerUpdated', (ticker) => this.setTicker(ticker));
    }
    asArray() {
        const keys = Object.keys(this.ticker);
        return keys.reduce((left, right) => left.push(this.ticker[right]), []);
    }
    possibleToExchange(from, to) {
        return this.ticker[from].allowedExchangeDirections.includes(to);
    }
    exchange(from, to, amount) {
        // Amount means from
        if (!this.ticker)
            throw new Error('ticker.unavailable');
        if (!this.possibleToExchange(from, to))
            throw new Error('exchange.unpossible');
        const currencyFrom = this.ticker[from];
        const currencyTo = this.ticker[to];
        return +(amount * currencyFrom.priceUsd / currencyTo.priceUsd).toFixed(currencyTo.precision);
    }
    setTicker(ticker) {
        debug('Recieved ticker: ', ticker);
        ticker.forEach(currency => {
            const assigned = Object.assign({}, defaultOptions[currency.symbol], currency);
            this.ticker[currency.symbol] = new CurrencyInstance(assigned);
        });
        this.emit('updated', this.ticker);
    }
    setTickerFromObject(ticker) {
        Object.keys(ticker).forEach(key => {
            this.ticker[key] = new CurrencyInstance(ticker[key]);
        });
    }
    get USD() {
        return this.ticker.USD;
    }
    get RUB() {
        return this.ticker.RUB;
    }
    get ETH() {
        return this.ticker.ETH;
    }
    get XMR() {
        return this.ticker.XMR;
    }
    get ZEC() {
        return this.ticker.ZEC;
    }
    get XRP() {
        return this.ticker.XRP;
    }
}
__decorate([
    mobx_1.observable
], CurrenciesService.prototype, "ticker", void 0);
exports.CurrenciesService = CurrenciesService;
exports.default = new CurrenciesService();
//# sourceMappingURL=CurrenciesService.js.map