const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/authMiddleware');
const { register, login, refresh, logout, changePassword, forgotPassword, verifyOtp, resetPassword, exportData, deleteAccount } = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');
const { registerRules, loginRules } = require('../security/validators/index');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', upload.docUpload.fields([
  { name: 'nidImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 }
]), registerRules, register);
router.post('/login', loginRules, login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.post('/change-password', auth, changePassword);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/reset-password', otpLimiter, resetPassword);
router.get('/export-data', auth, exportData);
router.delete('/delete-account', auth, deleteAccount);

module.exports = router;
