const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');

const { createCouponRules } = require('../security/validators/index');

router.get('/', auth, authorize('Admin'), getAllCoupons);
router.post('/', auth, authorize('Admin'), createCouponRules, createCoupon);
router.put('/:id', auth, authorize('Admin'), updateCoupon);
router.delete('/:id', auth, authorize('Admin'), deleteCoupon);

module.exports = router;
