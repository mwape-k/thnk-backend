// services/scrapper.js
const axios = require("axios");
const cheerio = require("cheerio");
const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
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

    const textSummary = await getGenSummary(bodyText);
    console.log("Summary from AI:", textSummary);

    return {
      url,
      title,
      text: textSummary,
      tags: tags,
      neutralityScore: neutralityScore,
      sentimentScore: sentimentScore,
    };
  } catch (error) {
    console.error("Scraping failed:", error.message);
    return null;
  }
};

module.exports = scrapeWebsite;
