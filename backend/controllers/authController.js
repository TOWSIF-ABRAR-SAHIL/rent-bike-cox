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

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name, email, role: user.role },
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
    storedToken.replacedByHash = RefreshToken.hashToken(refreshToken);
    await storedToken.save();

    const newFingerprint = buildFingerprint(req);
    const newAccessToken = generateAccessToken(user, newFingerprint);
    const newFamilyId = storedToken.familyId;
    const newRefreshToken = generateRefreshToken(user, newFamilyId);
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
