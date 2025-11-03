const {
  getUserSearchHistory,
  deleteSearchHistory,
  deleteAllUserHistory,
  getFullSearchResult,
} = require("../services/userHistory");

// Get user's search history (lightweight summaries)
exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.user?.uid || "testUser123";
    const { limit } = req.query;

    const history = await getUserSearchHistory(userId, parseInt(limit) || 10);
    res.json(history);
  } catch (error) {
    console.error("getUserHistory error:", error);
    res.status(500).json({ error: "Failed to fetch search history" });
  }
};

// Get full search result for a specific history entry
exports.getFullSearchResult = async (req, res) => {
  try {
    const userId = req.user?.uid || "testUser123";
    const { historyId } = req.params;

    const fullResult = await getFullSearchResult(historyId, userId);

    if (!fullResult) {
      return res.status(404).json({
        error: "Full search result not found or access denied",
      });
    }

    res.json(fullResult);
  } catch (error) {
    console.error("getFullSearchResult error:", error);
    res.status(500).json({ error: "Failed to fetch full search result" });
  }
};

// Keep your existing delete functions
exports.deleteHistoryEntry = async (req, res) => {
  try {
    const userId = req.user?.uid || "testUser123";
    const { historyId } = req.params;

    const result = await deleteSearchHistory(historyId, userId);

    if (!result) {
      return res.status(404).json({
        error: "Search history entry not found or access denied",
      });
    }

    res.json({ message: "Search history entry deleted successfully" });
  } catch (error) {
    console.error("deleteHistoryEntry error:", error);
    res.status(500).json({ error: "Failed to delete search history entry" });
  }
};

exports.clearAllHistory = async (req, res) => {
  try {
    const userId = req.user?.uid || "testUser123";

    const result = await deleteAllUserHistory(userId);

    res.json({
      message: "All search history cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("clearAllHistory error:", error);
    res.status(500).json({ error: "Failed to clear search history" });
  }
};
