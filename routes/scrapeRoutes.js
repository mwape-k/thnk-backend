const express = require("express");
const router = express.Router();
//const authenticateToken = require('../middleware/authMiddleware');
const {
  scrapeAndSave,
  deeperScrape,
} = require("../controllers/scrapeController");
const { default: rateLimit } = require("express-rate-limit");

/**
 * @swagger
 * /scrape:
 *   post:
 *     summary: Scrape content from a given URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to scrape
 *     responses:
 *       200:
 *         description: Successful scrape
 *       400:
 *         description: Bad request, URL missing
 * /deeper-scrape:
 *   post:
 *     summary: Perform a deeper scrape of a given URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL for deeper scraping
 *     responses:
 *       200:
 *         description: Successful deeper scrape
 *       400:
 *         description: Bad request, URL missing
 */

router.post("/scrape", scrapeAndSave);
router.post("/deeper-scrape", deeperScrape);

module.exports = router;
