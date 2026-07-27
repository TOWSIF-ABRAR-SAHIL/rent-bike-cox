const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/notificationPrefController');

router.get('/notification-preferences', auth, ctrl.getPreferences);
router.put('/notification-preferences', auth, ctrl.updatePreferences);

module.exports = router;
