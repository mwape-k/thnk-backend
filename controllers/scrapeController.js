const ScrapedContent = require("../models/ScrapedContent");
const { scrapeWebsite, deeperScrapeWebsite } = require("../services/scrapper");
const SearchHistory = require("../models/SearchHistory");

exports.scrapeAndSave = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // Scrape and AI-enhance content (summary, tags, sentiment, neutrality)
    const result = await scrapeWebsite(url);
    if (!result) return res.status(500).json({ error: "Scraping failed" });

    // Save scraped and AI enriched content
    const content = new ScrapedContent(result);
    await content.save();

    // Use authenticated user's ID or fallback
    const userId = req.user?.uid || "testUser123";

    // Record search history linked to the content and user
    await SearchHistory.create({
      userId,
      query: url,
      results: [content._id], // MongoDB ObjectId referencing scraped content
      timestamp: new Date(),
    });

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
    // Perform deeper scraping
    const result = await deeperScrapeWebsite(url);
    if (!result)
      return res
        .status(404)
        .json({
          error:
            "Unable to scrape the provided URL. The site may be blocking requests or the URL may be invalid.",
        });

    res.json(result);
  } catch (error) {
    console.error("deeperScrape error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
