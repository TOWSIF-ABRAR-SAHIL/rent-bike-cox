const Announcement = require('../models/Announcement');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

let announcementsSeeded = false;
exports.seedAnnouncements = async () => {
  if (announcementsSeeded) return;
  const count = await Announcement.countDocuments();
  if (count === 0) {
    await Announcement.create({
      title: 'Welcome to Rent Bike Cox\'s Bazar',
      message: 'Explore Cox\'s Bazar on two wheels! Browse our collection of bikes, cars, and jeeps.',
      type: 'banner',
      position: 'top',
      pages: ['all'],
      audience: 'all',
      isActive: false,
      isDismissible: true,
      bgColor: '#f59e0b',
      textColor: '#000000',
      priority: 10
    });
  }
  announcementsSeeded = true;
};

exports.getActive = async (req, res) => {
  try {
    const { page } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      startDate: { $lte: now },
    };
    query.$or = [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } }
    ];
    if (page) {
      query.$or = [
        { pages: 'all' },
        { pages: page }
      ];
    }

    const announcements = await Announcement.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.set('Cache-Control', 'public, max-age=60');
    res.json(announcements);
  } catch (error) {
    logger.error('getActive announcements error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, message, type, position, pages, audience, startDate, endDate, isActive, isDismissible, bgColor, textColor, linkText, linkUrl, priority } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

    const announcement = await Announcement.create({
      title: sanitize(String(title)),
      message: sanitize(String(message)),
      type, position, pages, audience, startDate, endDate,
      isActive, isDismissible, bgColor, textColor, linkText, linkUrl, priority,
      createdBy: req.user._id
    });
    res.status(201).json(announcement);
  } catch (error) {
    logger.error('create announcement error:', error.message);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['title', 'message', 'type', 'position', 'pages', 'audience', 'startDate', 'endDate', 'isActive', 'isDismissible', 'bgColor', 'textColor', 'linkText', 'linkUrl', 'priority'];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        update[field] = ['title', 'message', 'linkText'].includes(field) ? sanitize(String(req.body[field])) : req.body[field];
      }
    }
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json(announcement);
  } catch (error) {
    logger.error('update announcement error:', error.message);
    res.status(500).json({ message: 'Failed to update announcement' });
  }
};

exports.remove = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.trackView = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.trackClick = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { clickCount: 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
