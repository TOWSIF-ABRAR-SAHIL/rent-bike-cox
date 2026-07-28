const mongoose = require('mongoose');

const contentHistorySchema = new mongoose.Schema({
  value: { type: String, required: true },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const siteContentSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  value: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'html', 'number', 'image', 'json'],
    default: 'text'
  },
  page: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  history: {
    type: [contentHistorySchema],
    default: [],
    validate: {
      validator: function (v) {
        return v.length <= 10;
      },
      message: 'History is limited to 10 entries'
    }
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

siteContentSchema.index({ page: 1, key: 1 });

module.exports = mongoose.model('SiteContent', siteContentSchema);
