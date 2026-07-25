const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', 'qwerty123',
  'admin123', 'letmein', 'welcome1', 'monkey123', 'abc123',
  '111111', '1234567', 'iloveyou', 'trustno1', 'sunshine',
  'princess', 'football', 'charlie', 'shadow123', 'master123',
  'dragon123', 'login123', 'admin1', 'passw0rd', 'superman',
  'michael1', 'ashley1', 'jessica1', 'password12', 'qwerty',
  'baseball', 'soccer', 'hockey', 'batman', 'access',
]);

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

function checkPasswordStrength(password) {
  const errors = [];
  let score = 0;

  if (!password || typeof password !== 'string') {
    return { valid: false, score: 0, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain at least one number');
  }

  if (SPECIAL_CHARS.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Choose a more unique password');
    score = Math.max(score - 3, 0);
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(score - 1, 0);
  }

  if (/^(012|123|234|345|456|567|678|789|890)/.test(password)) {
    score = Math.max(score - 1, 0);
  }

  if (/^[a-zA-Z]+\d+$/.test(password) || /^\d+[a-zA-Z]+$/.test(password)) {
    score = Math.max(score - 1, 0);
  }

  const strength = score <= 2 ? 'weak' : score <= 3 ? 'fair' : score <= 4 ? 'strong' : 'very-strong';

  return {
    valid: errors.length === 0,
    score,
    strength,
    errors,
  };
}

function isPasswordReused(newPassword, passwordHistory) {
  if (!passwordHistory || !Array.isArray(passwordHistory)) return false;
  return passwordHistory.some(hashed => {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(newPassword, hashed);
  });
}

module.exports = {
  checkPasswordStrength,
  isPasswordReused,
  COMMON_PASSWORDS,
};
