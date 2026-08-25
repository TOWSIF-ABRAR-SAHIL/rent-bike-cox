const ContactMessage = require('../models/ContactMessage');
const Counter = require('../models/Counter');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

async function generateTicketId() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'contactTicket' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const year = new Date().getFullYear();
  const num = String(counter.seq).padStart(5, '0');
  return `SUP-${year}-${num}`;
}

async function getEscalationStats() {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const openMessages = await ContactMessage.find({
    status: { $in: ['new', 'open', 'inProgress', 'waitingReply'] }
  }).lean();

  let escalated = 0;
  for (const msg of openMessages) {
    const createdAt = new Date(msg.createdAt);
    const isComplaint = msg.category === 'complaint';
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

    let shouldEscalate = false;
    if (isComplaint) {
      shouldEscalate = true;
      escalated++;
    } else if (hoursSinceCreation > 24) {
      shouldEscalate = true;
      escalated++;
    } else if (hoursSinceCreation > 4) {
      shouldEscalate = true;
      escalated++;
    }
  }

  const total = await ContactMessage.countDocuments();
  const open = openMessages.length;
  const closed = await ContactMessage.countDocuments({ status: { $in: ['resolved', 'closed'] } });

  return { total, open, closed, escalated };
}

exports.submitMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject, and message are required' });
    }

    const ticketId = await generateTicketId();

    const msgObj = {
      ticketId,
      name: sanitize(String(name)),
      email: sanitize(String(email)).toLowerCase(),
      phone: phone || '',
      subject: sanitize(String(subject)),
      message: sanitize(String(message)),
      category: category || 'general',
      metadata: { ipAddress: req.ip },
      conversation: [{
        sender: 'customer',
        message: sanitize(String(message)),
        sentAt: new Date()
      }]
    };

    if (req.user) {
      msgObj.user = req.user.id;
      msgObj.name = req.user.name || msgObj.name;
      msgObj.email = req.user.email || msgObj.email;
    }

    if (category === 'complaint' || category === 'emergency') {
      msgObj.priority = 'high';
    }

    const msg = await ContactMessage.create(msgObj);
    res.status(201).json({ message: 'Message sent successfully', ticketId: msg.ticketId, id: msg._id });
  } catch (error) {
    logger.error('submitMessage error:', error.message);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await ContactMessage.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(messages);
  } catch (error) {
    logger.error('getMyTickets error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.replyAsUser = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (req.user.id && msg.user && req.user.id.toString() !== msg.user.toString()) {
      return res.status(403).json({ message: 'Not your ticket' });
    }

    msg.conversation.push({
      sender: 'customer',
      message: sanitize(String(message)),
      sentAt: new Date(),
      sentBy: req.user.id
    });
    msg.status = 'waitingReply';
    await msg.save();
    res.json(msg);
  } catch (error) {
    logger.error('replyAsUser error:', error.message);
    res.status(500).json({ message: 'Failed to reply' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { status, category, priority, assignedTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const total = await ContactMessage.countDocuments(filter);
    const messages = await ContactMessage.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ messages, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await getEscalationStats();

    const now = new Date();
    const openMsgs = await ContactMessage.find({
      status: { $in: ['new', 'open', 'inProgress', 'waitingReply'] }
    }).sort({ createdAt: -1 }).lean();

    let totalResponseTime = 0;
    let responseCount = 0;
    for (const msg of openMsgs) {
      if (msg.conversation && msg.conversation.length > 0) {
        const customerMsg = msg.conversation.find(c => c.sender === 'customer');
        const adminReply = msg.conversation.find(c => c.sender === 'admin');
        if (customerMsg && adminReply) {
          totalResponseTime += (new Date(adminReply.sentAt) - new Date(customerMsg.sentAt));
          responseCount++;
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60) * 10) / 10 : 0;

    res.json({
      ...stats,
      avgResponseTimeHours: avgResponseTime,
      byCategory: await ContactMessage.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      byPriority: await ContactMessage.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    });
  } catch (error) {
    logger.error('getStats error:', error.message);
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
      { $set: { status: 'open' } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.assignMessage = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'inProgress' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign' });
  }
};

exports.updatePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { priority },
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

    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    msg.conversation.push({
      sender: 'admin',
      message: sanitize(String(reply)),
      sentAt: new Date(),
      sentBy: req.user.id
    });
    msg.status = 'replied';
    msg.repliedAt = new Date();
    msg.repliedBy = req.user.id;
    await msg.save();

    res.json(msg);
  } catch (error) {
    logger.error('reply error:', error.message);
    res.status(500).json({ message: 'Failed to send reply' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'open', 'inProgress', 'waitingReply', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const update = { status };
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = new Date();
    }
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      update,
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
    const count = await ContactMessage.countDocuments({ status: { $in: ['new', 'open'] } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
