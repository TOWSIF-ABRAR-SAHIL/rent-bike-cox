function maskNid(nid) {
  if (!nid || typeof nid !== 'string') return '****';
  if (nid.length <= 4) return '*'.repeat(nid.length);
  return '*'.repeat(nid.length - 4) + nid.slice(-4);
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '****';
  if (phone.length <= 4) return '*'.repeat(phone.length);
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '****';
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

function maskLicense(license) {
  if (!license || typeof license !== 'string') return '****';
  if (license.length <= 4) return '*'.repeat(license.length);
  return '*'.repeat(license.length - 4) + license.slice(-4);
}

function maskCardNumber(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') return '****';
  const cleaned = cardNumber.replace(/\s|-/g, '');
  if (cleaned.length <= 4) return '*'.repeat(cleaned.length);
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

const PII_MASKERS = {
  nid: maskNid,
  nidNumber: maskNid,
  license: maskLicense,
  licenseNumber: maskLicense,
  phone: maskPhone,
  phoneNumber: maskPhone,
  email: maskEmail,
  card_number: maskCardNumber,
  pan: maskCardNumber,
  account_number: maskCardNumber,
  bank_account: maskCardNumber,
};

function maskPiiFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(masked)) {
    const masker = PII_MASKERS[key.toLowerCase()];
    if (masker && typeof masked[key] === 'string') {
      masked[key] = masker(masked[key]);
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskPiiFields(masked[key]);
    }
  }
  return masked;
}

module.exports = {
  maskNid,
  maskPhone,
  maskEmail,
  maskLicense,
  maskCardNumber,
  maskPiiFields,
  PII_MASKERS,
};
