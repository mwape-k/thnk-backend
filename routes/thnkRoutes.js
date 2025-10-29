const express = require("express");
const router = express.Router();
const thnkController = require("../controllers/thnkController");
const rateLimiter = require("../middleware/rateLimiter");
const apiKeyCheck = require("../middleware/apiKeyCheck");

/**
 * @swagger
 * /analyze-sentiment:
 *   post:
 *     summary: Analyze content neutrality and sentiment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *     responses:
 *       200:
 *         description: Analysis result with neutrality and sentiment scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 neutralityScore:
 *                   type: number
 *                   format: float
 *                 sentimentScore:
 *                   type: number
 *                   format: float
 *       400:
 *         description: Bad request, text missing
 *
 * /generate-tags:
 *   post:
 *     summary: Generate relevant tags for content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to generate tags for
 *     responses:
 *       200:
 *         description: Array of relevant tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Bad request, text missing
 *
 * /generate-summary:
 *   post:
 *     summary: Generate a brief summary of the content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to summarize
 *     responses:
 *       200:
 *         description: Summary of the content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *       400:
 *         description: Bad request, text missing
 *
 * /deep-dive:
 *   post:
 *     summary: Generate up to 6 detailed summaries with neutrality scores and sources
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Prompt to generate deep dive summaries
 *     responses:
 *       200:
 *         description: Array of deep dive summaries with neutrality and sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summaries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       summary:
 *                         type: string
 *                       neutralityScore:
 *                         type: number
 *                         format: float
 *                       sources:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Bad request, prompt missing
 * /prompt:
 *   post:
 *     summary: Process prompt, scrape sources and save enriched content
 *     security:
 *       - ApiKeyAuth: []  # if you define api key security scheme
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: User prompt to generate response & sources
 *     responses:
 *       200:
 *         description: Saved enriched sources
 *       400:
 *         description: Prompt missing or invalid
 * /query:
 *   post:
 *     summary: Process a user input query using AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The user query to process with AI
 *     responses:
 *       200:
 *         description: AI processed response
 *       400:
 *         description: Prompt missing or invalid
 */

// Example in your route file
router.post("/analyze-sentiment", thnkController.analyzeSentiment);
router.post("/generate-tags", thnkController.generateTags);
router.post("/generate-summary", thnkController.generateSummary);
router.post("/deep-dive", thnkController.deepDive);
router.post("/query", thnkController.queryHandle);
router.post("/prompt", rateLimiter, thnkController.processUserPrompt);

module.exports = router;
