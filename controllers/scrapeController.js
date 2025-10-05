const ScrapedContent = require('../models/ScrapedContent');
const scrapeWebsite = require('../services/scraper');

exports.scrapeAndSave = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL required" });
    }
    const result = await scrapeWebsite(url);
    if (!result) {
        return res.status(500).json({ error: "Scraping failed" });
    }
    const content = new ScrapedContent(result);
    await content.save();
    res.json(content);
};
//works exactly like .NET controllers 

//TODO: add error handeling and validation
//TODO: add logging 
//TODO: tests 