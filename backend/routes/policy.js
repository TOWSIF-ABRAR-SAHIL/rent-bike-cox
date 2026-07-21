const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { getPublicPolicies, getAllPolicies, createPolicy, updatePolicy, deletePolicy } = require('../controllers/policyController');

router.get('/', getPublicPolicies);
router.get('/admin', auth, getAllPolicies);
router.post('/', auth, createPolicy);
router.put('/:id', auth, validateObjectId(), updatePolicy);
router.delete('/:id', auth, validateObjectId(), deletePolicy);

module.exports = router;
