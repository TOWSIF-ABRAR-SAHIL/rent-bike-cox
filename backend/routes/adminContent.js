const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getAllAdmin, adminUpdate, rollback } = require('../controllers/siteContentController');

router.get('/', auth, authorize('Admin'), getAllAdmin);
router.put('/:key', auth, authorize('Admin'), adminUpdate);
router.post('/:key/rollback', auth, authorize('Admin'), rollback);

module.exports = router;
