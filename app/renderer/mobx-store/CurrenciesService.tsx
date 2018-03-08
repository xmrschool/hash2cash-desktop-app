/* eslint-disable no-use-before-define */
import * as React from 'react';
import * as EventEmitter from 'events';
import { observable, computed, action } from 'mobx';
import socket from '../socket';
import userOptions from './UserOptions';

const debug = require('debug')('app:services:currencies');

export enum AllowedCurrenciesEnum {
  'USD',
  'RUB',
  'BTC',
  'ETH',
  'XMR',
  'ZEC',
  'XRP',
}
export type AllowedCurrencies =
  | 'USD'
  | 'RUB'
  | 'BTC'
  | 'ETH'
  | 'XMR'
  | 'ZEC'
  | 'XRP';
export type AllowedTypes = 'fiat' | 'crypto';
export const currencies = ['USD', 'RUB', 'BTC', 'ETH', 'XMR', 'ZEC', 'XRP'];

export type Currency = {
  type: AllowedTypes;
  name: string;
  symbol: AllowedCurrencies;

  blockReward: number;
  difficulty: number;

  priceUsd: number;
  priceBtc?: number;
  priceRub?: number;

  allowedExchangeDirections: any[]; // second argument is fee
  exchangeFee: number;
  precision: number;
  shapeshiftAllowed: boolean;
};

const fiatCurrency = {
  type: 'fiat',
  allowedExchangeDirections: ['RUB', 'XRP', 'USD'],
  precision: 2,
};

const cryptoCurrency = (d: any) => ({
  type: 'crypto',
  allowedExchangeDirections: ['RUB', 'XRP', 'USD', 'BTC', 'ETH'],
  precision: 10,
  ...d,
});

const defaultOptions = {
  USD: {
    ...fiatCurrency,
    name: 'U.S. Dollar',
    priceUsd: 1,
    unicodeSymbol: ' $',
    precision: 2,
  },
  RUB: {
    ...fiatCurrency,
    name: 'Ruble',
    unicodeSymbol: '₽',
  },
  BTC: cryptoCurrency({ name: 'Bitcoin' }),
  ETH: cryptoCurrency({ name: 'Ethereum' }),
  XMR: cryptoCurrency({ name: 'Monero' }),
  ZEC: cryptoCurrency({ name: 'Zcash' }),
  XRP: {
    type: 'crypto',
    name: 'Ripple',
    allowedExchangeDirections: ['RUB', 'XRP', 'USD', 'BTC', 'ETH'],
    precision: 2,
  },
};

export class CurrencyInstance {
  /* eslint-disable */
  @observable name!: string;
  @observable type!: AllowedTypes;
  @observable symbol!: AllowedCurrencies;
  @observable unicodeSymbol: string = '';

  @observable blockReward!: number;
  @observable difficulty!: number;
  @observable profitability!: number;

  @observable priceUsd!: number;
  @observable priceBtc?: number;
  @observable priceRub?: number;

  @observable allowedExchangeDirections!: any[]; // second argument is fee
  @observable exchangeFee!: number;
  @observable precision!: number;
  @observable shapeshiftAllowed!: boolean;

  constructor(currency: Currency) {
    Object.assign(this, currency);
  }

  exchange(to: AllowedCurrencies, amount: number) {
    return currenciesService.exchange(this.symbol, to, amount);
  }
}
/* eslint-enable */

export type Ticker = {
  [key: string]: CurrencyInstance;
};

export class CurrencyNumber {
  private readonly amount: number;
  private readonly instance: CurrencyInstance;

  public constructor(amount: number, instance: CurrencyInstance) {
    this.amount = amount;
    this.instance = instance;
  }

  get typeOf() {
    return this.instance;
  }

  public float() {
    return this.amount;
  }

  public formatted() {
    const fixedAmount = +this.amount.toFixed(this.instance.precision);

    return fixedAmount.toLocaleString() + this.instance.unicodeSymbol;
  }

  public reactFormatted() {
    const fixedAmount = +this.amount.toFixed(this.instance.precision);

    return (
      <span>
        {fixedAmount.toLocaleString()}
        <span
          className="currencySymbol"
          style={{ fontSize: '80%', opacity: 0.5, marginLeft: 5 }}
        >
          {this.instance.unicodeSymbol}
        </span>
      </span>
    );
  }

  public decimals() {
    const splitted = this.amount.toString().split('.');

    if (splitted.length > 1) {
      return splitted[1];
    }

    return 0;
  }

  public withoutDecimals() {
    return parseInt(this.amount as any);
  }
}

export class CurrenciesService extends EventEmitter {
  @observable ticker: Ticker = {};

  constructor() {
    super();

    this.tryToGetFromStorage();
    setTimeout(() => this.subscribeToTickerUpdates(), 1000);
  }

  async subscribeToTickerUpdates() {
    socket.on('tickerUpdated', (ticker: any) => this.setTicker(ticker));
  }

  asArray(): Currency[] {
    const keys: string[] = Object.keys(this.ticker);

    return keys.reduce<CurrencyInstance[]>(
      (left: any, right) => left.push(this.ticker[right]),
      []
    );
  }

  getCurrencyName(symbol: AllowedCurrencies | string | undefined): string {
    if (typeof symbol === 'undefined') {
      return 'Undefined symbol';
    }

    if (currencies.includes(symbol)) {
      return this.ticker[symbol].name;
    }

    return symbol;
  }

  possibleToExchange(from: AllowedCurrencies, to: AllowedCurrencies) {
    return this.ticker[from].allowedExchangeDirections.includes(to);
  }

  toLocalCurrency(from: AllowedCurrencies, amount: number): CurrencyNumber {
    return this.exchange(
      from,
      userOptions.get('currency') as AllowedCurrencies,
      amount
    );
  }

  exchange(
    from: AllowedCurrencies,
    to: AllowedCurrencies,
    amount: number
  ): CurrencyNumber {
    // Amount means from
    if (!this.ticker) throw new Error('ticker.unavailable');
    if (!this.possibleToExchange(from, to))
      throw new Error('exchange.unpossible');

    const currencyFrom = this.ticker[from];
    const currencyTo = this.ticker[to];

    return new CurrencyNumber(
      +(+(amount * currencyFrom.priceUsd / currencyTo.priceUsd).toFixed(
        currencyTo.precision
      )),
      currencyTo
    );
  }

  tryToGetFromStorage() {
    try {
      if (localStorage.ticker) {
        this.setTicker(JSON.parse(localStorage.ticker));
      }
    } catch (e) {}
  }

  @action
  setTicker(ticker: Currency[]) {
    debug('Recieved ticker: ', ticker);

    localStorage.ticker = JSON.stringify(ticker);
    ticker.forEach(currency => {
      const assigned = Object.assign(
        {},
        defaultOptions[currency.symbol],
        currency
      );

      this.ticker[currency.symbol] = new CurrencyInstance(assigned);
    });

    this.emit('updated', this.ticker);
  }

  @action
  setTickerFromObject(ticker: { [key: string]: Currency }) {
    Object.keys(ticker).forEach(key => {
      const value = ticker[key];

      const assigned = Object.assign(
        {},
        defaultOptions[value.symbol],
        ticker[key]
      );

      this.ticker[key] = new CurrencyInstance(assigned);
    });
  }
  @computed
  get USD() {
    return this.ticker.USD;
  }
  @computed
  get RUB() {
    return this.ticker.RUB;
  }
  @computed
  get ETH() {
    return this.ticker.ETH;
  }
  @computed
  get XMR() {
    return this.ticker.XMR;
  }
  @computed
  get ZEC() {
    return this.ticker.ZEC;
  }
  @computed
  get XRP() {
    return this.ticker.XRP;
  }
}

const currenciesService = new CurrenciesService();

export default currenciesService;