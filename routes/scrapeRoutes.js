const express = require("express");
const router = express.Router();
//const authenticateToken = require('../middleware/authMiddleware');
const { scrapeAndSave } = require("../controllers/scrapeController");

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
 */

router.post('/scrape', scrapeAndSave);

module.exports = router;
