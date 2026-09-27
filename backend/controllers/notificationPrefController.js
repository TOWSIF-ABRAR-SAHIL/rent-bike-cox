const NotificationPreference = require('../models/NotificationPreference');
const logger = require('../utils/logger');
const { clientMessage } = require('../utils/httpError');

exports.getPreferences = async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user.id }).lean();
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user.id });
      await prefs.save();
      prefs = prefs.toObject();
    }
    res.json(prefs);
  } catch (err) {
    logger.error('getPreferences error', { userId: req.user.id, error: err.message });
    res.status(500).json({ message: 'Failed to load notification preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user.id });
    if (!prefs) {
      const { email, push, inApp } = req.body;
      prefs = new NotificationPreference({ user: req.user.id, email, push, inApp });
    } else {
      if (req.body.email) Object.assign(prefs.email, req.body.email);
      if (req.body.push) Object.assign(prefs.push, req.body.push);
      if (req.body.inApp) Object.assign(prefs.inApp, req.body.inApp);
    }
    await prefs.save();
    res.json(prefs);
  } catch (err) {
    logger.error('updatePreferences error', { userId: req.user.id, error: err.message });
    res.status(400).json({ message: clientMessage(err, 'Could not update notification preferences') });
  }
};

exports.shouldNotify = async (userId, type, channel) => {
  try {
    const prefs = await NotificationPreference.findOne({ user: userId }).lean();
    if (!prefs) return true;
    if (channel === 'email') return prefs.email?.[type] !== false;
    if (channel === 'push') return prefs.push?.[type] !== false;
    if (channel === 'inApp') return prefs.inApp?.[type] !== false;
    return true;
  } catch {
    return true;
  }
};
