const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const PushService = require('../services/PushService');

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }
    await PushService.subscribe(req.user.id, subscription, req.headers['user-agent']);
    res.json({ message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to subscribe' });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }
    await PushService.unsubscribe(endpoint);
    res.json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
});

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: PushService.getPublicKey() });
});

module.exports = router;
