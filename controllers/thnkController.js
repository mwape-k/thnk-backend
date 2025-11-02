const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
} = require("../services/aiServices");

const { scrapeWebsite, deeperScrapeWebsite } = require("../services/scrapper");
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
    // Step 1: Get full AI smart response
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) {
      return res.status(500).json({ error: "Failed to get AI response" });
    }

    const {
      summary,
      neutralityScore,
      persuasionScore,
      sources = [],
    } = aiResponse;

    // Step 2: Just use the AI-generated source data directly
    const processedSources = sources.map((source) => ({
      url: source.url,
      title: source.title,
      text: source.text,
      tags: source.tags,
      neutralityScore: source.neutralityScore,
      sentimentScore: source.sentimentScore,
      aiGenerated: true, // Flag to indicate this is AI-generated data
    }));

    // Step 3: Return response with AI-generated sources
    res.json({
      summary,
      neutralityScore,
      persuasionScore,
      sources: processedSources,
    });
  } catch (error) {
    console.error("Error in processUserPrompt:", error);
    res.status(500).json({ error: "Failed to process user prompt" });
  }
};
