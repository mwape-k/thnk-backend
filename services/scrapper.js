// services/scrapper.js
const axios = require("axios");
const cheerio = require("cheerio");
const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getSmartResponseWithSources,
  getEnhancedSmartResponseWithSources,
} = require("./aiServices");

// Add this function to scrapper.js
const validateUrl = async (url, timeout = 8000) => {
  try {
    const response = await axios.head(url, {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      },
    });

    return {
      exists: response.status < 400,
      status: response.status,
      contentType: response.headers["content-type"],
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
};

// Update scrapeWebsite to be more robust
const scrapeWebsite = async (url, retries = 2) => {
  try {
    // First, validate the URL exists
    const validation = await validateUrl(url);
    if (!validation.exists) {
      console.warn(
        `URL validation failed: ${url} - Status: ${validation.status}`
      );
      return null;
    }

    // Then proceed with scraping
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    // ... rest of your existing scrapeWebsite code
    const $ = cheerio.load(data);
    // ... existing processing logic
  } catch (error) {
    if (error.response?.status === 403 && retries > 0) {
      console.log(`Retrying ${url} due to 403... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return scrapeWebsite(url, retries - 1);
    }
    console.error("Scraping failed for", url, ":", error.message);
    return null;
  }
};

const deeperScrapeWebsite = async (url) => {
  try {
    // Extract and summarize main article
    const mainResult = await scrapeWebsite(url);

    // Check if scraping was successful
    if (!mainResult) {
      console.error("Initial scraping failed, cannot perform deeper analysis");
      return null;
    }

    // Using Gemini to get related sources, summaries, and all metadata
    const relatedResult = await getEnhancedSmartResponseWithSources(
      mainResult.text
    );

    return {
      main: mainResult,
      aiSummary: relatedResult.summary,
      neutralityScore: relatedResult.neutralityScore,
      persuasionScore: relatedResult.persuasionScore,
      relatedSources: relatedResult.sources, // Array of up to 6, each with url, title, summary, tags, scores
    };
  } catch (error) {
    console.error("Deeper scraping failed:", error.message);
    return null;
  }
};

module.exports = { scrapeWebsite, deeperScrapeWebsite };
