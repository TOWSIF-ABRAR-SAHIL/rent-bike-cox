const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getPublicPolicies, getAllPolicies, createPolicy, updatePolicy, deletePolicy } = require('../controllers/policyController');

router.get('/', getPublicPolicies);
router.get('/admin', auth, authorize('Admin'), getAllPolicies);
router.post('/', auth, authorize('Admin'), createPolicy);
router.put('/:id', auth, authorize('Admin'), updatePolicy);
router.delete('/:id', auth, authorize('Admin'), deletePolicy);

module.exports = router;
