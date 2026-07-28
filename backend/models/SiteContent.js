const mongoose = require('mongoose');

const validationSchema = new mongoose.Schema({
  required: { type: Boolean, default: false },
  minLength: { type: Number },
  maxLength: { type: Number },
  regex: { type: String }
}, { _id: false });

const contentHistorySchema = new mongoose.Schema({
  value: { type: mongoose.Schema.Types.Mixed, required: true },
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
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'richText', 'number', 'image', 'json', 'markdown', 'url'],
    default: 'text'
  },
  page: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  section: {
    type: String,
    trim: true,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  validation: {
    type: validationSchema,
    default: () => ({})
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  group: {
    type: String,
    default: ''
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  history: {
    type: [contentHistorySchema],
    default: [],
    validate: {
      validator: function (v) {
        return v.length <= 20;
      },
      message: 'History is limited to 20 entries'
    }
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

siteContentSchema.index({ page: 1, key: 1 });
siteContentSchema.index({ page: 1, section: 1 });
siteContentSchema.index({ group: 1, sortOrder: 1 });

module.exports = mongoose.model('SiteContent', siteContentSchema);
