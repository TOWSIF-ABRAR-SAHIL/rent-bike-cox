const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  nid: { type: String, required: true, unique: true, maxlength: 20 },
  license: { type: String, required: true, maxlength: 30 },
  nidImage: { type: String },
  licenseImage: { type: String },
  phoneNumber: { type: String, required: true, maxlength: 15 },
  address: { type: String, maxlength: 200 },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
