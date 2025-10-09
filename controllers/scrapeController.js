const ScrapedContent = require("../models/ScrapedContent");
const scrapeWebsite = require("../services/scrapper");
const SearchHistory = require("../models/SearchHistory");

exports.scrapeAndSave = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  // Authenticate user assumed by middleware; req.user.uid available
  const result = await scrapeWebsite(url);
  if (!result) return res.status(500).json({ error: "Scraping failed" });

  // Save scraped content
  const content = new ScrapedContent(result);
  await content.save();

  // Record search history
  await SearchHistory.create({
    userId: req.user.uid, // From Firebase auth middleware
    query: url,
    results: [content._id],  // Storing reference to scraped content (MongoDB ObjectId)
    timestamp: new Date()
  });

  res.json(content);
};


//works exactly like .NET controllers

//TODO: add error handeling and validation
//TODO: add logging
//TODO: tests
