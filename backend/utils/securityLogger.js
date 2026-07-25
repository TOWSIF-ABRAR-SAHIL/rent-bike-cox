const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

async function logSecurityEvent({ action, actorId, actorRole, resourceType, resourceId, ip, userAgent, correlationId, metadata }) {
  try {
    await AuditLog.create({
      action,
      actorId,
      actorRole,
      resourceType,
      resourceId,
      ip,
      userAgent,
      correlationId,
      metadata,
    });
  } catch (err) {
    logger.error('Failed to log security event', { error: err.message });
  }
  logger.warn(`Security: ${action}`, { actorId, ip, resourceType, resourceId, ...metadata });
}

module.exports = { logSecurityEvent };
