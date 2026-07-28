const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../security/utils/cryptoUtils');
const ENCRYPTION_AVAILABLE = !!process.env.ENCRYPTION_KEY;

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100, trim: true },
  email: { type: String, required: true, unique: true, maxlength: 254, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  nid: { type: String, required: true },
  nidHash: { type: String, unique: true, sparse: true },
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
});

UserSchema.pre('save', async function (next) {
  if (!ENCRYPTION_AVAILABLE) return next();

  if (this.isNew || this.isModified('nid')) {
    if (this.nid && !this.nid.startsWith('{')) {
      const crypto = require('crypto');
      const nidHash = crypto.createHash('sha256').update(this.nid).digest('hex');
      const existing = await mongoose.model('User').findOne({ nidHash }).lean();
      if (existing && existing._id.toString() !== this._id.toString()) {
        return next(new Error('A user with this NID already exists'));
      }
      this.nidHash = nidHash;
      this.nid = encrypt(this.nid);
    }
  }
  if (this.isModified('license') && this.license && !this.license.startsWith('{')) {
    this.license = encrypt(this.license);
  }
  if (this.isModified('phoneNumber') && this.phoneNumber && !this.phoneNumber.startsWith('{')) {
    this.phoneNumber = encrypt(this.phoneNumber);
  }
  next();
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
