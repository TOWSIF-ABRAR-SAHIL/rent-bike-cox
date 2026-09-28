const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../security/utils/cryptoUtils');
const { hashIdentifier } = require('../security/utils/piiHash');
const ENCRYPTION_AVAILABLE = !!process.env.ENCRYPTION_KEY;

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100, trim: true },
  email: { type: String, required: true, unique: true, maxlength: 254, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  nid: { type: String, required: true },
  // Keyed hashes used only for duplicate detection. `select: false` keeps them out
  // of ordinary query results; they are still unique, and sparse so rows written
  // before hashing existed don't collide.
  nidHash: { type: String, unique: true, sparse: true, select: false },
  phoneHash: { type: String, unique: true, sparse: true, select: false },
  license: { type: String, required: true },
  nidImage: { type: String, default: '' },
  licenseImage: { type: String, default: '' },
  phoneNumber: { type: String, required: true },
  address: { type: String, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 500, default: '' },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' },
  },
  isVerified: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  // Stamped on every successful login/refresh. The retention job previously keyed
  // off `date` (registration) and anonymised long-standing active customers.
  lastLoginAt: { type: Date },
  // Bumped on password change/reset. Embedded in access tokens and checked by
  // authMiddleware, which is what actually revokes tokens before their 15m expiry.
  tokenVersion: { type: Number, default: 0 },
});

UserSchema.pre('save', async function () {
  if (!ENCRYPTION_AVAILABLE) return;

  if (this.isNew || this.isModified('nid')) {
    if (this.nid && !this.nid.startsWith('{')) {
      // Keyed, not a bare SHA-256 — a 10-digit NID's whole keyspace is enumerable.
      const nidHash = hashIdentifier(this.nid);
      if (nidHash) {
        const existing = await mongoose.model('User').findOne({ nidHash }).lean();
        if (existing && existing._id.toString() !== this._id.toString()) {
          throw new Error('A user with this NID already exists');
        }
        this.nidHash = nidHash;
      }
      this.nid = encrypt(this.nid);
    }
  }
  if (this.isModified('license') && this.license && !this.license.startsWith('{')) {
    this.license = encrypt(this.license);
  }
  if (this.isModified('phoneNumber') && this.phoneNumber && !this.phoneNumber.startsWith('{')) {
    const phoneHash = hashIdentifier(this.phoneNumber);
    if (phoneHash) this.phoneHash = phoneHash;
    this.phoneNumber = encrypt(this.phoneNumber);
  }
});

function decryptField(val) {
  if (!ENCRYPTION_AVAILABLE || !val || !val.startsWith('{')) return val;
  try { return decrypt(val); } catch { return val; }
}

UserSchema.post('find', function (docs) {
  if (!ENCRYPTION_AVAILABLE || !docs) return;
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    if (doc) {
      doc.nid = decryptField(doc.nid);
      doc.license = decryptField(doc.license);
      doc.phoneNumber = decryptField(doc.phoneNumber);
    }
  }
});

UserSchema.post('findOne', function (doc) {
  if (!ENCRYPTION_AVAILABLE || !doc) return;
  doc.nid = decryptField(doc.nid);
  doc.license = decryptField(doc.license);
  doc.phoneNumber = decryptField(doc.phoneNumber);
});

UserSchema.post('findOneAndUpdate', function (doc) {
  if (!ENCRYPTION_AVAILABLE || !doc) return;
  doc.nid = decryptField(doc.nid);
  doc.license = decryptField(doc.license);
  doc.phoneNumber = decryptField(doc.phoneNumber);
});

module.exports = mongoose.model('User', UserSchema);
