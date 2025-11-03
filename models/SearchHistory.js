const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  query: String,
  timestamp: { type: Date, default: Date.now },
  resultSummary: {
    // Storing only essential data for history display
    summary: String,
    neutralityScore: Number,
    persuasionScore: Number,
    sourcesCount: Number,
    mainUrl: String,
  },
  fullResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CachedScrapedContent",
  }, // Reference to full results
});

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);
