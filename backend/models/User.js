const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  nid: { type: String, required: true, unique: true },
  license: { type: String, required: true },
  nidImage: { type: String, default: '' },
  licenseImage: { type: String, default: '' },
  phoneNumber: { type: String, required: true },
  address: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
