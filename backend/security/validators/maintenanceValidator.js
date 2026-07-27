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

const createMaintenanceRules = [
  body('bikeId').isMongoId().withMessage('Valid bike ID required'),
  body('type').isIn(['service', 'repair', 'inspection', 'oil_change', 'tire_replacement', 'brake_service', 'battery', 'other']).withMessage('Valid maintenance type required'),
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
  body('mileage').optional().isInt({ min: 0 }).withMessage('Mileage must be non-negative'),
  body('performedAt').optional().isISO8601().withMessage('Valid date required'),
  body('nextServiceDue').optional().isISO8601().withMessage('Valid next service date required'),
  body('nextServiceMileage').optional().isInt({ min: 0 }).withMessage('Next service mileage must be non-negative'),
  body('status').optional().isIn(['completed', 'in_progress', 'scheduled', 'cancelled']).withMessage('Valid status required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 characters'),
  handleValidation,
];

const updateMaintenanceRules = [
  param('id').isMongoId().withMessage('Valid maintenance log ID required'),
  body('type').optional().isIn(['service', 'repair', 'inspection', 'oil_change', 'tire_replacement', 'brake_service', 'battery', 'other']).withMessage('Valid maintenance type required'),
  body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
  body('mileage').optional().isInt({ min: 0 }).withMessage('Mileage must be non-negative'),
  body('nextServiceDue').optional().isISO8601().withMessage('Valid next service date required'),
  body('nextServiceMileage').optional().isInt({ min: 0 }).withMessage('Next service mileage must be non-negative'),
  body('status').optional().isIn(['completed', 'in_progress', 'scheduled', 'cancelled']).withMessage('Valid status required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 characters'),
  handleValidation,
];

const maintenanceBikeParamRules = [
  param('bikeId').isMongoId().withMessage('Valid bike ID required'),
  handleValidation,
];

module.exports = {
  createMaintenanceRules,
  updateMaintenanceRules,
  maintenanceBikeParamRules,
};
