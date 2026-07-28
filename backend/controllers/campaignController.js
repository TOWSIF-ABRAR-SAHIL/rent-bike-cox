const EmailCampaign = require('../models/EmailCampaign');
const User = require('../models/User');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await EmailCampaign.countDocuments();
    const campaigns = await EmailCampaign.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();
    res.json({ campaigns, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, subject, body, template, audience, scheduledAt } = req.body;
    if (!name || !subject || !body) return res.status(400).json({ message: 'Name, subject, and body are required' });
    const campaign = await EmailCampaign.create({
      name: sanitize(String(name)),
      subject: sanitize(String(subject)),
      body,
      template: template || undefined,
      audience: audience || { filter: 'all' },
      scheduledAt: scheduledAt || undefined,
      createdBy: req.user._id
    });
    res.status(201).json(campaign);
  } catch (error) {
    logger.error('create campaign error:', error.message);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['name', 'subject', 'body', 'template', 'audience', 'scheduledAt', 'status'];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        update[field] = ['name', 'subject'].includes(field) ? sanitize(String(req.body[field])) : req.body[field];
      }
    }
    const campaign = await EmailCampaign.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update campaign' });
  }
};

exports.remove = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.previewAudience = async (req, res) => {
  try {
    const { filter } = req.body;
    let query = {};
    if (filter === 'users') query = { role: 'User' };
    else if (filter === 'renters') query = { role: 'Renter' };
    else if (filter === 'admins') query = { role: 'Admin' };
    const count = await User.countDocuments(query);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.send = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return res.status(400).json({ message: 'Campaign already sent or sending' });
    }

    campaign.status = 'sending';
    await campaign.save();

    let query = {};
    if (campaign.audience.filter === 'users') query = { role: 'User' };
    else if (campaign.audience.filter === 'renters') query = { role: 'Renter' };
    else if (campaign.audience.filter === 'admins') query = { role: 'Admin' };
    else if (campaign.audience.filter === 'custom' && campaign.audience.customUserIds?.length) {
      query = { _id: { $in: campaign.audience.customUserIds } };
    }

    const users = await User.find(query).select('email name').lean();
    let sentCount = 0;
    let failedCount = 0;

    const emailService = require('../services/emailService');
    for (const user of users) {
      try {
        let body = campaign.body;
        body = body.replace(/{{userName}}/g, user.name || '');
        body = body.replace(/{{userEmail}}/g, user.email || '');

        const result = await emailService.sendEmail({
          to: user.email,
          subject: campaign.subject,
          html: body
        });
        if (result.sent) sentCount++;
        else failedCount++;
      } catch {
        failedCount++;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.sentCount = sentCount;
    campaign.failedCount = failedCount;
    await campaign.save();

    res.json({ message: 'Campaign sent', sentCount, failedCount, total: users.length });
  } catch (error) {
    logger.error('send campaign error:', error.message);
    const campaign = await EmailCampaign.findById(req.params.id);
    if (campaign) { campaign.status = 'failed'; await campaign.save(); }
    res.status(500).json({ message: 'Failed to send campaign' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({
      name: campaign.name,
      status: campaign.status,
      sentAt: campaign.sentAt,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      openCount: campaign.openCount,
      clickCount: campaign.clickCount,
      audience: campaign.audience
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
