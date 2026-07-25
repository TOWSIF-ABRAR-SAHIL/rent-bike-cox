const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { pricingPreview } = require('../controllers/pricingController');

router.post('/preview', auth, pricingPreview);

module.exports = router;
