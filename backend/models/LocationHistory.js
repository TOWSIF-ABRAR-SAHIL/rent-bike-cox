const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  battery: { type: Number, default: 100 },
  accuracy: { type: Number, default: 0 },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

locationHistorySchema.index({ bike: 1, recordedAt: -1 });
locationHistorySchema.index({ coordinates: '2dsphere' });
locationHistorySchema.index({ recordedAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
