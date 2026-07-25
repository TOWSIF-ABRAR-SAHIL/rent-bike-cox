const Decimal = require('decimal.js');

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const CURRENCIES = Object.freeze({
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
});

class Money {
  constructor(amount, currency = 'BDT') {
    if (amount instanceof Money) {
      this._paise = amount._paise;
      this._currency = amount._currency;
    } else {
      this._paise = new Decimal(Math.round((Number(amount) || 0) * 100)).toNumber();
      this._currency = currency;
    }
  }

  get paise() { return this._paise; }
  get currency() { return this._currency; }

  static fromPaisa(paise, currency = 'BDT') {
    const m = new Money(0, currency);
    m._paise = new Decimal(Math.round(Number(paise) || 0)).toNumber();
    return m;
  }

  static fromTaka(taka, currency = 'BDT') {
    return new Money(taka, currency);
  }

  static zero(currency = 'BDT') {
    return new Money(0, currency);
  }

  toTaka() {
    return new Decimal(this._paise).div(100).toNumber();
  }

  toPaisa() {
    return this._paise;
  }

  add(other) {
    this._assertSameCurrency(other);
    return Money.fromPaisa(this._paise + other._paise, this._currency);
  }

  subtract(other) {
    this._assertSameCurrency(other);
    return Money.fromPaisa(this._paise - other._paise, this._currency);
  }

  multiply(factor) {
    return Money.fromPaisa(
      new Decimal(this._paise).times(new Decimal(factor)).round().toNumber(),
      this._currency
    );
  }

  divide(divisor) {
    const d = new Decimal(divisor);
    if (d.isZero()) throw new Error('Cannot divide Money by zero');
    return Money.fromPaisa(
      new Decimal(this._paise).div(d).round().toNumber(),
      this._currency
    );
  }

  percentage(pct) {
    return this.multiply(new Decimal(pct).div(100));
  }

  isGreaterThan(other) {
    this._assertSameCurrency(other);
    return this._paise > other._paise;
  }

  isGreaterThanOrEqual(other) {
    this._assertSameCurrency(other);
    return this._paise >= other._paise;
  }

  isLessThan(other) {
    this._assertSameCurrency(other);
    return this._paise < other._paise;
  }

  isLessThanOrEqual(other) {
    this._assertSameCurrency(other);
    return this._paise <= other._paise;
  }

  equals(other) {
    return this._paise === other._paise && this._currency === other._currency;
  }

  isZero() {
    return this._paise === 0;
  }

  isPositive() {
    return this._paise > 0;
  }

  isNegative() {
    return this._paise < 0;
  }

  abs() {
    return Money.fromPaisa(Math.abs(this._paise), this._currency);
  }

  negate() {
    return Money.fromPaisa(-this._paise, this._currency);
  }

  toString() {
    const sym = CURRENCIES[this._currency]?.symbol || this._currency;
    return `${sym}${this.toTaka().toFixed(2)}`;
  }

  toJSON() {
    return { taka: this.toTaka(), paise: this._paise, currency: this._currency };
  }

  _assertSameCurrency(other) {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }
}

Money.BDT = 'BDT';
Money.USD = 'USD';
Money.CURRENCIES = CURRENCIES;

module.exports = Money;
