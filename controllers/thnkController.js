const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
} = require("../services/aiServices");

const scrapeWebsite = require("../services/scrapper");
const ScrapedContent = require("../models/ScrapedContent");

// Handler for neutrality & sentiment analysis
exports.analyzeSentiment = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const result = await getNeutralityAndSentiment(text);
    res.json({ result });
  } catch (error) {
    console.error("Sentiment analysis failed:", error.message);
    res.status(500).json({ error: "Sentiment analysis error" });
  }
};

// Handler for tags generation
exports.generateTags = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const tags = await getTagsFromAI(text);
    res.json({ tags });
  } catch (error) {
    console.error("Tags generation failed:", error.message);
    res.status(500).json({ error: "Tags generation error" });
  }
};

// Handler for general summary
exports.generateSummary = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const summary = await getGenSummary(text);
    res.json({ summary });
  } catch (error) {
    console.error("Summary generation failed:", error.message);
    res.status(500).json({ error: "Summary generation error" });
  }
};

// For prompt questions
exports.deepDive = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  try {
    const summaries = await getDeepDiveSummaries(prompt);
    res.json({ summaries });
  } catch (error) {
    console.error("Deep dive failed:", error.message);
    res.status(500).json({ error: "Deep dive generation failed" });
  }
};

// For prompt questions
exports.queryHandle = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // Step 1: Get smart summary based on prompt
    const summary = await getGenSummary(prompt);

    // Step 2: Get tags for the summary or prompt
    const tags = await getTagsFromAI(summary);

    // Step 3: Get neutrality/sentiment scores
    const { neutralityScore, sentimentScore } = await getNeutralityAndSentiment(
      summary
    );

    // Optionally Step 4: Deep dive summaries if client requests later

    res.json({
      summary,
      tags,
      neutralityScore,
      sentimentScore,
    });
  } catch (error) {
    console.error("Query handle error:", error.message);
    res.status(500).json({ error: "Failed to process AI query" });
  }
};

exports.processUserPrompt = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // Step 1: Get full AI smart response with summary, scores, and source info
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) {
      return res.status(500).json({ error: "Failed to get AI response" });
    }

    console.log("AI Response:", aiResponse);
    const { summary, neutralityScore, persuasionScore, sources } = aiResponse;

    // Step 2: Scrape and enrich each source URL in parallel
    let enrichedSources = [];
    if (Array.isArray(sources)) {
      const scrapePromises = sources.map(async (source) => {
        console.log("Scraping source URL:", source.url);

        if (
          !source.url.startsWith("http://") &&
          !source.url.startsWith("https://")
        ) {
          console.warn("Invalid URL, skipping:", source.url);
          return null;
        }

        const scraped = await scrapeWebsite(source.url);
        if (!scraped) return null;

        // Combine scores from AI and scraped data (prefer AI scores)
        scraped.neutralityScore =
          source.neutralityScore ?? scraped.neutralityScore;
        scraped.sentimentScore =
          source.sentimentScore ?? scraped.sentimentScore;

        const savedContent = new ScrapedContent(scraped);
        await savedContent.save();

        return savedContent;
      });

      enrichedSources = (await Promise.all(scrapePromises)).filter(Boolean);
    }

    // Step 3: Return full smart response and enriched sources
    res.json({
      summary,
      neutralityScore,
      persuasionScore,
      sources: enrichedSources,
    });
  } catch (error) {
    console.error("Error in processUserPrompt:", error);
    res.status(500).json({ error: "Failed to process user prompt" });
  }
};
