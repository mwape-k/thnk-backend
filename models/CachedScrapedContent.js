const mongoose = require("mongoose");

const CachedScrapedContentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  searchData: mongoose.Schema.Types.Mixed, // Store the full deeperScrape response
  createdAt: { type: Date, default: Date.now, expires: 604800 }, // Auto-delete after 7 days
});

module.exports = mongoose.model(
  "CachedScrapedContent",
  CachedScrapedContentSchema
);
