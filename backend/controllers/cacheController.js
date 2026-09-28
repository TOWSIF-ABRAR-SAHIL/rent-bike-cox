const { defaultCache } = require('../utils/cache');
const { getSharedCache } = require('../utils/redisCache');
const logger = require('../utils/logger');

exports.getCacheStatus = async (req, res) => {
  try {
    const cache = await getSharedCache();
    const stats = await cache.stats();
    const keys = [];
    for (const key of await cache.keys()) {
      const row = { key };
      // Memory backend exposes expiry metadata; Redis lists keys only.
      const entry = cache === defaultCache ? defaultCache.store.get(key) : undefined;
      if (entry) {
        row.expiresAt = new Date(entry.expiresAt).toISOString();
        row.ttl = Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000));
        row.valueType = typeof entry.value === 'object' ? (Array.isArray(entry.value) ? 'array' : 'object') : typeof entry.value;
      }
      keys.push(row);
    }
    res.json({ stats, keys, total: keys.length });
  } catch (error) {
    logger.error('getCacheStatus error:', error.message);
    res.status(500).json({ message: 'Failed to get cache status' });
  }
};

exports.flushCache = async (req, res) => {
  try {
    await (await getSharedCache()).flush();
    logger.info('Cache flushed by admin', { adminId: req.user.id });
    res.json({ message: 'Cache flushed successfully' });
  } catch (error) {
    logger.error('flushCache error:', error.message);
    res.status(500).json({ message: 'Failed to flush cache' });
  }
};

exports.deleteCacheKey = async (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ message: 'Key is required' });
    await (await getSharedCache()).del(key);
    logger.info('Cache key deleted by admin', { key, adminId: req.user.id });
    res.json({ message: `Key "${key}" deleted` });
  } catch (error) {
    logger.error('deleteCacheKey error:', error.message);
    res.status(500).json({ message: 'Failed to delete cache key' });
  }
};
