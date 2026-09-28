'use strict';

/**
 * Redis-backed cache with the same surface as utils/cache.js MemoryCache
 * (get / set / del / flush / stats / keys), plus a shared-singleton factory.
 *
 * Inert unless REDIS_URL is set: getSharedCache() then returns the existing
 * in-memory defaultCache, so local dev and CI need no Redis at all.
 * A connection failure at boot also falls back to memory (logged) — the cache
 * must never take the server down.
 *
 * Values are JSON-serialised. TTLs are milliseconds, matching MemoryCache.
 */

const logger = require('./logger');
const { defaultCache } = require('./cache');

const PREFIX = 'rbx:';

class RedisCache {
  constructor(client) {
    this.client = client;
    this.hits = 0;
    this.misses = 0;
  }

  async get(key) {
    const raw = await this.client.get(PREFIX + key);
    if (raw == null) { this.misses++; return undefined; }
    this.hits++;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async set(key, value, ttl) {
    const raw = JSON.stringify(value);
    if (ttl) await this.client.set(PREFIX + key, raw, { PX: ttl });
    else await this.client.set(PREFIX + key, raw);
  }

  async del(key) {
    await this.client.del(PREFIX + key);
  }

  async flush() {
    // Prefix-scoped: never FLUSHDB a potentially shared Redis.
    for await (const key of this.client.scanIterator({ MATCH: `${PREFIX}*`, COUNT: 200 })) {
      await this.client.del(key);
    }
  }

  async keys() {
    const out = [];
    for await (const key of this.client.scanIterator({ MATCH: `${PREFIX}*`, COUNT: 200 })) {
      out.push(key.slice(PREFIX.length));
    }
    return out;
  }

  async stats() {
    // `size` and `maxSize` are part of the shape the admin cache view reads; they used
    // to be returned by the memory backend only, so on a Redis deployment the Entries
    // and Max cards rendered blank. Redis has no fixed capacity, so 0 means unbounded.
    return {
      backend: 'redis',
      size: (await this.keys()).length,
      maxSize: 0,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0,
    };
  }
}

let shared = null;
let sharedBackend = 'memory';

async function getSharedCache() {
  if (shared) return shared;
  const url = process.env.REDIS_URL;
  if (!url) {
    shared = defaultCache;
    sharedBackend = 'memory';
    return shared;
  }
  try {
    const { createClient } = require('redis');
    const client = createClient({ url });
    client.on('error', (err) => logger.warn('Redis error, staying on memory cache', { error: err.message }));
    await client.connect();
    shared = new RedisCache(client);
    sharedBackend = 'redis';
    logger.info('Shared cache backend: redis');
  } catch (err) {
    logger.warn('Redis unreachable, falling back to memory cache', { error: err.message });
    shared = defaultCache;
    sharedBackend = 'memory';
  }
  return shared;
}

function sharedBackendName() {
  return sharedBackend;
}

module.exports = { RedisCache, getSharedCache, sharedBackendName };
