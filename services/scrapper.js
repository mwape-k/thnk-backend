// services/scrapper.js
const axios = require("axios");
const cheerio = require("cheerio");

// REMOVED the circular import - deeperScrapeWebsite will need to be refactored
// const { getEnhancedSmartResponseWithSources } = require("./aiServices");

// creating a robust URL validation function that checks if a URL exists before scraping
// This helps prevent wasting time on invalid or inaccessible URLs
const validateUrl = async (url, timeout = 8000) => {
  try {
    const response = await axios.head(url, {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      validateStatus: function (status) {
        return status < 500; // accept any status code less than 500 as potentially valid
      },
    });

    return {
      exists: response.status < 400, // consider 400+ status codes as failures
      status: response.status,
      contentType: response.headers["content-type"],
      url: url, //include the URL for better logging
    };
  } catch (error) {
    console.warn(`URL validation failed for ${url}:`, error.message);
    return {
      exists: false,
      error: error.message,
      url: url,
    };
  }
};

// updating the main scraping function to be more robust with better error handling
// This includes URL validation, retry logic, and content filtering
const scrapeWebsite = async (url, retries = 2) => {
  try {
    // First, validate the URL exists before attempting full scraping
    // This saves time and resources on invalid URLs
    const validation = await validateUrl(url);
    if (!validation.exists) {
      console.warn(
        `URL validation failed: ${url} - Status: ${
          validation.status || "Connection failed"
        }`
      );
      return null;
    }

    // If validation passes, proceed with the full scraping
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
    });

    // load the HTML content into Cheerio for parsing
    const $ = cheerio.load(data);

    // extract the page title for metadata
    const title =
      $("title").text() ||
      $("meta[property='og:title']").attr("content") ||
      "No title found";

    // extract paragraphs and filter out very short ones to get meaningful content
    // This helps avoid navigation text, ads, and other non-content elements
    const paragraphs = $("p")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 50) // filter out very short paragraphs that are likely not main content
      .join("\n\n");

    // use the filtered paragraphs as the main body text
    const bodyText = paragraphs.trim();

    // check if there's sufficient content to proceed
    if (!bodyText || bodyText.length < 100) {
      console.warn("Insufficient text content found for:", url);
      return null;
    }

    // limit text length to avoid token limits in AI processing
    const limitedBodyText = bodyText.substring(0, 8000);

    // removing the direct AI service calls that were causing circular dependencies
    // Instead -> return the raw scraped data and let the caller handle AI processing
    return {
      url,
      title,
      text: limitedBodyText, // return the raw text instead of AI-processed summary
      rawContent: bodyText, // include both limited and full content for flexibility
      contentLength: bodyText.length,
      scrapedAt: new Date().toISOString(),
      // Note: AI processing like tags, sentiment, and summaries should be handled by the caller
      // This prevents circular dependencies between scrapper and aiServices
    };
  } catch (error) {
    // handle 403 errors with retry logic since they're often temporary
    if (error.response?.status === 403 && retries > 0) {
      console.log(`Retrying ${url} due to 403... (${retries} retries left)`);
      // wait a bit before retrying to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return scrapeWebsite(url, retries - 1);
    }

    // handle other types of errors with appropriate logging
    if (error.code === "ECONNABORTED") {
      console.error(`Scraping timeout for ${url}:`, error.message);
    } else if (error.response) {
      console.error(
        `Scraping failed for ${url} with status ${error.response.status}:`,
        error.message
      );
    } else {
      console.error("Scraping failed for", url, ":", error.message);
    }

    return null;
  }
};

// creating a simpler version for quick validation scraping
// This is useful when only needing to verify a URL exists and get basic info
const quickScrapeForValidation = async (url) => {
  try {
    const { data } = await axios.get(url, {
      timeout: 5000, // Shorter timeout for validation
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(data);
    const title = $("title").text() || "No title found";

    return {
      title: title,
      exists: true,
      url: url,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
      url: url,
    };
  }
};

// UPDATED: deeperScrapeWebsite without circular dependency
// This function now requires the AI service to be passed in or called separately
const deeperScrapeWebsite = async (url, aiAnalysisFunction = null) => {
  try {
    // First, extract and summarize the main article using our basic scraper
    const mainResult = await scrapeWebsite(url);

    // check if the initial scraping was successful
    if (!mainResult) {
      console.error("Initial scraping failed, cannot perform deeper analysis");
      return null;
    }

    // If no AI function provided, return basic scraped data
    if (!aiAnalysisFunction) {
      console.warn(
        "No AI analysis function provided, returning basic scraped data"
      );
      return {
        main: mainResult,
        aiSummary: "AI analysis not available",
        neutralityScore: 0.5,
        persuasionScore: 0.5,
        relatedSources: [],
        analyzedAt: new Date().toISOString(),
      };
    }

    // use the provided AI service to get related sources and deeper analysis
    const relatedResult = await aiAnalysisFunction(mainResult.text);

    // return a comprehensive result combining raw scraping and AI analysis
    return {
      main: {
        url: mainResult.url,
        title: mainResult.title,
        text: mainResult.text,
        contentLength: mainResult.contentLength,
        scrapedAt: mainResult.scrapedAt,
      },
      aiSummary: relatedResult?.summary || "No summary available",
      neutralityScore: relatedResult?.neutralityScore || 0.5,
      persuasionScore: relatedResult?.persuasionScore || 0.5,
      relatedSources: relatedResult?.sources || [], // Array of related sources with analysis
      biasAnalysis: relatedResult?.biasAnalysis || null,
      researchQuality: relatedResult?.researchQuality || null,
      sourceMetrics: relatedResult?.sourceMetrics || null,
      // include metadata about when the analysis was performed
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Deeper scraping failed:", error.message);
    return null;
  }
};

// adding a new function for batch URL validation
// This is useful when only needing to check multiple URLs efficiently
const validateMultipleUrls = async (urls, concurrency = 3) => {
  try {
    console.log(
      `Validating ${urls.length} URLs with concurrency ${concurrency}`
    );

    const results = [];

    // process URLs in batches to avoid overwhelming the system
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map((url) => quickScrapeForValidation(url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // add a small delay between batches to be respectful to servers
      if (i + concurrency < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  } catch (error) {
    console.error("Batch URL validation failed:", error.message);
    return urls.map((url) => ({
      url,
      exists: false,
      error: "Batch validation failed",
    }));
  }
};

// Export all the functions that might be useful to other parts of the application
module.exports = {
  scrapeWebsite,
  deeperScrapeWebsite, // Now accepts an optional AI analysis function
  validateUrl,
  quickScrapeForValidation,
  validateMultipleUrls,
};
