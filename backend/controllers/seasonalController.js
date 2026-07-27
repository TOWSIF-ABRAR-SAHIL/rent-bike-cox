const SeasonalRate = require('../models/SeasonalRate');
const { clearCache } = require('../utils/seasonalPricing');
const { defaultCache } = require('../utils/cache');

exports.list = async (req, res) => {
  try {
    const rates = await SeasonalRate.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const rate = await SeasonalRate.findById(req.params.id).lean();
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    res.json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    defaultCache.del('seasonal:active');
    const rate = new SeasonalRate({
      ...req.body,
      createdBy: req.user.id,
    });
    await rate.save();
    clearCache();
    res.status(201).json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    defaultCache.del('seasonal:active');
    const rate = await SeasonalRate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    clearCache();
    res.json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    defaultCache.del('seasonal:active');
    const rate = await SeasonalRate.findByIdAndDelete(req.params.id);
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    clearCache();
    res.json({ message: 'Rate deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.active = async (_req, res) => {
  try {
    const cached = defaultCache.get('seasonal:active');
    if (cached) return res.json(cached);
    const rates = await SeasonalRate.find({ isActive: true }).sort({ priority: -1 }).lean();
    defaultCache.set('seasonal:active', rates, 300000);
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
