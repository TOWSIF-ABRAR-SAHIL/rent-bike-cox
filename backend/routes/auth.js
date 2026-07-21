const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', upload.fields([
  { name: 'nidImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 }
]), register);
router.post('/login', login);

module.exports = router;
