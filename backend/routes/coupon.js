const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');

router.get('/', auth, getAllCoupons);
router.post('/', auth, createCoupon);
router.put('/:id', auth, updateCoupon);
router.delete('/:id', auth, deleteCoupon);

module.exports = router;
