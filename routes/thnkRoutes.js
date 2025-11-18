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
 *     summary: Generate enhanced analysis with validated sources and bias insights
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Prompt to generate deep dive analysis
 *     responses:
 *       200:
 *         description: Enhanced analysis with validated sources and bias insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                 neutralityScore:
 *                   type: number
 *                   format: float
 *                 persuasionScore:
 *                   type: number
 *                   format: float
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       title:
 *                         type: string
 *                       text:
 *                         type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       neutralityScore:
 *                         type: number
 *                       sentimentScore:
 *                         type: number
 *                       credibilityScore:
 *                         type: number
 *                       verified:
 *                         type: boolean
 *                 biasAnalysis:
 *                   type: object
 *                 researchQuality:
 *                   type: object
 *                 sourceMetrics:
 *                   type: object
 *       400:
 *         description: Bad request, prompt missing
 *
 * /prompt:
 *   post:
 *     summary: Process prompt with enhanced source validation and bias analysis
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: User prompt to generate response & validated sources
 *     responses:
 *       200:
 *         description: Enhanced response with validated sources and bias analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                 neutralityScore:
 *                   type: number
 *                   format: float
 *                 persuasionScore:
 *                   type: number
 *                   format: float
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       title:
 *                         type: string
 *                       text:
 *                         type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       neutralityScore:
 *                         type: number
 *                       sentimentScore:
 *                         type: number
 *                       credibilityScore:
 *                         type: number
 *                       domain:
 *                         type: string
 *                       sourceType:
 *                         type: string
 *                       verified:
 *                         type: boolean
 *                       predefined:
 *                         type: boolean
 *                 biasAnalysis:
 *                   type: object
 *                 researchQuality:
 *                   type: object
 *                 sourceMetrics:
 *                   type: object
 *                 quickAssessment:
 *                   type: object
 *                 sourcesValidated:
 *                   type: boolean
 *       400:
 *         description: Prompt missing or invalid
 *
 * /query:
 *   post:
 *     summary: Process a user input query using AI with source validation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The user query to process with AI and source validation
 *     responses:
 *       200:
 *         description: AI processed response with source validation
 *       400:
 *         description: Prompt missing or invalid
 */

// Only register routes for functions that actually exist in the controller
router.post("/analyze-sentiment", thnkController.analyzeSentiment);
router.post("/generate-tags", thnkController.generateTags);
router.post("/generate-summary", thnkController.generateSummary);
router.post("/deep-dive", thnkController.deepDive);
router.post("/query", thnkController.queryHandle);
router.post("/prompt", rateLimiter, thnkController.processUserPrompt);

module.exports = router;
