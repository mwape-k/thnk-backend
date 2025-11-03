const express = require("express");
const router = express.Router();
const {
  getUserHistory,
  deleteHistoryEntry,
  clearAllHistory,
  getFullSearchResult,
} = require("../controllers/historyController");

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchHistory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the search history entry
 *         userId:
 *           type: string
 *           description: ID of the user who performed the search
 *         query:
 *           type: string
 *           description: The search query or URL that was scraped
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the search was performed
 *         resultSummary:
 *           type: object
 *           properties:
 *             summary:
 *               type: string
 *               description: AI-generated summary of the search result
 *             neutralityScore:
 *               type: number
 *               description: Neutrality score from 0-1
 *             persuasionScore:
 *               type: number
 *               description: Persuasion score from 0-1
 *             sourcesCount:
 *               type: number
 *               description: Number of sources found
 *             mainUrl:
 *               type: string
 *               description: The original URL that was searched
 *         fullResultId:
 *           type: string
 *           description: Reference to full search result data
 *     FullSearchResult:
 *       type: object
 *       properties:
 *         summary:
 *           type: string
 *         neutralityScore:
 *           type: number
 *         persuasionScore:
 *           type: number
 *         sources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               neutralityScore:
 *                 type: number
 *               sentimentScore:
 *                 type: number
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         deletedCount:
 *           type: number
 *           description: Number of deleted items (for clear operations)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   parameters:
 *     userIdHeader:
 *       in: header
 *       name: Authorization
 *       required: true
 *       schema:
 *         type: string
 *       description: Bearer token for user authentication
 *     historyIdParam:
 *       in: path
 *       name: historyId
 *       required: true
 *       schema:
 *         type: string
 *       description: MongoDB ObjectId of the search history entry
 *     limitQuery:
 *       in: query
 *       name: limit
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Maximum number of history entries to return
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get user's search history
 *     description: Retrieve the authenticated user's search history with result summaries
 *     tags:
 *       - Search History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Successful retrieval of search history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SearchHistory'
 *       401:
 *         description: Unauthorized - User authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Clear all search history
 *     description: Delete all search history entries for the authenticated user
 *     tags:
 *       - Search History
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All search history cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   message: "All search history cleared successfully"
 *                   deletedCount: 5
 *       401:
 *         description: Unauthorized - User authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/history/{historyId}/full:
 *   get:
 *     summary: Get full search result for a history entry
 *     description: Retrieve the complete search result data for a specific history entry
 *     tags:
 *       - Search History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/historyIdParam'
 *     responses:
 *       200:
 *         description: Successful retrieval of full search result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FullSearchResult'
 *       404:
 *         description: Full search result not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   error: "Full search result not found or access denied"
 *       401:
 *         description: Unauthorized - User authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/history/{historyId}:
 *   delete:
 *     summary: Delete specific search history entry
 *     description: Delete a specific search history entry by its ID. Users can only delete their own history entries.
 *     tags:
 *       - Search History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/historyIdParam'
 *     responses:
 *       200:
 *         description: Search history entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   message: "Search history entry deleted successfully"
 *       404:
 *         description: Search history entry not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   error: "Search history entry not found or access denied"
 *       401:
 *         description: Unauthorized - User authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get("/", getUserHistory);
router.delete("/:historyId", deleteHistoryEntry);
router.get("/:historyId/full", getFullSearchResult);
router.delete("/", clearAllHistory);

module.exports = router;
