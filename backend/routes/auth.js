const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { register, login, refresh, logout, changePassword } = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');
const { registerRules, loginRules } = require('../security/validators/index');

router.post('/register', upload.fields([
  { name: 'nidImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 }
]), registerRules, register);
router.post('/login', loginRules, login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.post('/change-password', auth, changePassword);

module.exports = router;
