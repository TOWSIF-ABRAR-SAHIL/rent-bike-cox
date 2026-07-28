const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute,
  getDisputeStats,
} = require('../controllers/disputeController');

router.post('/', auth, createDispute);
router.get('/my', auth, getMyDisputes);
router.get('/admin/all', auth, authorize('Admin'), getAllDisputes);
router.put('/admin/:id/resolve', auth, authorize('Admin'), resolveDispute);
router.get('/admin/stats', auth, authorize('Admin'), getDisputeStats);

module.exports = router;
