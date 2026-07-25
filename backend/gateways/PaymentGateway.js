class PaymentGateway {
  get name() { throw new Error('Gateway must implement name getter'); }
  get displayName() { throw new Error('Gateway must implement displayName getter'); }

  async createPayment({ amount, currency, intentId, bookingId, customerEmail, customerName, customerPhone, items, successUrl, failUrl, cancelUrl, ipnUrl }) {
    throw new Error(`${this.name}: createPayment not implemented`);
  }

  async verifyCallback(body) {
    throw new Error(`${this.name}: verifyCallback not implemented`);
  }

  async refund({ amount, currency, originalTranId, intentId, reason }) {
    throw new Error(`${this.name}: refund not implemented`);
  }

  async checkStatus({ intentId, tranId }) {
    throw new Error(`${this.name}: checkStatus not implemented`);
  }
}

module.exports = PaymentGateway;
