const axios = require("axios");
const cheerio = require("cheerio");
const {
  getComprehensiveAnalysis,
  getSmartResponseWithSources,
} = require("./aiServices");

// Helper function to extract clean text
function extractCleanText($) {
  // Remove script, style, nav, header, footer elements
  $("script, style, nav, header, footer, .nav, .header, .footer").remove();

  // Get text from content-rich elements
  const selectors = [
    "article p",
    "main p",
    ".content p",
    ".article p",
    ".post p",
    "p",
  ];

  let bestText = "";

  // Try structured selectors first
  for (const selector of selectors) {
    const paragraphs = $(selector)
      .map((i, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 50); // Filter out short paragraphs

    if (paragraphs.length > 0) {
      const combined = paragraphs.join("\n\n");
      if (combined.length > bestText.length) {
        bestText = combined;
      }
    }
  }

  return bestText || $("body").text().trim();
}

const scrapeWebsite = async (url) => {
  try {
    console.time(`Scraping ${url}`);

    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)",
      },
    });
    const $ = cheerio.load(data);

    const title = $("title").text();
    const bodyText = extractCleanText($);

    if (!bodyText || bodyText.length < 100) {
      console.warn("Insufficient text content found for:", url);
      return null;
    }

    console.log(`Extracted ${bodyText.length} characters from ${url}`);

    // SINGLE AI CALL for all analysis
    console.time("AI Analysis");
    const analysis = await getComprehensiveAnalysis(bodyText);
    console.timeEnd("AI Analysis");

    return {
      url,
      title,
      text: analysis.summary,
      tags: analysis.tags,
      neutralityScore: analysis.neutralityScore,
      sentimentScore: analysis.sentimentScore,
      aiOutline: analysis.deepDiveSummaries,
      fullAnalysis: analysis, // Include full analysis if needed
    };
  } catch (error) {
    console.error("Scraping failed for", url, ":", error.message);
    return null;
  } finally {
    console.timeEnd(`Scraping ${url}`);
  }
};

const deeperScrapeWebsite = async (url) => {
  try {
    console.time(`Deep scraping ${url}`);

    // Get main content first
    const mainResult = await scrapeWebsite(url);
    if (!mainResult) return null;

    // Then get related sources in parallel (if needed)
    const [relatedResult] = await Promise.all([
      getSmartResponseWithSources(mainResult.text),
      // Add other parallel calls here if needed
    ]);

    return {
      main: mainResult,
      aiSummary: relatedResult?.summary || mainResult.text,
      neutralityScore:
        relatedResult?.neutralityScore || mainResult.neutralityScore,
      persuasionScore: relatedResult?.persuasionScore || 0.5,
      relatedSources: relatedResult?.sources || [],
    };
  } catch (error) {
    console.error("Deeper scraping failed:", error.message);
    return null;
  } finally {
    console.timeEnd(`Deep scraping ${url}`);
  }
};

module.exports = { scrapeWebsite, deeperScrapeWebsite };
