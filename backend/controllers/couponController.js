const Coupon = require('../models/Coupon');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

exports.getAllCoupons = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (error) {
    logger.error('getAllCoupons error', { tag: 'Coupon', message: error.message });
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { code: rawCode, discountPercent, maxUses, expiresAt } = req.body;
    const code = rawCode?.toUpperCase().trim();
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });
    
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountPercent,
      maxUses: maxUses || 0,
      expiresAt: expiresAt || null
    });
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    logger.error('createCoupon error', { tag: 'Coupon', message: error.message });
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    const { code, discountPercent, isActive, maxUses, expiresAt } = req.body;
    if (code) coupon.code = code.toUpperCase();
    if (discountPercent !== undefined) coupon.discountPercent = discountPercent;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (maxUses !== undefined) coupon.maxUses = maxUses;
    if (expiresAt !== undefined) coupon.expiresAt = expiresAt;

    await coupon.save();
    res.json(coupon);
  } catch (error) {
    logger.error('updateCoupon error', { tag: 'Coupon', message: error.message });
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    logger.error('deleteCoupon error', { tag: 'Coupon', message: error.message });
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};
