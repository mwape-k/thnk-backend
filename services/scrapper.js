// services/scrapper.js
const axios = require("axios");
const cheerio = require("cheerio");
const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
} = require("./aiServices");

const scrapeWebsite = async (url) => {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("title").text();

    // Extract paragraphs and join as main text content
    const paragraphs = $("p")
      .map((i, el) => $(el).text())
      .get()
      .join("\n\n");

    // Use paragraphs as main body text
    const bodyText = paragraphs.trim();

    if (!bodyText) {
      console.warn("No paragraph text found, extraction may be poor");
    }

    const tags = await getTagsFromAI(bodyText);
    console.log("Tags from AI:", tags);

    const sentimentResult = await getNeutralityAndSentiment(bodyText);
    console.log("Sentiment from AI:", sentimentResult);

    const { neutralityScore, sentimentScore } = sentimentResult;

    // AI generated outline/insight, for richer result
    const aiOutline = await getDeepDiveSummaries(bodyText); // or another function if you prefer

    const textSummary = await getGenSummary(bodyText);
    console.log("Summary from AI:", textSummary);

    //refactor this to also give a smart AI generated outline/insight on the article for better user understanding

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
    console.error("Scraping failed:", error.message);
    return null;
  }
};
const deeperScrapeWebsite = async (url) => {
  try {
    // Extract and summarize main article
    const mainResult = await scrapeWebsite(url);

    // Using Gemini to get related sources, summaries, and all metadata
    const relatedResult = await getSmartResponseWithSources(mainResult.text);

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
