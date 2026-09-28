const SeasonalRate = require('../models/SeasonalRate');
const { clearCache } = require('../utils/seasonalPricing');
const { getSharedCache } = require('../utils/redisCache');
const logger = require('../utils/logger');
const { clientMessage } = require('../utils/httpError');

exports.list = async (req, res) => {
  try {
    const rates = await SeasonalRate.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json(rates);
  } catch (err) {
    logger.error('list seasonal rates error', { error: err.message });
    res.status(500).json({ message: 'Failed to load seasonal rates' });
  }
};

exports.get = async (req, res) => {
  try {
    const rate = await SeasonalRate.findById(req.params.id).lean();
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    res.json(rate);
  } catch (err) {
    logger.error('get seasonal rate error', { rateId: req.params.id, error: err.message });
    res.status(500).json({ message: 'Failed to load the seasonal rate' });
  }
};

exports.create = async (req, res) => {
  try {
    await (await getSharedCache()).del('seasonal:active');
    const { name, multiplier, type, isActive, priority, startDate, endDate, daysOfWeek, month, dayOfMonth, recurringYearly } = req.body;
    const rate = new SeasonalRate({
      name, multiplier, type, isActive, priority, startDate, endDate, daysOfWeek, month, dayOfMonth, recurringYearly,
      createdBy: req.user.id,
    });
    await rate.save();
    clearCache();
    res.status(201).json(rate);
  } catch (err) {
    logger.error('create seasonal rate error', { error: err.message });
    res.status(400).json({ message: clientMessage(err, 'Could not save the seasonal rate') });
  }
};

exports.update = async (req, res) => {
  try {
    await (await getSharedCache()).del('seasonal:active');
    const { name, multiplier, type, isActive, priority, startDate, endDate, daysOfWeek, month, dayOfMonth, recurringYearly } = req.body;
    const rate = await SeasonalRate.findByIdAndUpdate(req.params.id, { name, multiplier, type, isActive, priority, startDate, endDate, daysOfWeek, month, dayOfMonth, recurringYearly }, { new: true, runValidators: true });
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    clearCache();
    res.json(rate);
  } catch (err) {
    logger.error('update seasonal rate error', { rateId: req.params.id, error: err.message });
    res.status(400).json({ message: clientMessage(err, 'Could not update the seasonal rate') });
  }
};

exports.remove = async (req, res) => {
  try {
    await (await getSharedCache()).del('seasonal:active');
    const rate = await SeasonalRate.findByIdAndDelete(req.params.id);
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    clearCache();
    res.json({ message: 'Rate deleted' });
  } catch (err) {
    logger.error('remove seasonal rate error', { rateId: req.params.id, error: err.message });
    res.status(500).json({ message: 'Failed to delete the seasonal rate' });
  }
};

exports.active = async (_req, res) => {
  try {
    const cache = await getSharedCache();
    const cached = await cache.get('seasonal:active');
    if (cached) return res.json(cached);
    const rates = await SeasonalRate.find({ isActive: true }).sort({ priority: -1 }).lean();
    await cache.set('seasonal:active', rates, 300000);
    res.json(rates);
  } catch (err) {
    // Public endpoint (GET /api/seasonal-rates, no session): an unauthenticated
    // caller must not learn the cluster hostname or collection from a failed read.
    logger.error('active seasonal rates error', { error: err.message });
    res.status(500).json({ message: 'Failed to load seasonal rates' });
  }
};
