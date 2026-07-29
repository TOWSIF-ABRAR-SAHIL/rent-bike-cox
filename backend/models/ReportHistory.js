const mongoose = require('mongoose');

const reportHistorySchema = new mongoose.Schema({
  reportType: { type: String, required: true },
  format: { type: String, enum: ['csv', 'json', 'pdf', 'xlsx'], required: true },
  dateRange: {
    from: Date,
    to: Date,
  },
  fileSize: String,
  rowCount: { type: Number, default: 0 },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

reportHistorySchema.index({ createdAt: -1 });
reportHistorySchema.index({ generatedBy: 1, createdAt: -1 });

module.exports = mongoose.model('ReportHistory', reportHistorySchema);
