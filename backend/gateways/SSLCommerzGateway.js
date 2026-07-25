const PaymentGateway = require('./PaymentGateway');
const { verifyIPN } = require('../utils/sslcommerz');
const SSLCommerzPayment = require('sslcommerz-lts');
const logger = require('../utils/logger');

class SSLCommerzGateway extends PaymentGateway {
  get name() { return 'sslcommerz'; }
  get displayName() { return 'SSLCommerz'; }

  _getConfig() {
    return {
      storeId: process.env.SSLCOMMERZ_STORE_ID,
      storePass: process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD,
      isLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',
    };
  }

  async createPayment({ amount, currency, intentId, bookingId, customerEmail, customerName, customerPhone, items, successUrl, failUrl, cancelUrl, ipnUrl }) {
    const { storeId, storePass, isLive } = this._getConfig();
    if (!storeId || !storePass) throw new Error('SSLCommerz credentials not configured');

    const tranId = intentId || require('mongoose').Types.ObjectId().toString();
    const product = items?.[0] || { name: 'Rental', category: 'Rental' };

    const data = {
      total_amount: amount,
      currency: currency || 'BDT',
      tran_id: tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      ipn_url: ipnUrl,
      shipping_method: 'No',
      product_name: product.name,
      product_category: product.category || 'Rental',
      product_profile: 'general',
      cus_name: customerName || 'Customer',
      cus_email: customerEmail || '',
      cus_add1: 'Cox\'s Bazar',
      cus_city: 'Cox\'s Bazar',
      cus_postcode: '4700',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone || '01700000000',
      cus_fax: customerPhone || '01700000000',
      ship_name: customerName || 'Customer',
      ship_add1: 'Cox\'s Bazar',
      ship_city: 'Cox\'s Bazar',
      ship_state: 'Cox\'s Bazar',
      ship_postcode: '4700',
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(storeId, storePass, isLive);
    const apiResponse = await sslcz.init(data);

    const gatewayUrl = apiResponse.GatewayPageURL || apiResponse.redirectGatewayURL;
    if (!gatewayUrl) throw new Error('SSLCommerz did not return a gateway URL');

    logger.info('SSLCommerz payment created', { tranId, bookingId, amount });
    return { tranId, gatewayUrl, raw: apiResponse };
  }

  async verifyCallback(body) {
    const valId = body?.val_id;
    if (!valId) throw new Error('Missing val_id');
    return verifyIPN(valId);
  }

  async refund({ amount, currency, originalTranId, intentId, reason }) {
    logger.info('SSLCommerz refund requested', { originalTranId, amount, reason });
    // SSLCommerz refund is manual via dashboard for sandbox
    // In live, use their refund API
    return { status: 'MANUAL_REQUIRED', message: 'Process refund via SSLCommerz dashboard', originalTranId, amount };
  }

  async checkStatus({ intentId, tranId }) {
    logger.info('SSLCommerz status check', { intentId, tranId });
    return { status: 'UNKNOWN', message: 'Status check requires val_id verification' };
  }
}

module.exports = SSLCommerzGateway;
