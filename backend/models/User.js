const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  nid: { type: String, required: true, unique: true },
  license: { type: String, required: true },
  nidImage: { type: String }, // URL to Cloudinary
  licenseImage: { type: String }, // URL to Cloudinary
  phoneNumber: { type: String, required: true },
  address: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
