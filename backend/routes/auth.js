const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/authMiddleware');
const { register, login, refresh, logout, changePassword, forgotPassword, verifyOtp, resetPassword, exportData, deleteAccount, getProfile, updateProfile } = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');
const { registerRules, loginRules } = require('../security/validators/index');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     description: Register with NID and license image uploads. Accepts multipart/form-data.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, password, phoneNumber, nid, license]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               phoneNumber:
 *                 type: string
 *               nid:
 *                 type: string
 *               license:
 *                 type: string
 *               nidImage:
 *                 type: string
 *                 format: binary
 *               licenseImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', upload.docUpload.fields([
  { name: 'nidImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 }
]), registerRules, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginRules, login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', auth, logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change account password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.post('/change-password', auth, changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: Email not found
 */
router.post('/forgot-password', otpLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', otpLimiter, verifyOtp);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or token
 */
router.post('/reset-password', otpLimiter, resetPassword);

/**
 * @swagger
 * /api/auth/export-data:
 *   get:
 *     tags: [Auth]
 *     summary: Export user data (GDPR)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported
 *       401:
 *         description: Unauthorized
 */
router.get('/export-data', auth, exportData);

/**
 * @swagger
 * /api/auth/delete-account:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete user account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete-account', auth, deleteAccount);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               nid:
 *                 type: string
 *               license:
 *                 type: string
 *               nidImage:
 *                 type: string
 *                 format: binary
 *               licenseImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', auth, upload.docUpload.fields([
  { name: 'nidImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 }
]), updateProfile);

module.exports = router;
