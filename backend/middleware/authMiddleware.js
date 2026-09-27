const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/BlacklistedToken');
const User = require('../models/User');
const { defaultCache } = require('../utils/cache');

const TOKEN_VERSION_TTL_MS = 60 * 1000;

/**
 * Resolve a user's current token version.
 *
 * Cached briefly: this runs on every authenticated request, and a 60-second window
 * means a password change takes effect almost immediately without adding a user
 * lookup to every call. Returns null when the user no longer exists, which is
 * itself a reason to reject the token.
 */
async function getTokenVersion(userId) {
  const key = `tokenVersion:${userId}`;
  const cached = defaultCache.get(key);
  if (cached !== undefined) return cached;

  const user = await User.findById(userId).select('tokenVersion').lean();
  const version = user ? (user.tokenVersion || 0) : null;
  defaultCache.set(key, version, TOKEN_VERSION_TTL_MS);
  return version;
}

function invalidateTokenVersionCache(userId) {
  defaultCache.del(`tokenVersion:${userId}`);
}

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    if (decoded.jti) {
      const jtiHash = BlacklistedToken.hashJti(decoded.jti);
      const blacklisted = await BlacklistedToken.findOne({ jtiHash });
      if (blacklisted) {
        return res.status(401).json({ message: 'Token has been revoked' });
      }
    }

    // Tokens issued before tokenVersion existed have no `tv` and count as 0,
    // which matches existing users — so deploying this does not sign anyone out.
    const currentVersion = await getTokenVersion(decoded.id);
    if (currentVersion === null) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    if ((decoded.tv || 0) !== currentVersion) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports.invalidateTokenVersionCache = invalidateTokenVersionCache;
