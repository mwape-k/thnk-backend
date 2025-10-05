const express = require('express');
const router = express.Router();
const { scrapeAndSave } = require('../controllers/scrapeController'); 

router.post('/scrape', scrapeAndSave); 

module.exports = router; 