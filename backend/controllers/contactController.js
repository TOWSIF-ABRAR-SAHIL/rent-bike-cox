const ContactMessage = require('../models/ContactMessage');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

exports.submitMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject, and message are required' });
    }
    const msg = await ContactMessage.create({
      name: sanitize(String(name)),
      email: sanitize(String(email)).toLowerCase(),
      phone: phone || '',
      subject: sanitize(String(subject)),
      message: sanitize(String(message)),
      category: category || 'general',
      ipAddress: req.ip
    });
    res.status(201).json({ message: 'Message sent successfully', id: msg._id });
  } catch (error) {
    logger.error('submitMessage error:', error.message);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const total = await ContactMessage.countDocuments(filter);
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ messages, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const msg = await ContactMessage.findById(req.params.id).lean();
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reply = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply is required' });
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { reply: sanitize(String(reply)), repliedAt: new Date(), repliedBy: req.user._id, status: 'replied' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send reply' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'replied', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUnreadCount = async (_req, res) => {
  try {
    const count = await ContactMessage.countDocuments({ status: 'new' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
