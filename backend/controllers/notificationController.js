const Notification = require('../models/Notification');
const logger = require('../utils/logger');

exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const total = await Notification.countDocuments({ user: req.user.id });
    const unread = await Notification.countDocuments({ user: req.user.id, read: false });

    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ notifications, unread, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getNotifications error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user.id },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    logger.error('markAsRead error', { message: error.message });
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('markAllAsRead error', { message: error.message });
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unread = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ unread });
  } catch (error) {
    logger.error('getUnreadCount error', { message: error.message });
    res.status(500).json({ unread: 0 });
  }
};

exports.createNotification = async (userId, type, title, message, data = {}) => {
  try {
    await Notification.create({ user: userId, type, title, message, data });
  } catch (error) {
    logger.error('createNotification error', { message: error.message });
  }
};
