const { body, param, validationResult } = require('express-validator');

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

const createZoneRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Zone name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be valid hex'),
  body('bounds.north').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid north bound'),
  body('bounds.south').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid south bound'),
  body('bounds.east').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid east bound'),
  body('bounds.west').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid west bound'),
  handleValidation,
];

const updateZoneRules = [
  param('id').isMongoId().withMessage('Valid zone ID required'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Zone name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be valid hex'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  handleValidation,
];

module.exports = { createZoneRules, updateZoneRules };
