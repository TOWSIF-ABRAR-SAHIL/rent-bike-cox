const express = require('express');
const router = express.Router();
const { getAllPublic, getByKey } = require('../controllers/siteContentController');

router.get('/', getAllPublic);
router.get('/:key', getByKey);

module.exports = router;
