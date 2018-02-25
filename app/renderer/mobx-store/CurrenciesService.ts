/* eslint-disable no-use-before-define */
import * as EventEmitter from 'events';
import { observable } from 'mobx';
import socket from '../socket';

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

const cryptoCurrency = {
  type: 'crypto',
  allowedExchangeDirections: ['RUB', 'XRP', 'USD', 'BTC', 'ETH'],
  precision: 10,
};

const defaultOptions = {
  USD: {
    ...fiatCurrency,
    priceUsd: 1,
    unicodeSymbol: ' $',
    precision: 2,
  },
  RUB: {
    ...fiatCurrency,
    unicodeSymbol: '₽',
  },
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

export class CurrencyInstance {
  /* eslint-disable */
  name!: string;
  type!: AllowedTypes;
  symbol!: AllowedCurrencies;
  unicodeSymbol: string = '';

  blockReward!: number;
  difficulty!: number;
  profitability!: number;

  priceUsd!: number;
  priceBtc?: number;
  priceRub?: number;

  allowedExchangeDirections!: any[]; // second argument is fee
  exchangeFee!: number;
  precision!: number;
  shapeshiftAllowed!: boolean;

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
  private amount: number;
  instance: CurrencyInstance;

  public constructor(amount: number, instance: CurrencyInstance) {
    console.log('caleld with ', amount, instance);
    this.amount = amount;
    this.instance = instance;
  }

  public float() {
    return this.amount;
  }

  public formatted() {
    console.log(this.amount, this.instance.unicodeSymbol);
    return this.amount + this.instance.unicodeSymbol;
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
let currenciesService: CurrenciesService;
export class CurrenciesService extends EventEmitter {
  @observable ticker: Ticker = {};

  constructor() {
    super();

    setTimeout(() => this.subscribeToTickerUpdates(), 1000);
  }

  async subscribeToTickerUpdates() {
    console.log('socket is: ', socket);
    socket.on('tickerUpdated', (ticker: any) => this.setTicker(ticker));
  }

  asArray(): Currency[] {
    const keys: string[] = Object.keys(this.ticker);

    return keys.reduce<CurrencyInstance[]>(
      (left: any, right) => left.push(this.ticker[right]),
      []
    );
  }

  possibleToExchange(from: AllowedCurrencies, to: AllowedCurrencies) {
    return this.ticker[from].allowedExchangeDirections.includes(to);
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

  setTicker(ticker: Currency[]) {
    debug('Recieved ticker: ', ticker);

    ticker.forEach(currency => {
      console.log(
        'default is: ',
        defaultOptions[currency.symbol],
        currency.symbol
      );
      const assigned = Object.assign(
        {},
        defaultOptions[currency.symbol],
        currency
      );

      this.ticker[currency.symbol] = new CurrencyInstance(assigned);
    });

    this.emit('updated', this.ticker);
  }

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

export default new CurrenciesService();
