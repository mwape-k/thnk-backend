// services/scrapper.js
const axios = require("axios");
const cheerio = require("cheerio");
const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
  getEnhancedSmartResponseWithSources,
} = require("./aiServices");

const scrapeWebsite = async (url) => {
  try {
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
    const $ = cheerio.load(data);

    const title = $("title").text();

    // Extract paragraphs and join as main text content
    const paragraphs = $("p")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 50) // Filter out very short paragraphs
      .join("\n\n");

    // Use paragraphs as main body text
    const bodyText = paragraphs.trim();

    if (!bodyText || bodyText.length < 100) {
      console.warn("Insufficient text content found for:", url);
      return null;
    }

    // Limit text length to avoid token limits
    const limitedBodyText = bodyText.substring(0, 8000);

    const tags = await getTagsFromAI(limitedBodyText);
    console.log("Tags from AI:", tags);

    const sentimentResult = await getNeutralityAndSentiment(limitedBodyText);
    console.log("Sentiment from AI:", sentimentResult);

    const { neutralityScore, sentimentScore } = sentimentResult;

    // AI generated outline/insight
    const aiOutline = await getDeepDiveSummaries(limitedBodyText);

    const textSummary = await getGenSummary(limitedBodyText);
    console.log("Summary from AI:", textSummary);

    return {
      url,
      title,
      text: textSummary,
      tags: tags,
      neutralityScore: neutralityScore,
      sentimentScore: sentimentScore,
      aiOutline,
    };
  } catch (error) {
    if (error.response?.status === 403 && retries > 0) {
      console.log(`Retrying ${url} due to 403... (${retries} retries left)`);
      // Wait a bit before retrying
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
