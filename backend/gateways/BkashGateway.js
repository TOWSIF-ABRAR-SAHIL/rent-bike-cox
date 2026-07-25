const PaymentGateway = require('./PaymentGateway');

class BkashGateway extends PaymentGateway {
  get name() { return 'bkash'; }
  get displayName() { return 'bKash'; }

  async createPayment({ amount, currency, intentId, bookingId, customerEmail, customerName, customerPhone, items, successUrl, failUrl, cancelUrl, ipnUrl }) {
    throw new Error('bKash integration not yet implemented');
  }

  async verifyCallback(body) {
    throw new Error('bKash verification not yet implemented');
  }

  async refund({ amount, currency, originalTranId, intentId, reason }) {
    throw new Error('bKash refund not yet implemented');
  }

  async checkStatus({ intentId, tranId }) {
    throw new Error('bKash status check not yet implemented');
  }
}

module.exports = BkashGateway;
