const ScrapedContent = require("../models/ScrapedContent");
const { scrapeWebsite, deeperScrapeWebsite } = require("../services/scrapper");
const {
  getEnhancedSmartResponseWithSources,
} = require("../services/aiServices");
const { saveSearchHistory } = require("../services/userHistory");
const SearchHistory = require("../models/SearchHistory");

exports.scrapeAndSave = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // STEP 1: Scrape website content
    const result = await scrapeWebsite(url);
    if (!result) return res.status(500).json({ error: "Scraping failed" });

    // STEP 2: Save scraped content to database
    const content = new ScrapedContent(result);
    await content.save();

    // STEP 3: Save to search history
    const userId = req.user?.uid || "testUser123";
    await saveSearchHistory(userId, url, [content._id]);

    res.json(content);
  } catch (error) {
    console.error("scrapeAndSave error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deeperScrape = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // STEP 1: Perform deeper scraping with enhanced AI analysis
    // Now we need to pass the AI analysis function as a parameter
    const result = await deeperScrapeWebsite(
      url,
      getEnhancedSmartResponseWithSources
    );

    if (!result) {
      return res.status(404).json({
        error:
          "Unable to scrape the provided URL. The site may be blocking requests or the URL may be invalid.",
      });
    }

    // STEP 2: Save to search history
    const userId = req.user?.uid || "testUser123";
    await saveSearchHistory(userId, url, result);

    res.json(result);
  } catch (error) {
    console.error("deeperScrape error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
