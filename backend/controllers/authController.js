const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const RefreshToken = require('../models/RefreshToken');
const BlacklistedToken = require('../models/BlacklistedToken');
const { sanitize } = require('../utils/sanitize');
const { checkPasswordStrength } = require('../security/utils/passwordPolicy');
const { generateAccessToken, generateRefreshToken, verifyToken, buildFingerprint } = require('../security/utils/tokenManager');
const securityConfig = require('../security/config/securityConfig');
const { logSecurityEvent } = require('../utils/securityLogger');
const logger = require('../utils/logger');
const notificationService = require('../services/NotificationService');
const adminNotify = require('../services/AdminNotificationService');

const MAX_ATTEMPTS = securityConfig.lockout.maxAttempts;
const LOCK_DURATION = securityConfig.lockout.lockDuration;

function generateTokenPair(user, req) {
  const fingerprint = buildFingerprint(req);
  const familyId = crypto.randomUUID();
  const accessToken = generateAccessToken(user, fingerprint);
  const refreshToken = generateRefreshToken(user, familyId);
  return { accessToken, refreshToken, familyId };
}

async function storeRefreshToken(refreshToken, userId, familyId, req) {
  const tokenHash = RefreshToken.hashToken(refreshToken);
  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({
    tokenHash,
    userId,
    familyId,
    expiresAt: new Date(decoded.exp * 1000),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, nid, license, phoneNumber, address } = req.body;
    const cleanName = sanitize(name);
    const cleanNid = sanitize(nid);
    const cleanLicense = sanitize(license);
    const cleanAddress = sanitize(address);

    if (!cleanName || !email || !password || !cleanNid || !cleanLicense || !phoneNumber) {
      return res.status(400).json({ message: 'Name, email, password, NID, license, and phone number are required' });
    }

    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.errors[0] });
    }
    if (name.length > 100) return res.status(400).json({ message: 'Name is too long' });
    if (email.length > 254) return res.status(400).json({ message: 'Email is too long' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const existingNid = await User.findOne({ nid: cleanNid });
    if (existingNid) return res.status(400).json({ message: 'An account with this NID already exists' });

    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) return res.status(400).json({ message: 'An account with this phone number already exists' });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const nidImage = req.files?.['nidImage']?.[0]?.path || '';
    const licenseImage = req.files?.['licenseImage']?.[0]?.path || '';

    user = new User({
      name: cleanName,
      email,
      password: hashedPassword,
      role: 'User',
      nid: cleanNid,
      license: cleanLicense,
      nidImage,
      licenseImage,
      phoneNumber,
      address: cleanAddress
    });

    await user.save();

    const { accessToken, refreshToken, familyId } = generateTokenPair(user, req);
    await storeRefreshToken(refreshToken, user._id, familyId, req);

    try { await notificationService.notifyWelcome(user); } catch { /* non-blocking */ }
    try { await adminNotify.notifyNewUser({ _id: user._id, name: cleanName, email, role: user.role }); } catch { /* non-blocking */ }

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: cleanName, email, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email or NID already exists' });
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    const recentFailures = await LoginAttempt.countDocuments({
      email,
      success: false,
      createdAt: { $gt: new Date(Date.now() - LOCK_DURATION) },
    });

    if (recentFailures >= MAX_ATTEMPTS) {
      await logSecurityEvent({
        action: 'login_failed',
        ip,
        userAgent,
        metadata: { email, reason: 'account_locked' },
      });
      return res.status(423).json({
        message: 'Account temporarily locked due to too many failed attempts',
        retryAfter: Math.ceil(LOCK_DURATION / 1000),
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      await LoginAttempt.create({ email, ip, userAgent, success: false, failureCount: recentFailures + 1 });
      await logSecurityEvent({
        action: 'login_failed',
        ip,
        userAgent,
        metadata: { email, reason: 'invalid_credentials' },
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newCount = recentFailures + 1;
      await LoginAttempt.create({ email, ip, userAgent, success: false, failureCount: newCount });
      if (newCount >= MAX_ATTEMPTS) {
        await logSecurityEvent({
          action: 'login_failed',
          actorId: user._id,
          ip,
          userAgent,
          metadata: { email, reason: 'account_locked' },
        });
        await logSecurityEvent({
          action: 'account_locked',
          actorId: user._id,
          ip,
          userAgent,
          metadata: { email, failureCount: newCount },
        });
        return res.status(423).json({
          message: 'Account temporarily locked due to too many failed attempts',
          retryAfter: Math.ceil(LOCK_DURATION / 1000),
        });
      }
      await logSecurityEvent({
        action: 'login_failed',
        actorId: user._id,
        ip,
        userAgent,
        metadata: { email, reason: 'invalid_credentials' },
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await LoginAttempt.create({ email, ip, userAgent, success: true, failureCount: 0 });

    const { accessToken, refreshToken, familyId } = generateTokenPair(user, req);
    await storeRefreshToken(refreshToken, user._id, familyId, req);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    let decoded;
    try {
      decoded = verifyToken(refreshToken, 'refresh');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const tokenHash = RefreshToken.hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.revoked) {
      if (storedToken?.familyId) {
        await RefreshToken.updateMany({ familyId: storedToken.familyId }, { revoked: true });
      }
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

    if (new Date() > storedToken.expiresAt) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    storedToken.revoked = true;
    await storedToken.save();

    const newFingerprint = buildFingerprint(req);
    const newAccessToken = generateAccessToken(user, newFingerprint);
    const newFamilyId = storedToken.familyId;
    const newRefreshToken = generateRefreshToken(user, newFamilyId);
    storedToken.replacedByHash = RefreshToken.hashToken(newRefreshToken);
    await storedToken.save();
    await storeRefreshToken(newRefreshToken, user._id, newFamilyId, req);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ message: 'Token refresh failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.jti) {
          const jtiHash = BlacklistedToken.hashJti(decoded.jti);
          await BlacklistedToken.create({
            jtiHash,
            userId: decoded.id,
            expiresAt: new Date(decoded.exp * 1000),
            reason: 'logout',
          });
        }
      } catch (e) { /* token may already be invalid */ }
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.jti) {
          const rtHash = RefreshToken.hashToken(refreshToken);
          await RefreshToken.findOneAndUpdate({ tokenHash: rtHash }, { revoked: true });
        }
      } catch (e) { /* ok */ }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    const pwCheck = checkPasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.errors[0] });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.jti) {
          const jtiHash = BlacklistedToken.hashJti(decoded.jti);
          await BlacklistedToken.create({
            jtiHash,
            userId: user._id,
            expiresAt: new Date(decoded.exp * 1000),
            reason: 'password_change',
          });
        }
      } catch (e) { /* ok */ }
    }

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    res.status(500).json({ message: 'Password change failed' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ user: req.user.id })
      .populate('bike', 'model brand')
      .sort({ createdAt: -1 });

    const exportData = {
      profile: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.date,
      },
      bookings: bookings.map(b => ({
        id: b._id,
        bike: b.bike?.model || 'Unknown',
        startDate: b.startTime,
        endDate: b.endTime,
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Disposition', `attachment; filename="rentbikecox-data-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    logger.error('Data export error', { error: error.message });
    res.status(500).json({ message: 'Data export failed' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const Booking = require('../models/Booking');
    const activeBookings = await Booking.countDocuments({
      user: req.user.id,
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({ message: 'Cannot delete account with active bookings. Please complete or cancel them first.' });
    }

    user.email = `deleted_${user._id}@deleted.invalid`;
    user.name = 'Deleted User';
    user.password = require('crypto').randomBytes(32).toString('hex');
    user.phoneNumber = '';
    user.nid = '';
    user.license = '';
    user.address = '';
    user.isVerified = false;
    await user.save();

    const RefreshToken = require('../models/RefreshToken');
    await RefreshToken.updateMany({ userId: user._id }, { revoked: true });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Account deletion error', { error: error.message });
    res.status(500).json({ message: 'Account deletion failed' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role phoneNumber address nid license nidImage licenseImage isVerified date');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    logger.error('getProfile error', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const cleanName = sanitize(name);
      if (!cleanName || cleanName.length > 100) return res.status(400).json({ message: 'Invalid name' });
      user.name = cleanName;
    }
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address !== undefined) user.address = sanitize(address) || '';

    if (req.files?.['nidImage']?.[0]) user.nidImage = req.files['nidImage'][0].path;
    if (req.files?.['licenseImage']?.[0]) user.licenseImage = req.files['licenseImage'][0].path;

    await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, phoneNumber: user.phoneNumber, address: user.address } });
  } catch (error) {
    logger.error('updateProfile error', { error: error.message });
    res.status(500).json({ message: 'Profile update failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If an account exists with that email, an OTP has been sent' });
    }

    const PasswordReset = require('../models/PasswordReset');
    await PasswordReset.deleteMany({ userId: user._id, used: false });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = PasswordReset.hashOtp(otp);

    await PasswordReset.create({
      userId: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    logger.info('Password reset OTP generated', { userId: user._id, email });

    try {
      const { sendEmail, templates } = require('../services/emailService');
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Code — Rent Bike Cox\'s Bazar',
        html: templates.passwordReset({ userName: user.name, otp }),
      });
    } catch { /* non-blocking */ }

    res.json({ message: 'If an account exists with that email, an OTP has been sent' });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json({ message: 'Password reset request failed' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const PasswordReset = require('../models/PasswordReset');
    const otpHash = PasswordReset.hashOtp(otp);
    const record = await PasswordReset.findOne({
      userId: user._id,
      otpHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

    res.json({ message: 'OTP verified', resetToken: record._id.toString() });
  } catch (error) {
    logger.error('Verify OTP error', { error: error.message });
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ message: 'Reset token and new password are required' });

    const pwCheck = checkPasswordStrength(newPassword);
    if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.errors[0] });

    const PasswordReset = require('../models/PasswordReset');
    const record = await PasswordReset.findOne({
      _id: resetToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const user = await User.findById(record.userId).select('+password');
    if (!user) return res.status(400).json({ message: 'User not found' });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    record.used = true;
    await record.save();

    const RefreshToken = require('../models/RefreshToken');
    await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });

    const BlacklistedToken = require('../models/BlacklistedToken');
    const tokens = await RefreshToken.find({ userId: user._id, revoked: true }).select('expiresAt');
    for (const t of tokens) {
      const jtiHash = BlacklistedToken.hashJti(`reset-${user._id}-${t._id}`);
      await BlacklistedToken.create({
        jtiHash,
        userId: user._id,
        expiresAt: t.expiresAt,
        reason: 'password_change',
      }).catch(() => {});
    }

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    res.status(500).json({ message: 'Password reset failed' });
  }
};
