const NotificationTemplate = require('../models/NotificationTemplate');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

const defaultTemplates = [
  { key: 'welcome.email', title: 'Welcome', body: 'Welcome to {{businessName}}, {{userName}}! Your account is ready. Browse vehicles and start renting today.', variables: ['businessName', 'userName'], channel: 'email', subject: 'Welcome to {{businessName}}!' },
  { key: 'booking.pending', title: 'Booking Pending', body: 'Hi {{userName}}, your booking #{{bookingCode}} for {{bikeName}} is pending payment confirmation.', variables: ['userName', 'bookingCode', 'bikeName'], channel: 'inApp' },
  { key: 'booking.confirmed', title: 'Booking Confirmed', body: 'Hi {{userName}}, your booking #{{bookingCode}} for {{bikeName}} on {{startDate}} is confirmed. Total: ৳{{amount}}', variables: ['userName', 'bookingCode', 'bikeName', 'startDate', 'amount'], channel: 'email', subject: 'Booking #{{bookingCode}} Confirmed' },
  { key: 'booking.cancelled', title: 'Booking Cancelled', body: 'Hi {{userName}}, your booking #{{bookingCode}} has been cancelled. {{refundInfo}}', variables: ['userName', 'bookingCode', 'refundInfo'], channel: 'email', subject: 'Booking #{{bookingCode}} Cancelled' },
  { key: 'payment.success', title: 'Payment Received', body: 'Payment of ৳{{amount}} received for booking #{{bookingCode}}. Transaction: {{tranId}}', variables: ['amount', 'bookingCode', 'tranId'], channel: 'email', subject: 'Payment Confirmed — ৳{{amount}}' },
  { key: 'payment.failed', title: 'Payment Failed', body: 'Payment for booking #{{bookingCode}} failed. Please try again or contact support.', variables: ['bookingCode'], channel: 'email', subject: 'Payment Failed' },
  { key: 'payment.refunded', title: 'Refund Processed', body: 'A refund of ৳{{refundAmount}} has been processed for booking #{{bookingCode}}.', variables: ['refundAmount', 'bookingCode'], channel: 'email', subject: 'Refund of ৳{{refundAmount}} Processed' },
  { key: 'verification.approved', title: 'Account Verified', body: 'Hi {{userName}}, your account has been verified. You can now access all features.', variables: ['userName'], channel: 'inApp' },
  { key: 'verification.rejected', title: 'Verification Rejected', body: 'Hi {{userName}}, your verification was rejected. Reason: {{reason}}. Please resubmit.', variables: ['userName', 'reason'], channel: 'inApp' },
  { key: 'passwordReset.otp', title: 'Password Reset', body: 'Your OTP code is {{otp}}. It expires in 15 minutes.', variables: ['otp'], channel: 'email', subject: 'Your OTP Code' },
  { key: 'bike.approved', title: 'Vehicle Approved', body: 'Your {{bikeName}} listing has been approved and is now live.', variables: ['bikeName'], channel: 'inApp' },
  { key: 'bike.rejected', title: 'Vehicle Rejected', body: 'Your {{bikeName}} listing was not approved. Reason: {{reason}}.', variables: ['bikeName', 'reason'], channel: 'inApp' },
  { key: 'maintenance.due', title: 'Maintenance Due', body: 'Vehicle {{bikeName}} is due for {{maintenanceType}}. Please schedule maintenance.', variables: ['bikeName', 'maintenanceType'], channel: 'inApp' },
  { key: 'contact.received', title: 'Contact Message', body: 'New message from {{senderName}} ({{category}}): {{subject}}', variables: ['senderName', 'category', 'subject'], channel: 'inApp' },
  { key: 'contact.reply', title: 'Reply to Your Message', body: 'Admin replied to your message "{{subject}}": {{reply}}', variables: ['subject', 'reply'], channel: 'email', subject: 'Reply to your message' },
  { key: 'announcement.new', title: 'New Announcement', body: '{{title}}: {{message}}', variables: ['title', 'message'], channel: 'inApp' },
  { key: 'booking.completed', title: 'Booking Completed', body: 'Hi {{userName}}, your booking #{{bookingCode}} for {{bikeName}} is complete. Thank you!', variables: ['userName', 'bookingCode', 'bikeName'], channel: 'inApp' },
  { key: 'campaign.broadcast', title: 'Broadcast', body: '{{campaignBody}}', variables: ['campaignBody'], channel: 'email', subject: '{{campaignSubject}}' },
];

let seeded = false;

exports.seedTemplates = async () => {
  if (seeded) return;
  const count = await NotificationTemplate.countDocuments();
  if (count === 0) {
    await NotificationTemplate.insertMany(defaultTemplates);
  }
  seeded = true;
};

exports.getAll = async (req, res) => {
  try {
    await exports.seedTemplates();
    const templates = await NotificationTemplate.find().sort({ channel: 1, key: 1 }).lean();
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
    const { title, body, subject, variables, isActive, channel } = req.body;
    const update = {};
    if (title !== undefined) update.title = sanitize(String(title));
    if (body !== undefined) update.body = sanitize(String(body));
    if (subject !== undefined) update.subject = subject;
    if (variables !== undefined) update.variables = variables;
    if (isActive !== undefined) update.isActive = isActive;
    if (channel !== undefined) update.channel = channel;
    update.lastModifiedBy = req.user._id;

    const template = await NotificationTemplate.findOneAndUpdate(
      { key: req.params.key },
      { $set: update },
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    logger.error('update template error:', error.message);
    res.status(500).json({ message: 'Failed to update template' });
  }
};

exports.renderTemplate = async (key, data) => {
  const template = await NotificationTemplate.findOne({ key, isActive: true }).lean();
  if (!template) return null;
  let body = template.body;
  for (const [k, v] of Object.entries(data || {})) {
    body = body.replace(new RegExp(`{{${k}}}`, 'g'), v ?? '');
  }
  let subject = template.subject;
  if (subject) {
    for (const [k, v] of Object.entries(data || {})) {
      subject = subject.replace(new RegExp(`{{${k}}}`, 'g'), v ?? '');
    }
  }
  return { ...template, body, subject };
};
