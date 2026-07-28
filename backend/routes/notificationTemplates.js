const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/notificationTemplateController');

router.get('/', auth, authorize('Admin'), ctrl.getAll);
router.get('/:key', auth, authorize('Admin'), ctrl.getByKey);
router.put('/:key', auth, authorize('Admin'), ctrl.update);

module.exports = router;
