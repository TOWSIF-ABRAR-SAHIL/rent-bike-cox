const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  resourceType: String,
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  ip: String,
  userAgent: String,
  correlationId: { type: String, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, action: 1, createdAt: -1 });

auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
