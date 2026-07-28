const EmailCampaign = require('../models/EmailCampaign');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { renderTemplate } = require('../utils/templateRenderer');
const logger = require('../utils/logger');

let isRunning = false;
let intervalId = null;

async function processCampaign(campaign) {
  const filter = {};
  switch (campaign.audience.filter) {
    case 'users':
      filter.role = 'User';
      break;
    case 'renters':
      filter.role = 'Renter';
      break;
    case 'admins':
      filter.role = 'Admin';
      break;
    case 'custom':
      if (campaign.audience.customUserIds?.length) {
        filter._id = { $in: campaign.audience.customUserIds };
      }
      break;
    case 'all':
    default:
      break;
  }

  const total = await User.countDocuments(filter);
  const batchSize = campaign.batchSize || 50;
  const batchDelay = campaign.batchDelay || 5000;
  const skip = campaign.progress?.sent || 0;

  await EmailCampaign.findByIdAndUpdate(campaign._id, {
    'progress.total': total,
    status: 'sending'
  });

  let sent = skip;
  let failed = campaign.progress?.failed || 0;
  let bounced = campaign.progress?.bounced || 0;

  while (sent < total) {
    const users = await User.find(filter).skip(sent).limit(batchSize).lean();
    if (users.length === 0) break;

    for (const user of users) {
      try {
        const variables = {
          userName: user.name || user.email,
          userEmail: user.email,
          campaignBody: campaign.body,
          campaignSubject: campaign.subject
        };

        let body = campaign.body;
        let subject = campaign.subject;
        if (campaign.template) {
          const Template = require('../models/NotificationTemplate');
          const tpl = await Template.findById(campaign.template).lean();
          if (tpl?.channels?.email) {
            body = renderTemplate(tpl.channels.email.body || campaign.body, variables);
            subject = renderTemplate(tpl.channels.email.subject || campaign.subject, variables);
          }
        } else {
          body = renderTemplate(body, variables);
          subject = renderTemplate(subject, variables);
        }

        await emailService.sendEmail({
          to: user.email,
          subject,
          html: body
        });
        sent++;
      } catch (err) {
        failed++;
        if (err.message && (err.message.includes('bounce') || err.message.includes('reject'))) {
          bounced++;
        }
        logger.error('Campaign send error', { userId: user._id, error: err.message });
      }
    }

    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    if (bounceRate > 10) {
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        status: 'paused',
        'progress.sent': sent,
        'progress.failed': failed,
        'progress.bounced': bounced
      });
      logger.warn('Campaign paused due to high bounce rate', { campaignId: campaign._id, bounceRate });
      return;
    }

    await EmailCampaign.findByIdAndUpdate(campaign._id, {
      'progress.sent': sent,
      'progress.failed': failed,
      'progress.bounced': bounced
    });

    if (sent < total) {
      await new Promise(r => setTimeout(r, batchDelay));
    }
  }

  await EmailCampaign.findByIdAndUpdate(campaign._id, {
    status: 'sent',
    sentAt: new Date(),
    completedAt: new Date(),
    sentCount: sent,
    failedCount: failed,
    'progress.sent': sent,
    'progress.failed': failed,
    'progress.bounced': bounced
  });

  logger.info('Campaign completed', { campaignId: campaign._id, sent, failed });
}

async function processPendingCampaigns() {
  if (isRunning) return;
  isRunning = true;

  try {
    const campaigns = await EmailCampaign.find({
      status: { $in: ['draft', 'scheduled', 'sending', 'paused'] },
      ...(process.env.DISABLE_JOBS === 'true' ? { _id: null } : {})
    }).sort({ createdAt: 1 }).limit(5);

    for (const campaign of campaigns) {
      if (campaign.status === 'draft') continue;
      if (campaign.status === 'scheduled' && campaign.scheduling?.sendAt) {
        if (new Date() < new Date(campaign.scheduling.sendAt)) continue;
        await EmailCampaign.findByIdAndUpdate(campaign._id, { status: 'sending' });
      }
      await processCampaign(campaign);
    }
  } catch (error) {
    logger.error('Campaign sender error', { error: error.message });
  } finally {
    isRunning = false;
  }
}

function startEmailCampaignSender() {
  if (process.env.DISABLE_JOBS === 'true') {
    logger.info('Email campaign sender disabled (DISABLE_JOBS=true)');
    return;
  }
  logger.info('Email campaign sender started');
  processPendingCampaigns();
  intervalId = setInterval(processPendingCampaigns, 60 * 1000);
}

function stopEmailCampaignSender() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { startEmailCampaignSender, stopEmailCampaignSender };
