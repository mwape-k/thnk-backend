const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema({
 userId: { type: String, required: true },
  query: String,
  timestamp: { type: Date, default: Date.now },
  results: [String] // Array of result IDs or summaries
});

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);