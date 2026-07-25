const PaymentGateway = require('./PaymentGateway');

class StripeGateway extends PaymentGateway {
  get name() { return 'stripe'; }
  get displayName() { return 'Stripe'; }

  async createPayment({ amount, currency, intentId, bookingId, customerEmail, customerName, customerPhone, items, successUrl, failUrl, cancelUrl, ipnUrl }) {
    throw new Error('Stripe integration not yet implemented');
  }

  async verifyCallback(body) {
    throw new Error('Stripe verification not yet implemented');
  }

  async refund({ amount, currency, originalTranId, intentId, reason }) {
    throw new Error('Stripe refund not yet implemented');
  }

  async checkStatus({ intentId, tranId }) {
    throw new Error('Stripe status check not yet implemented');
  }
}

module.exports = StripeGateway;
