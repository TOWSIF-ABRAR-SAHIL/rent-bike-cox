const logger = require('./logger');

class MemoryCache {
  constructor(options = {}) {
    this.store = new Map();
    this.ttl = options.ttl || 60 * 1000;
    this.maxSize = options.maxSize || 500;
    this.hits = 0;
    this.misses = 0;

    if (options.checkperiod !== false) {
      this._checkInterval = setInterval(() => this._prune(), options.checkperiod || 120_000);
      if (this._checkInterval.unref) this._checkInterval.unref();
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, ttl) {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.ttl),
    });
  }

  del(key) {
    this.store.delete(key);
  }

  flush() {
    this.store.clear();
  }

  stats() {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0,
    };
  }

  _prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) logger.debug('cache pruned', { pruned, remaining: this.store.size });
  }
}

const defaultCache = new MemoryCache({ ttl: 60_000 });

module.exports = MemoryCache;
module.exports.defaultCache = defaultCache;
