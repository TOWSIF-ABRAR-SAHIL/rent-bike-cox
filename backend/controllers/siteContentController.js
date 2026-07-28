const SiteContent = require('../models/SiteContent');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

const contentCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = contentCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  contentCache.set(key, { data, ts: Date.now() });
}

function invalidateCache(pattern) {
  if (!pattern) { contentCache.clear(); return; }
  for (const k of contentCache.keys()) {
    if (k.startsWith(pattern)) contentCache.delete(k);
  }
}

exports.getAllPublic = async (req, res) => {
  try {
    const cached = getCached('__all__');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }
    const items = await SiteContent.find({}, { key: 1, value: 1, type: 1, page: 1 }).lean();
    const result = {};
    items.forEach(item => { result[item.key] = item.value; });
    setCache('__all__', result);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (error) {
    logger.error('getAllPublic content error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const cacheKey = `key:${key}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }
    const item = await SiteContent.findOne({ key }).lean();
    if (!item) return res.status(404).json({ message: 'Content not found' });
    setCache(cacheKey, item);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(item);
  } catch (error) {
    logger.error('getByKey content error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllAdmin = async (req, res) => {
  try {
    const items = await SiteContent.find().sort({ page: 1, key: 1 }).lean();
    res.json(items);
  } catch (error) {
    logger.error('getAllAdmin content error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminUpdate = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    if (value === undefined || value === null) return res.status(400).json({ message: 'Value is required' });

    const item = await SiteContent.findOne({ key });
    if (!item) return res.status(404).json({ message: 'Content not found' });

    const oldValue = item.value;
    item.history.push({ value: oldValue, modifiedBy: req.user._id, at: new Date() });
    if (item.history.length > 10) item.history = item.history.slice(-10);

    item.value = sanitize(String(value));
    if (description !== undefined) item.description = description;
    item.lastModifiedBy = req.user._id;

    await item.save();
    invalidateCache(key.split('.')[0]);
    invalidateCache('__all__');

    res.json(item);
  } catch (error) {
    logger.error('adminUpdate content error:', error.message);
    res.status(500).json({ message: 'Failed to update content' });
  }
};

exports.rollback = async (req, res) => {
  try {
    const { key } = req.params;
    const { historyIndex } = req.body;

    const item = await SiteContent.findOne({ key });
    if (!item) return res.status(404).json({ message: 'Content not found' });
    if (!item.history[historyIndex]) return res.status(400).json({ message: 'Invalid history index' });

    const target = item.history[historyIndex];
    item.history.push({ value: item.value, modifiedBy: req.user._id, at: new Date() });
    item.value = target.value;
    item.lastModifiedBy = req.user._id;
    await item.save();

    invalidateCache(key.split('.')[0]);
    invalidateCache('__all__');

    res.json(item);
  } catch (error) {
    logger.error('rollback content error:', error.message);
    res.status(500).json({ message: 'Failed to rollback content' });
  }
};

exports.invalidateContentCache = invalidateCache;
