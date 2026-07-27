const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/seasonalController');

router.get('/seasonal-rates', ctrl.active);
router.get('/admin/seasonal-rates', auth, authorize('Admin'), ctrl.list);
router.get('/admin/seasonal-rates/:id', auth, authorize('Admin'), ctrl.get);
router.post('/admin/seasonal-rates', auth, authorize('Admin'), ctrl.create);
router.put('/admin/seasonal-rates/:id', auth, authorize('Admin'), ctrl.update);
router.delete('/admin/seasonal-rates/:id', auth, authorize('Admin'), ctrl.remove);

module.exports = router;
