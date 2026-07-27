const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationController');
const { createReview, getBikeReviews, respondToReview, deleteReview } = require('../controllers/reviewController');

router.get('/notifications', auth, getNotifications);
router.get('/notifications/unread', auth, getUnreadCount);
router.put('/notifications/:id/read', auth, markAsRead);
router.put('/notifications/read-all', auth, markAllAsRead);

router.post('/reviews/:bikeId', auth, createReview);
router.get('/reviews/:bikeId', getBikeReviews);
router.put('/reviews/:id/respond', auth, authorize('Admin', 'Renter'), respondToReview);
router.delete('/reviews/:id', auth, deleteReview);

module.exports = router;
