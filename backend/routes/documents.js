const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

router.get('/:userId/:type', auth, async (req, res) => {
  try {
    const { userId, type } = req.params;

    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view this document' });
    }

    if (!['nid', 'license'].includes(type)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const user = await User.findById(userId).select(`${type}`);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const docUrl = user[type];
    if (!docUrl) return res.status(404).json({ message: 'Document not found' });

    res.json({ url: docUrl });
  } catch (error) {
    console.error('[Documents] proxy error:', error.message);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

module.exports = router;
