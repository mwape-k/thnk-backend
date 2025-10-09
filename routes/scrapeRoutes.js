const express = require("express");
const { scrapeAndSave } = require("../controllers/scrapeController");
const router = express.Router();

router.post('/scrape', scrapeAndSave);

module.exports = router;
