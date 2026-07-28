const express = require('express');
const router = express.Router();
const { getAllPublic, getByKey, getByPage } = require('../controllers/siteContentController');

router.get('/', getAllPublic);
router.get('/page/:pageName', getByPage);
router.get('/:key', getByKey);

module.exports = router;
