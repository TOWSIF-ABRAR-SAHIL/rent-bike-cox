const Decimal = require('decimal.js');

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(value) {
  return new Decimal(value || 0);
}

function roundPaisa(value) {
  return toDecimal(value).round().toNumber();
}

function addPaisa(a, b) {
  return toDecimal(a).plus(toDecimal(b)).round().toNumber();
}

function subtractPaisa(a, b) {
  return toDecimal(a).minus(toDecimal(b)).round().toNumber();
}

function multiplyPaisa(a, b) {
  return toDecimal(a).times(toDecimal(b)).round().toNumber();
}

function dividePaisa(a, b) {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return 0;
  return toDecimal(a).div(divisor).round().toNumber();
}

function percentOf(total, percent) {
  return multiplyPaisa(total, dividePaisa(percent, 100));
}

module.exports = {
  toDecimal,
  roundPaisa,
  addPaisa,
  subtractPaisa,
  multiplyPaisa,
  dividePaisa,
  percentOf,
};
