const SiteContent = require('../models/SiteContent');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

const contentCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

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
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(cached);
    }
    const items = await SiteContent.find({}, { key: 1, value: 1, type: 1, page: 1 }).lean();
    const result = {};
    items.forEach(item => { result[item.key] = item.value; });
    setCache('__all__', result);
    res.set('Cache-Control', 'public, max-age=600');
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
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(cached);
    }
    const item = await SiteContent.findOne({ key }).lean();
    if (!item) return res.status(404).json({ message: 'Content not found' });
    setCache(cacheKey, item);
    res.set('Cache-Control', 'public, max-age=600');
    res.json(item);
  } catch (error) {
    logger.error('getByKey content error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getByPage = async (req, res) => {
  try {
    const { pageName } = req.params;
    const cacheKey = `page:${pageName}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(cached);
    }
    const items = await SiteContent.find({ page: pageName }, { key: 1, value: 1, type: 1, page: 1, section: 1 }).sort({ sortOrder: 1 }).lean();
    const grouped = {};
    items.forEach(item => {
      const sec = item.section || '_default';
      if (!grouped[sec]) grouped[sec] = {};
      grouped[sec][item.key] = { value: item.value, type: item.type };
    });
    setCache(cacheKey, { page: pageName, sections: grouped, items });
    res.set('Cache-Control', 'public, max-age=600');
    res.json({ page: pageName, sections: grouped, items });
  } catch (error) {
    logger.error('getByPage content error:', error.message);
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
    if (item.isLocked) return res.status(423).json({ message: 'Content is locked and cannot be edited' });

    const oldValue = item.value;
    item.history.push({ value: oldValue, modifiedBy: req.user._id, at: new Date() });
    if (item.history.length > 20) item.history = item.history.slice(-20);

    const sanitizedValue = typeof value === 'string' ? sanitize(String(value)) : value;
    item.value = sanitizedValue;
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
    if (item.isLocked) return res.status(423).json({ message: 'Content is locked' });

    if (historyIndex === undefined) {
      if (item.history.length === 0) return res.status(400).json({ message: 'No history to rollback to' });
      const last = item.history[item.history.length - 1];
      item.history.push({ value: item.value, modifiedBy: req.user._id, at: new Date() });
      item.value = last.value;
    } else {
      if (!item.history[historyIndex]) return res.status(400).json({ message: 'Invalid history index' });
      const target = item.history[historyIndex];
      item.history.push({ value: item.value, modifiedBy: req.user._id, at: new Date() });
      item.value = target.value;
    }

    if (item.history.length > 20) item.history = item.history.slice(-20);
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

exports.resetToDefault = async (req, res) => {
  try {
    const { key } = req.params;
    const item = await SiteContent.findOne({ key });
    if (!item) return res.status(404).json({ message: 'Content not found' });
    if (item.defaultValue === undefined) return res.status(400).json({ message: 'No default value defined' });

    item.history.push({ value: item.value, modifiedBy: req.user._id, at: new Date() });
    item.value = item.defaultValue;
    if (item.history.length > 20) item.history = item.history.slice(-20);
    item.lastModifiedBy = req.user._id;
    await item.save();

    invalidateCache(key.split('.')[0]);
    invalidateCache('__all__');
    res.json(item);
  } catch (error) {
    logger.error('resetToDefault error:', error.message);
    res.status(500).json({ message: 'Failed to reset content' });
  }
};

exports.bulkUpdate = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'updates array is required' });
    }

    const results = { updated: 0, failed: 0, errors: [] };
    for (const { key, value } of updates) {
      if (!key || value === undefined) {
        results.failed++;
        results.errors.push({ key, error: 'Missing key or value' });
        continue;
      }
      const item = await SiteContent.findOne({ key });
      if (!item || item.isLocked) {
        results.failed++;
        results.errors.push({ key, error: item ? 'Locked' : 'Not found' });
        continue;
      }
      item.history.push({ value: item.value, modifiedBy: req.user._id, at: new Date() });
      item.value = typeof value === 'string' ? sanitize(String(value)) : value;
      if (item.history.length > 20) item.history = item.history.slice(-20);
      item.lastModifiedBy = req.user._id;
      await item.save();
      results.updated++;
    }

    invalidateCache();
    res.json(results);
  } catch (error) {
    logger.error('bulkUpdate error:', error.message);
    res.status(500).json({ message: 'Failed to bulk update content' });
  }
};

exports.exportContent = async (req, res) => {
  try {
    const items = await SiteContent.find().lean();
    const exportData = items.map(({ key, value, type, page, section, label, description, placeholder, defaultValue, group, sortOrder, isLocked }) => ({
      key, value, type, page, section, label, description, placeholder, defaultValue, group, sortOrder, isLocked
    }));
    res.json(exportData);
  } catch (error) {
    logger.error('exportContent error:', error.message);
    res.status(500).json({ message: 'Failed to export content' });
  }
};

exports.importContent = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const results = { created: 0, updated: 0, failed: 0, errors: [] };
    for (const item of items) {
      if (!item.key) {
        results.failed++;
        results.errors.push({ error: 'Missing key' });
        continue;
      }
      try {
        const existing = await SiteContent.findOne({ key: item.key });
        if (existing) {
          if (existing.isLocked) {
            results.failed++;
            results.errors.push({ key: item.key, error: 'Locked' });
            continue;
          }
          existing.value = item.value;
          existing.lastModifiedBy = req.user._id;
          await existing.save();
          results.updated++;
        } else {
          await SiteContent.create({
            key: item.key,
            value: item.value,
            type: item.type || 'text',
            page: item.page || 'global',
            section: item.section || '',
            label: item.label || '',
            description: item.description || '',
            placeholder: item.placeholder || '',
            defaultValue: item.defaultValue,
            group: item.group || '',
            sortOrder: item.sortOrder || 0
          });
          results.created++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ key: item.key, error: err.message });
      }
    }

    invalidateCache();
    res.json(results);
  } catch (error) {
    logger.error('importContent error:', error.message);
    res.status(500).json({ message: 'Failed to import content' });
  }
};

let contentSeeded = false;

exports.seedContent = async () => {
  if (contentSeeded) return;
  try {
    const count = await SiteContent.countDocuments();
    if (count > 0) { contentSeeded = true; return; }

    const seedData = [
      { key: 'home.hero.pillText', value: "Cox's Bazar, Bangladesh", type: 'text', page: 'home', section: 'hero', group: 'Home Page' },
      { key: 'home.hero.title', value: "Explore Cox's Bazar on Two Wheels", type: 'text', page: 'home', section: 'hero', group: 'Home Page' },
      { key: 'home.hero.subtitle', value: "Rent bikes, cars & beach jeeps at the world's longest beach.", type: 'text', page: 'home', section: 'hero', group: 'Home Page' },
      { key: 'home.hero.ctaText', value: 'Browse Vehicles', type: 'text', page: 'home', section: 'hero', group: 'Home Page' },
      { key: 'home.hero.ctaLink', value: '/search', type: 'url', page: 'home', section: 'hero', group: 'Home Page' },
      { key: 'global.businessName', value: "Rent Bike Cox's Bazar", type: 'text', page: 'global', section: 'business', group: 'Global' },
      { key: 'global.loadingText', value: 'Loading...', type: 'text', page: 'global', section: 'ui', group: 'Global' },
      { key: 'global.errorGeneric', value: 'Something went wrong. Please try again.', type: 'text', page: 'global', section: 'ui', group: 'Global' },
    ];

    for (const item of seedData) {
      const existing = await SiteContent.findOne({ key: item.key });
      if (!existing) {
        await SiteContent.create({
          ...item,
          label: item.key.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
          defaultValue: item.value,
          sortOrder: 0
        });
      }
    }
    contentSeeded = true;
    logger.info('Site content seeded');
  } catch (error) {
    logger.warn('Site content seed skipped', { error: error.message });
  }
};

exports.invalidateContentCache = invalidateCache;
