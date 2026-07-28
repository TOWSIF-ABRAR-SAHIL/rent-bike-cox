const NotificationTemplate = require('../models/NotificationTemplate');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

const defaultTemplates = [
  { key: 'user.welcome', name: 'Welcome Email', category: 'auth', channels: { email: { subject: 'Welcome to {{businessName}}, {{userName}}!', body: '<h2>Welcome to {{businessName}}!</h2><p>Hi {{userName}},</p><p>Your account is ready. Browse our vehicles and start renting today.</p>', isActive: true }, inApp: { title: 'Welcome!', body: 'Welcome to {{businessName}}, {{userName}}!', isActive: true } }, variables: [{ name: 'userName', description: 'User display name' }, { name: 'businessName', description: 'Business name' }] },
  { key: 'user.verification.approved', name: 'Verification Approved', category: 'auth', channels: { email: { subject: 'Account Verified', body: '<p>Hi {{userName}},</p><p>Your account has been verified. You can now access all features.</p>' }, inApp: { title: 'Verified!', body: 'Your account is now verified. Full access unlocked.', isActive: true } }, variables: [{ name: 'userName', description: 'User display name' }] },
  { key: 'user.verification.rejected', name: 'Verification Rejected', category: 'auth', channels: { email: { subject: 'Verification Update', body: '<p>Hi {{userName}},</p><p>Your verification was rejected. Reason: {{reason}}</p>' }, inApp: { title: 'Verification Rejected', body: 'Verification rejected: {{reason}}', isActive: true } }, variables: [{ name: 'userName' }, { name: 'reason', description: 'Rejection reason' }] },
  { key: 'user.passwordReset.otp', name: 'Password Reset OTP', category: 'auth', channels: { email: { subject: 'Your OTP Code', body: '<p>Your OTP code is <strong>{{otp}}</strong>.</p><p>It expires in 15 minutes.</p>', isActive: true } }, variables: [{ name: 'otp', description: 'One-time password code' }] },
  { key: 'user.passwordReset.success', name: 'Password Reset Success', category: 'auth', channels: { email: { subject: 'Password Changed', body: '<p>Your password has been changed successfully.</p>' }, inApp: { title: 'Password Changed', body: 'Your password was updated successfully.', isActive: true } }, variables: [] },
  { key: 'user.accountDeleted', name: 'Account Deleted', category: 'auth', channels: { email: { subject: 'Account Deleted', body: '<p>Your account has been deleted. If this was a mistake, please contact support within 30 days.</p>' }, inApp: { title: 'Account Deleted', body: 'Your account has been deleted.', isActive: true } }, variables: [] },
  { key: 'booking.created', name: 'Booking Created', category: 'booking', channels: { email: { subject: 'Booking #{{bookingCode}} Created', body: '<p>Hi {{userName}},</p><p>Your booking #{{bookingCode}} for {{bikeName}} has been created. Please complete payment to confirm.</p>' }, inApp: { title: 'Booking Created', body: 'Booking #{{bookingCode}} created for {{bikeName}}.', isActive: true } }, variables: [{ name: 'userName' }, { name: 'bookingCode' }, { name: 'bikeName' }] },
  { key: 'booking.confirmed', name: 'Booking Confirmed', category: 'booking', channels: { email: { subject: 'Booking #{{bookingCode}} Confirmed — ৳{{amount}}', body: '<h2>Booking Confirmed!</h2><p>Hi {{userName}},</p><p>Your booking #{{bookingCode}} for <strong>{{bikeName}}</strong> on {{startDate}} is confirmed.</p><p>Total: ৳{{amount}}</p>' }, inApp: { title: 'Booking Confirmed!', body: 'Booking #{{bookingCode}} confirmed for {{bikeName}}. Total: ৳{{amount}}', isActive: true } }, variables: [{ name: 'userName' }, { name: 'bookingCode' }, { name: 'bikeName' }, { name: 'startDate' }, { name: 'amount' }] },
  { key: 'booking.cancelled.byUser', name: 'Booking Cancelled by User', category: 'booking', channels: { email: { subject: 'Booking #{{bookingCode}} Cancelled', body: '<p>Hi {{userName}},</p><p>Your booking #{{bookingCode}} has been cancelled.</p><p>{{refundInfo}}</p>' }, inApp: { title: 'Booking Cancelled', body: 'Booking #{{bookingCode}} cancelled. {{refundInfo}}', isActive: true } }, variables: [{ name: 'userName' }, { name: 'bookingCode' }, { name: 'refundInfo' }] },
  { key: 'booking.cancelled.byAdmin', name: 'Booking Cancelled by Admin', category: 'booking', channels: { email: { subject: 'Booking #{{bookingCode}} Cancelled by Admin', body: '<p>Hi {{userName}},</p><p>Your booking #{{bookingCode}} has been cancelled by the admin.</p><p>Reason: {{reason}}</p><p>{{refundInfo}}</p>' }, inApp: { title: 'Booking Cancelled', body: 'Booking #{{bookingCode}} cancelled by admin. {{refundInfo}}', isActive: true } }, variables: [{ name: 'userName' }, { name: 'bookingCode' }, { name: 'reason' }, { name: 'refundInfo' }] },
  { key: 'booking.completed', name: 'Booking Completed', category: 'booking', channels: { inApp: { title: 'Booking Complete', body: 'Booking #{{bookingCode}} for {{bikeName}} is complete. Thank you!', isActive: true } }, variables: [{ name: 'bookingCode' }, { name: 'bikeName' }] },
  { key: 'booking.reminder', name: 'Booking Reminder', category: 'booking', channels: { email: { subject: 'Reminder: Booking #{{bookingCode}} Tomorrow', body: '<p>Hi {{userName}},</p><p>This is a reminder that your booking #{{bookingCode}} for {{bikeName}} starts tomorrow at {{startTime}}. Please be on time!</p>' }, inApp: { title: 'Booking Reminder', body: 'Your booking #{{bookingCode}} for {{bikeName}} starts {{startTime}}.', isActive: true } }, variables: [{ name: 'userName' }, { name: 'bookingCode' }, { name: 'bikeName' }, { name: 'startTime' }] },
  { key: 'booking.active', name: 'Booking Active', category: 'booking', channels: { inApp: { title: 'Ride Started!', body: 'Your booking #{{bookingCode}} is now active. Enjoy your ride!', isActive: true } }, variables: [{ name: 'bookingCode' }] },
  { key: 'booking.lateReturn.warning', name: 'Late Return Warning', category: 'booking', channels: { inApp: { title: 'Late Return Warning', body: 'Vehicle {{bikeName}} is overdue. Please return immediately. Late fees apply.', isActive: true } }, variables: [{ name: 'bikeName' }] },
  { key: 'payment.success', name: 'Payment Successful', category: 'payment', channels: { email: { subject: 'Payment Confirmed — ৳{{amount}}', body: '<p>Payment of <strong>৳{{amount}}</strong> received for booking #{{bookingCode}}.</p><p>Transaction: {{tranId}}</p>' }, inApp: { title: 'Payment Received', body: '৳{{amount}} received for booking #{{bookingCode}}.', isActive: true } }, variables: [{ name: 'amount' }, { name: 'bookingCode' }, { name: 'tranId' }] },
  { key: 'payment.failed', name: 'Payment Failed', category: 'payment', channels: { email: { subject: 'Payment Failed', body: '<p>Payment for booking #{{bookingCode}} failed.</p><p>Please try again or contact support.</p>' }, inApp: { title: 'Payment Failed', body: 'Payment for booking #{{bookingCode}} failed. Try again.', isActive: true } }, variables: [{ name: 'bookingCode' }] },
  { key: 'payment.refund.initiated', name: 'Refund Initiated', category: 'payment', channels: { email: { subject: 'Refund Initiated — ৳{{refundAmount}}', body: '<p>A refund of <strong>৳{{refundAmount}}</strong> has been initiated for booking #{{bookingCode}}.</p><p>Processing takes 3-5 business days.</p>' }, inApp: { title: 'Refund Initiated', body: 'Refund of ৳{{refundAmount}} initiated for booking #{{bookingCode}}.', isActive: true } }, variables: [{ name: 'refundAmount' }, { name: 'bookingCode' }] },
  { key: 'payment.refund.completed', name: 'Refund Completed', category: 'payment', channels: { email: { subject: 'Refund Completed — ৳{{refundAmount}}', body: '<p>Your refund of <strong>৳{{refundAmount}}</strong> for booking #{{bookingCode}} has been completed.</p>' }, inApp: { title: 'Refund Completed', body: 'Refund of ৳{{refundAmount}} for booking #{{bookingCode}} completed.', isActive: true } }, variables: [{ name: 'refundAmount' }, { name: 'bookingCode' }] },
  { key: 'payment.payout.sent', name: 'Renter Payout Sent', category: 'payment', channels: { email: { subject: 'Payout Sent — ৳{{amount}}', body: '<p>A payout of <strong>৳{{amount}}</strong> has been sent to your account.</p>' }, inApp: { title: 'Payout Sent', body: '৳{{amount}} payout sent.', isActive: true } }, variables: [{ name: 'amount' }] },
  { key: 'vehicle.submitted', name: 'Vehicle Submitted for Review', category: 'vehicle', channels: { inApp: { title: 'Vehicle Under Review', body: 'Your {{bikeName}} listing has been submitted and is under review.', isActive: true } }, variables: [{ name: 'bikeName' }] },
  { key: 'vehicle.approved', name: 'Vehicle Approved', category: 'vehicle', channels: { inApp: { title: 'Vehicle Approved', body: 'Your {{bikeName}} listing is approved and now live!', isActive: true } }, variables: [{ name: 'bikeName' }] },
  { key: 'vehicle.rejected', name: 'Vehicle Rejected', category: 'vehicle', channels: { inApp: { title: 'Vehicle Rejected', body: 'Your {{bikeName}} listing was rejected. Reason: {{reason}}', isActive: true } }, variables: [{ name: 'bikeName' }, { name: 'reason' }] },
  { key: 'vehicle.maintenanceDue', name: 'Maintenance Due', category: 'vehicle', channels: { inApp: { title: 'Maintenance Due', body: '{{bikeName}} is due for {{maintenanceType}}. Please schedule maintenance.', isActive: true } }, variables: [{ name: 'bikeName' }, { name: 'maintenanceType' }] },
  { key: 'vehicle.documentExpiring', name: 'Document Expiring', category: 'vehicle', channels: { email: { subject: 'Vehicle Document Expiring Soon', body: '<p>Document for {{bikeName}} ({{docType}}) expires on {{expiryDate}}.</p><p>Please renew to avoid service interruption.</p>' }, inApp: { title: 'Document Expiring', body: '{{docType}} for {{bikeName}} expires {{expiryDate}}.', isActive: true } }, variables: [{ name: 'bikeName' }, { name: 'docType' }, { name: 'expiryDate' }] },
  { key: 'admin.newUser', name: 'Admin: New User', category: 'admin', channels: { inApp: { title: 'New User', body: 'New user registered: {{userName}} ({{userEmail}})', isActive: true } }, variables: [{ name: 'userName' }, { name: 'userEmail' }] },
  { key: 'admin.newBooking', name: 'Admin: New Booking', category: 'admin', channels: { inApp: { title: 'New Booking', body: 'New booking #{{bookingCode}} by {{userName}} for {{bikeName}}', isActive: true } }, variables: [{ name: 'bookingCode' }, { name: 'userName' }, { name: 'bikeName' }] },
  { key: 'admin.paymentReceived', name: 'Admin: Payment Received', category: 'admin', channels: { inApp: { title: 'Payment Received', body: '৳{{amount}} received for booking #{{bookingCode}}', isActive: true } }, variables: [{ name: 'amount' }, { name: 'bookingCode' }] },
  { key: 'admin.fraudDetected', name: 'Admin: Fraud Alert', category: 'admin', channels: { inApp: { title: 'Fraud Detected', body: 'Suspicious activity detected for user {{userName}}: {{details}}', isActive: true } }, variables: [{ name: 'userName' }, { name: 'details' }] },
  { key: 'admin.systemError', name: 'Admin: System Error', category: 'admin', channels: { inApp: { title: 'System Error', body: 'Error: {{errorMessage}}. Occurred {{count}} times in 5 minutes.', isActive: true } }, variables: [{ name: 'errorMessage' }, { name: 'count' }] },
  { key: 'admin.contactMessage', name: 'Admin: Contact Message', category: 'admin', channels: { inApp: { title: 'Contact Message', body: 'New message from {{senderName}}: {{subject}}', isActive: true } }, variables: [{ name: 'senderName' }, { name: 'subject' }] },
  { key: 'contact.reply', name: 'Contact Reply to User', category: 'system', channels: { email: { subject: 'Reply: {{subject}}', body: '<p>Admin replied to your message "{{subject}}":</p><blockquote>{{reply}}</blockquote>' }, inApp: { title: 'Reply Received', body: 'Admin replied: {{reply}}', isActive: true } }, variables: [{ name: 'subject' }, { name: 'reply' }] },
];

let seeded = false;

exports.seedTemplates = async () => {
  if (seeded) return;
  const count = await NotificationTemplate.countDocuments();
  if (count === 0) {
    await NotificationTemplate.insertMany(defaultTemplates.map(t => ({
      ...t,
      variables: t.variables || [],
      channels: {
        email: { subject: '', body: '', isActive: true, ...(t.channels?.email || {}) },
        inApp: { title: '', body: '', isActive: true, ...(t.channels?.inApp || {}) },
        sms: { message: '', isActive: false, ...(t.channels?.sms || {}) },
        push: { title: '', body: '', isActive: false, ...(t.channels?.push || {}) }
      }
    })));
    logger.info('Notification templates seeded');
  }
  seeded = true;
};

exports.getAll = async (req, res) => {
  try {
    await exports.seedTemplates();
    const templates = await NotificationTemplate.find().sort({ category: 1, key: 1 }).lean();
    res.json(templates);
  } catch (error) {
    logger.error('getAll templates error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getByKey = async (req, res) => {
  try {
    const template = await NotificationTemplate.findOne({ key: req.params.key }).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, channels, variables, category, isActive } = req.body;
    const template = await NotificationTemplate.findOne({ key: req.params.key });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    template.history.push({
      channels: JSON.parse(JSON.stringify(template.channels)),
      changedAt: new Date(),
      changedBy: req.user._id
    });

    if (name !== undefined) template.name = String(name);
    if (channels !== undefined) {
      if (channels.email) {
        if (channels.email.subject !== undefined) template.channels.email.subject = channels.email.subject;
        if (channels.email.body !== undefined) template.channels.email.body = sanitize(channels.email.body);
        if (channels.email.isActive !== undefined) template.channels.email.isActive = channels.email.isActive;
      }
      if (channels.inApp) {
        if (channels.inApp.title !== undefined) template.channels.inApp.title = sanitize(channels.inApp.title);
        if (channels.inApp.body !== undefined) template.channels.inApp.body = sanitize(channels.inApp.body);
        if (channels.inApp.isActive !== undefined) template.channels.inApp.isActive = channels.inApp.isActive;
      }
      if (channels.sms) {
        if (channels.sms.message !== undefined) template.channels.sms.message = sanitize(channels.sms.message);
        if (channels.sms.isActive !== undefined) template.channels.sms.isActive = channels.sms.isActive;
      }
      if (channels.push) {
        if (channels.push.title !== undefined) template.channels.push.title = sanitize(channels.push.title);
        if (channels.push.body !== undefined) template.channels.push.body = sanitize(channels.push.body);
        if (channels.push.isActive !== undefined) template.channels.push.isActive = channels.push.isActive;
      }
    }
    if (variables !== undefined) template.variables = variables;
    if (category !== undefined) template.category = category;
    if (isActive !== undefined) template.isActive = isActive;
    template.lastModifiedBy = req.user._id;

    await template.save();
    res.json(template);
  } catch (error) {
    logger.error('update template error:', error.message);
    res.status(500).json({ message: 'Failed to update template' });
  }
};
