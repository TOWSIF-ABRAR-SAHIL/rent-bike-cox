const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');

router.get('/', auth, getAllCoupons);
router.post('/', auth, createCoupon);
router.put('/:id', auth, validateObjectId(), updateCoupon);
router.delete('/:id', auth, validateObjectId(), deleteCoupon);

module.exports = router;
