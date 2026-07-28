const { defaultCache } = require('../utils/cache');
const logger = require('../utils/logger');

exports.getCacheStatus = (req, res) => {
  try {
    const stats = defaultCache.stats();
    const keys = [];
    for (const [key, entry] of defaultCache.store) {
      keys.push({
        key,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        ttl: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)),
        valueType: typeof entry.value === 'object' ? (Array.isArray(entry.value) ? 'array' : 'object') : typeof entry.value,
      });
    }
    res.json({ stats, keys, total: defaultCache.store.size });
  } catch (error) {
    logger.error('getCacheStatus error:', error.message);
    res.status(500).json({ message: 'Failed to get cache status' });
  }
};

exports.flushCache = (req, res) => {
  try {
    defaultCache.flush();
    logger.info('Cache flushed by admin', { adminId: req.user.id });
    res.json({ message: 'Cache flushed successfully' });
  } catch (error) {
    logger.error('flushCache error:', error.message);
    res.status(500).json({ message: 'Failed to flush cache' });
  }
};

exports.deleteCacheKey = (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ message: 'Key is required' });
    defaultCache.del(key);
    logger.info('Cache key deleted by admin', { key, adminId: req.user.id });
    res.json({ message: `Key "${key}" deleted` });
  } catch (error) {
    logger.error('deleteCacheKey error:', error.message);
    res.status(500).json({ message: 'Failed to delete cache key' });
  }
};
