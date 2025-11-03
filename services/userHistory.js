const SearchHistory = require("../models/SearchHistory");
const ScrapedContent = require("../models/CachedScrapedContent");

exports.saveSearchHistory = async (userId, query, deeperScrapeResult) => {
  try {
    // Extract summary data for quick history display
    const resultSummary = {
      summary: deeperScrapeResult.summary,
      neutralityScore: deeperScrapeResult.neutralityScore,
      persuasionScore: deeperScrapeResult.persuasionScore,
      sourcesCount: deeperScrapeResult.sources?.length || 0,
      mainUrl: query, // The original URL searched
    };

    // Optionally store full result for later retrieval
    let fullResultId = null;
    if (deeperScrapeResult) {
      const fullContent = new ScrapedContent({
        url: query,
        searchData: deeperScrapeResult,
      });
      await fullContent.save();
      fullResultId = fullContent._id;
    }

    // Save to search history
    const searchHistory = new SearchHistory({
      userId,
      query,
      resultSummary,
      fullResultId,
      timestamp: new Date(),
    });

    await searchHistory.save();
    return searchHistory;
  } catch (error) {
    console.error("Error saving search history:", error);
    throw error;
  }
};

exports.getUserSearchHistory = async (userId, limit = 10) => {
  try {
    const history = await SearchHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    return history;
  } catch (error) {
    console.error("Error fetching user search history:", error);
    throw error;
  }
};

exports.getFullSearchResult = async (historyId, userId) => {
  try {
    const historyEntry = await SearchHistory.findOne({
      _id: historyId,
      userId: userId,
    }).populate("fullResultId");

    if (!historyEntry || !historyEntry.fullResultId) {
      return null;
    }

    return historyEntry.fullResultId.searchData;
  } catch (error) {
    console.error("Error fetching full search result:", error);
    throw error;
  }
};

exports.deleteSearchHistory = async (historyId, userId) => {
  try {
    const historyEntry = await SearchHistory.findOne({
      _id: historyId,
      userId: userId,
    });

    if (historyEntry && historyEntry.fullResultId) {
      await ScrapedContent.findByIdAndDelete(historyEntry.fullResultId);
    }

    const result = await SearchHistory.findOneAndDelete({
      _id: historyId,
      userId: userId,
    });
    return result;
  } catch (error) {
    console.error("Error deleting search history:", error);
    throw error;
  }
};

exports.deleteAllUserHistory = async (userId) => {
  try {
    // Find all user history entries to get fullResultIds
    const userHistory = await SearchHistory.find({ userId });
    const fullResultIds = userHistory
      .filter((entry) => entry.fullResultId)
      .map((entry) => entry.fullResultId);

    // Delete all full results
    if (fullResultIds.length > 0) {
      await ScrapedContent.deleteMany({ _id: { $in: fullResultIds } });
    }

    // Delete all history entries
    const result = await SearchHistory.deleteMany({ userId });
    return result;
  } catch (error) {
    console.error("Error deleting all user history:", error);
    throw error;
  }
};
