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
    const { name, subject, body, template, audience, scheduledAt, scheduling } = req.body;
    if (!name || !subject || !body) return res.status(400).json({ message: 'Name, subject, and body are required' });
    const campaign = await EmailCampaign.create({
      name: sanitize(String(name)),
      subject: sanitize(String(subject)),
      body,
      template: template || undefined,
      audience: audience || { filter: 'all' },
      // The schema stores the send time under `scheduling.sendAt`; a top-level
      // `scheduledAt` was silently discarded by strict mode, so a campaign the admin
      // scheduled was created as an unscheduled draft. `scheduledAt` is still accepted
      // for API callers that send it.
      scheduling: scheduling || (scheduledAt ? { sendAt: scheduledAt } : undefined),
      createdBy: req.user.id
    });
    res.status(201).json(campaign);
  } catch (error) {
    logger.error('create campaign error:', error.message);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['name', 'subject', 'body', 'template', 'audience', 'scheduling', 'status', 'scheduledAt'];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        update[field] = ['name', 'subject'].includes(field) ? sanitize(String(req.body[field])) : req.body[field];
      }
    }
    if (update.scheduledAt !== undefined && update.scheduling === undefined) {
      // Dot-notation so a custom `scheduling.timezone` survives the update.
      // Skipped when `scheduling` itself was sent (explicit shape wins; avoids
      // conflicting update paths in the same write).
      update['scheduling.sendAt'] = update.scheduledAt;
      delete update.scheduledAt;
    } else {
      delete update.scheduledAt;
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

    // Queue the campaign for the emailCampaignSender job instead of sending the
    // whole audience inside this request. The old loop slept 100ms per recipient,
    // so a few thousand recipients blew past the upstream request timeout after
    // already having sent part of the list, and it skipped the job's batching,
    // progress persistence and high-bounce-rate pause entirely.
    campaign.status = 'sending';
    if (campaign.progress) campaign.progress.total = campaign.progress.total || 0;
    await campaign.save();

    res.json({ message: 'Campaign queued for sending', queued: true, campaignId: campaign._id });
  } catch (error) {
    logger.error('send campaign error:', error.message);
    res.status(500).json({ message: 'Failed to queue campaign' });
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
