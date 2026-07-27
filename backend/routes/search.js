const express = require('express');
const router = express.Router();
const { advancedSearch, getSearchSuggestions } = require('../controllers/searchController');

router.get('/', advancedSearch);
router.get('/suggestions', getSearchSuggestions);

module.exports = router;
