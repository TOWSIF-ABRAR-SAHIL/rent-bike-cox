const { body, param, query, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
  body('nid').trim().isLength({ min: 10, max: 17 }).withMessage('NID must be 10-17 characters'),
  body('license').trim().isLength({ min: 3, max: 30 }).withMessage('License must be 3-30 characters'),
  body('phoneNumber').trim().matches(/^01[3-9]\d{8}$/).withMessage('Valid BD phone number required'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address max 200 characters'),
  handleValidation,
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const createBookingRules = [
  body('bikeId').isMongoId().withMessage('Valid bike ID required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
  body('destination').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Destination 2-200 characters'),
  body('couponCode').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Coupon code 3-20 characters'),
  handleValidation,
];

const bookingIdRules = [
  param('id').isMongoId().withMessage('Valid booking ID required'),
  handleValidation,
];

const paymentInitRules = [
  body('bookingId').isMongoId().withMessage('Valid booking ID required'),
  handleValidation,
];

const createBikeRules = [
  body('model').trim().isLength({ min: 2, max: 100 }).withMessage('Model must be 2-100 characters'),
  body('brand').trim().isLength({ min: 2, max: 50 }).withMessage('Brand must be 2-50 characters'),
  body('category').isMongoId().withMessage('Valid category ID required'),
  body('pricePerHour').isFloat({ min: 100, max: 100000 }).withMessage('Price must be 100-100,000 TK/hour'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
  body('videoUrl').optional().trim().isLength({ max: 500 }).withMessage('Video URL max 500 characters'),
  handleValidation,
];

const createCouponRules = [
  body('code').trim().isLength({ min: 3, max: 20 }).matches(/^[A-Za-z0-9]+$/).withMessage('Coupon code must be alphanumeric, 3-20 chars'),
  body('discountPercent').isFloat({ min: 1, max: 100 }).withMessage('Discount must be 1-100%'),
  body('maxUses').optional().isInt({ min: 1 }).withMessage('Max uses must be positive'),
  body('expiresAt').optional().isISO8601().withMessage('Valid expiry date required'),
  handleValidation,
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  handleValidation,
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  createBookingRules,
  bookingIdRules,
  paymentInitRules,
  createBikeRules,
  createCouponRules,
  paginationRules,
};
