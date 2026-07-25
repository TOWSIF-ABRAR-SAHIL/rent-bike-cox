const logger = require('../utils/logger');

class GatewayRegistry {
  constructor() {
    this._gateways = new Map();
  }

  register(gateway) {
    if (!gateway.name || !gateway.createPayment) {
      throw new Error('Invalid gateway: must implement name getter and createPayment');
    }
    this._gateways.set(gateway.name, gateway);
    logger.info(`Gateway registered: ${gateway.name} (${gateway.displayName})`);
  }

  get(name) {
    const gw = this._gateways.get(name);
    if (!gw) throw new Error(`Gateway not found: ${name}`);
    return gw;
  }

  getDefault() {
    const preferred = process.env.PREFERRED_GATEWAY || 'sslcommerz';
    if (this._gateways.has(preferred)) return this._gateways.get(preferred);
    return this._gateways.values().next().value;
  }

  list() {
    return Array.from(this._gateways.values()).map(g => ({
      name: g.name,
      displayName: g.displayName,
    }));
  }

  has(name) {
    return this._gateways.has(name);
  }
}

const registry = new GatewayRegistry();

module.exports = registry;
module.exports.GatewayRegistry = GatewayRegistry;
