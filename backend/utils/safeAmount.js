const Decimal = require('decimal.js');

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Money helpers.
 *
 * UNITS — every value handled here is **taka**, not paisa. The name says otherwise
 * because these started life as integer-paisa helpers and were repurposed when the
 * money path settled on taka. Nothing in this module scales by 100.
 *
 * The `*Taka` exports below are the correctly named entry points and are what new
 * code should use. The `*Paisa` names remain as aliases so the ~30 existing call
 * sites did not have to be churned for a rename that changes no behaviour. Fields
 * like `Payout.totalAmountPaisa` and `Refund.amountPaisa` also hold taka; they are
 * left alone because renaming stored fields needs a migration.
 *
 * The one place where paisa genuinely applies is the coupon model's
 * `discountFixedPaisa`, `maxDiscountPaisa`, and `minBookingAmountPaisa`. Those are
 * converted to taka at exactly one boundary — see `utils/couponRules.js`.
 */

function toDecimal(value) {
  return new Decimal(value || 0);
}

function roundTaka(value) {
  return toDecimal(value).round().toNumber();
}

function addTaka(a, b) {
  return toDecimal(a).plus(toDecimal(b)).round().toNumber();
}

function subtractTaka(a, b) {
  return toDecimal(a).minus(toDecimal(b)).round().toNumber();
}

function multiplyTaka(a, b) {
  return toDecimal(a).times(toDecimal(b)).round().toNumber();
}

function divideTaka(a, b) {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return 0;
  return toDecimal(a).div(divisor).round().toNumber();
}

function percentOf(total, percent) {
  return toDecimal(total).times(toDecimal(percent)).div(100).round().toNumber();
}

module.exports = {
  toDecimal,
  roundTaka,
  addTaka,
  subtractTaka,
  multiplyTaka,
  divideTaka,
  percentOf,
  // Deprecated aliases — same behaviour, misleading names. Prefer the *Taka forms.
  roundPaisa: roundTaka,
  addPaisa: addTaka,
  subtractPaisa: subtractTaka,
  multiplyPaisa: multiplyTaka,
  dividePaisa: divideTaka,
};
