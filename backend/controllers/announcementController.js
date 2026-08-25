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
      isActive: true,
      isDismissible: true,
      priority: 10,
      style: { bgColor: '#f59e0b', textColor: '#000000' },
      schedule: { startDate: new Date(), endDate: null, showOnce: true, frequency: 'once' }
    });
  }
  announcementsSeeded = true;
};

exports.getActive = async (req, res) => {
  try {
    const { page, audience } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      'schedule.startDate': { $lte: now }
    };
    query.$or = [
      { 'schedule.endDate': { $exists: false } },
      { 'schedule.endDate': null },
      { 'schedule.endDate': { $gte: now } }
    ];
    if (page && page !== 'all') {
      query.$or = [
        { 'schedule.endDate': { $exists: false } },
        { 'schedule.endDate': null },
        { 'schedule.endDate': { $gte: now } }
      ];
      query.pages = { $in: ['all', page] };
    }
    if (audience) {
      query.$or = [
        { 'schedule.endDate': { $exists: false } },
        { 'schedule.endDate': null },
        { 'schedule.endDate': { $gte: now } }
      ];
      query.audience = { $in: ['all', audience] };
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
    const { title, message, type, position, pages, audience, schedule, isActive, isDismissible, priority, style, actions } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

    const announcement = await Announcement.create({
      title: sanitize(String(title)),
      message: sanitize(String(message)),
      type, position, pages, audience,
      schedule: schedule || {},
      isActive, isDismissible, priority,
      style: style || {},
      actions: actions || {},
      createdBy: req.user.id
    });
    res.status(201).json(announcement);
  } catch (error) {
    logger.error('create announcement error:', error.message);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['title', 'message', 'type', 'position', 'pages', 'audience', 'schedule', 'isActive', 'isDismissible', 'priority', 'style', 'actions'];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        update[field] = ['title', 'message'].includes(field) ? sanitize(String(req.body[field])) : req.body[field];
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
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.impressions': 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.trackClick = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.clicks': 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.trackDismiss = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.dismissals': 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
