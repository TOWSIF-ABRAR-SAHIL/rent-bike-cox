const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const logger = require('../utils/logger');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

// Only configure web-push when real VAPID keys are provided. Calling
// setVapidDetails with placeholder/invalid keys makes web-push throw ("Vapid
// public key should be 65 bytes long") at import time, breaking CI and any
// environment that loads this module without the keys configured.
const pushConfigured = VAPID_PUBLIC_KEY.length > 0 && VAPID_PRIVATE_KEY.length > 0;

if (pushConfigured) {
  webpush.setVapidDetails(
    'mailto:support@rentbikecox.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

class PushService {
  async subscribe(userId, subscription, userAgent) {
    const { endpoint, keys } = subscription;
    const result = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: userId,
        endpoint,
        keys,
        userAgent,
        active: true,
      },
      { upsert: true, new: true, runValidators: true },
    );
    logger.info('Push subscription saved', { userId, endpoint: endpoint.substring(0, 50) });
    return result;
  }

  async unsubscribe(endpoint) {
    const result = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { active: false },
    );
    logger.info('Push subscription deactivated', { endpoint: endpoint.substring(0, 50) });
    return result;
  }

  async sendPushToUser(userId, { title, body, icon, url }) {
    if (!pushConfigured) return { sent: 0, failed: 0 };

    const subscriptions = await PushSubscription.find({ user: userId, active: true }).lean();
    let sent = 0;
    let failed = 0;

    const payload = JSON.stringify({ title, body, icon, url });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
        );
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
          logger.info('Removed expired push subscription', { endpoint: sub.endpoint.substring(0, 50) });
        } else {
          logger.warn('Push notification failed', { endpoint: sub.endpoint.substring(0, 50), error: err.message });
        }
      }
    }

    return { sent, failed };
  }

  async sendPushToAdmins({ title, body, icon, url }) {
    const admins = await User.find({ role: 'Admin' }).select('_id').lean();
    let totalSent = 0;
    let totalFailed = 0;

    for (const admin of admins) {
      const { sent, failed } = await this.sendPushToUser(admin._id, { title, body, icon, url });
      totalSent += sent;
      totalFailed += failed;
    }

    return { sent: totalSent, failed: totalFailed };
  }

  getPublicKey() {
    return VAPID_PUBLIC_KEY;
  }
}

module.exports = new PushService();
