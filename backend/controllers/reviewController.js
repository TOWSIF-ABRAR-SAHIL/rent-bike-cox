const Review = require('../models/Review');
const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

exports.createReview = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { rating, title, comment, bookingId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Vehicle not found' });

    if (bookingId) {
      const booking = await Booking.findOne({
        _id: bookingId,
        user: req.user.id,
        bike: bikeId,
        status: 'Completed',
      }).lean();
      if (!booking) return res.status(400).json({ message: 'No completed booking found for this review' });
    }

    const existing = await Review.findOne({ bike: bikeId, user: req.user.id }).lean();
    if (existing) return res.status(400).json({ message: 'You have already reviewed this vehicle' });

    const review = await Review.create({
      bike: bikeId,
      user: req.user.id,
      booking: bookingId || undefined,
      rating,
      title,
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this vehicle' });
    }
    logger.error('createReview error', { message: error.message });
    res.status(500).json({ message: 'Failed to create review' });
  }
};

exports.getBikeReviews = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const sort = req.query.sort === 'oldest' ? 1 : -1;

    const total = await Review.countDocuments({ bike: bikeId });

    const reviews = await Review.find({ bike: bikeId })
      .populate('user', 'name')
      .populate('respondedBy', 'name')
      .sort({ createdAt: sort })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const stats = await Review.aggregate([
      { $match: { bike: mongoose.Types.ObjectId.isValid(bikeId) ? new mongoose.Types.ObjectId(bikeId) : bikeId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          total: { $sum: 1 },
          five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          four: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          two: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          one: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      reviews,
      stats: stats[0] || { avgRating: 0, total: 0, five: 0, four: 0, three: 0, two: 0, one: 0 },
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getBikeReviews error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

exports.getBulkReviewStats = async (req, res) => {
  try {
    const { bikeIds } = req.query;
    const ids = String(bikeIds || '').split(',').map(s => s.trim()).filter(Boolean);

    const result = {};
    if (ids.length > 0) {
      const agg = await Review.aggregate([
        { $match: { bike: { $in: ids } } },
        {
          $group: {
            _id: '$bike',
            avgRating: { $avg: '$rating' },
            total: { $sum: 1 },
            five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            four: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            two: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            one: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          },
        },
      ]);

      for (const row of agg) {
        result[row._id.toString()] = {
          avgRating: row.avgRating,
          total: row.total,
          five: row.five,
          four: row.four,
          three: row.three,
          two: row.two,
          one: row.one,
        };
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('getBulkReviewStats error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch review stats' });
  }
};

exports.respondToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ message: 'Response is required' });
    }

    const review = await Review.findById(id).populate('bike', 'renter');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (req.user.role !== 'Admin' && review.bike.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    review.response = response.trim();
    review.respondedBy = req.user.id;
    review.respondedAt = new Date();
    await review.save();

    res.json(review);
  } catch (error) {
    logger.error('respondToReview error', { message: error.message });
    res.status(500).json({ message: 'Failed to respond to review' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id).lean();
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (req.user.role !== 'Admin' && review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Review.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    logger.error('deleteReview error', { message: error.message });
    res.status(500).json({ message: 'Failed to delete review' });
  }
};
