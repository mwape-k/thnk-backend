const {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getEnhancedSmartResponseWithSources,
} = require("../services/aiServices");

const { scrapeWebsite } = require("../services/scrapper");
const { saveSearchHistory } = require("../services/userHistory");

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

// For prompt questions with enhanced source validation
exports.deepDive = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  try {
    const result = await getEnhancedSmartResponseWithSources(prompt);
    res.json(result);
  } catch (error) {
    console.error("Deep dive failed:", error.message);
    res.status(500).json({ error: "Deep dive generation failed" });
  }
};

// Basic query handler
exports.queryHandle = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // STEP 1: Get summary
    const summary = await getGenSummary(prompt);

    // STEP 2: Get tags
    const tags = await getTagsFromAI(summary);

    // STEP 3: Get neutrality/sentiment scores
    const { neutralityScore, sentimentScore } = await getNeutralityAndSentiment(
      summary
    );

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

// URL scraping endpoint
exports.scrapeUrl = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  try {
    const result = await scrapeWebsite(url);
    if (!result) {
      return res
        .status(404)
        .json({ error: "URL scraping failed or no content found" });
    }
    res.json(result);
  } catch (error) {
    console.error("URL scraping error:", error.message);
    res.status(500).json({ error: "URL scraping failed" });
  }
};

// Main controller for prompt handling with enhanced source validation
exports.processUserPrompt = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // STEP 1: Get enhanced response with validated sources
    const enhancedResponse = await getEnhancedSmartResponseWithSources(prompt);
    if (!enhancedResponse) {
      return res.status(500).json({ error: "Failed to get AI response" });
    }

    // STEP 2: Process sources for response
    const processedSources = enhancedResponse.sources.map((source) => ({
      url: source.url,
      title: source.title,
      text: source.text,
      tags: source.tags,
      neutralityScore: source.neutralityScore,
      sentimentScore: source.sentimentScore,
      credibilityScore: source.credibilityScore,
      domain: source.domain,
      sourceType: source.sourceType,
      verified: source.verified,
      predefined: source.predefined,
      aiGenerated: false,
    }));

    // STEP 3: Create response data
    const responseData = {
      // Core response
      summary: enhancedResponse.summary,
      neutralityScore: enhancedResponse.neutralityScore,
      persuasionScore: enhancedResponse.persuasionScore,
      sources: processedSources,

      // Enhanced educational content
      biasAnalysis: enhancedResponse.biasAnalysis,
      sourceMetrics: enhancedResponse.sourceMetrics,
      researchQuality: enhancedResponse.researchQuality,
      quickAssessment: enhancedResponse.quickAssessment,
      sourcesValidated: enhancedResponse.sourcesValidated,
    };

    // STEP 4: Save to search history
    const userId = req.user?.uid || "testUser123";
    await saveSearchHistory(userId, prompt, responseData);

    // STEP 5: Send response
    res.json(responseData);
  } catch (error) {
    console.error("Error in processUserPrompt:", error);
    res.status(500).json({ error: "Failed to process user prompt" });
  }
};
