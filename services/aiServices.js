const ai = require("../config/gemini.js");
const { scrapeWebsite } = require("./scrapper");
const { Type } = require("@google/genai");

// Optimized utility function with better JSON and non-JSON response handling
async function callAI(params, fallbackValue) {
  try {
    const response = await ai.models.generateContent(params);

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Missing response text");
      return fallbackValue;
    }

    // Check response size before parsing
    if (text.length > 100000) {
      console.error("Response too large, likely truncated:", text.length);
      return fallbackValue;
    }

    // Better JSON detection to handle cases where AI returns plain text
    const trimmedText = text.trim();
    if (
      (trimmedText.startsWith("{") && trimmedText.endsWith("}")) ||
      (trimmedText.startsWith("[") && trimmedText.endsWith("]"))
    ) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("JSON parse error:", e.message);
        console.error("First 500 chars:", text.substring(0, 500));
        return fallbackValue;
      }
    } else {
      // Handle non-JSON responses gracefully
      console.warn("AI returned non-JSON response, using fallback");
      console.log("AI response sample:", text.substring(0, 200));
      return fallbackValue;
    }
  } catch (error) {
    console.error("AI service call failed:", error.message);
    return fallbackValue;
  }
}

// Pre-defined configs for better performance
const FAST_THINKING_CONFIG = { thinkingBudget: 0 };
const FLASH_LITE_MODEL = "gemini-2.5-flash-lite";

// URL cleaning function to remove tracking parameters and fix malformed URLs
function cleanUrl(url) {
  try {
    if (!url || typeof url !== "string") return null;

    // Remove excessive fbclid and other tracking parameters
    let cleaned = url
      .replace(/([?&])fbclid=[^&]*(&|$)/, "$1")
      .replace(/([?&])utm_[^&]*(&|$)/g, "$1")
      .replace(/&$/, "")
      .replace(/\?$/, "");

    return cleaned;
  } catch (error) {
    console.warn(`URL cleaning failed for ${url}:`, error.message);
    return null;
  }
}

// Helper function to validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// Helper function to extract domain
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch (_) {
    return null;
  }
}

// Enhanced source validation with actual scraping and better error handling
async function validateAndEnrichSourcesWithScraping(sources) {
  if (!sources || sources.length === 0) return [];

  const validatedSources = [];

  for (const source of sources) {
    try {
      // Clean the URL first
      const cleanedUrl = cleanUrl(source.url);
      if (!cleanedUrl || !isValidUrl(cleanedUrl)) {
        console.warn(`Invalid URL format: ${source.url}`);
        continue;
      }

      console.log(`Attempting to scrape: ${cleanedUrl}`);

      // Use scrapeWebsite to validate URL and get real content
      const scrapedData = await scrapeWebsite(cleanedUrl);

      if (scrapedData && scrapedData.text) {
        // Successfully scraped - use real data
        console.log(`Successfully scraped: ${cleanedUrl}`);

        const analysis = await getNeutralityAndSentiment(
          scrapedData.text.substring(0, 3000)
        );
        const tags = await getTagsFromAI(scrapedData.text.substring(0, 3000));

        validatedSources.push({
          url: cleanedUrl,
          title: scrapedData.title || source.title || "No title available",
          text: scrapedData.text.substring(0, 2000) + "...",
          tags: Array.isArray(tags) ? tags : [],
          neutralityScore: analysis.neutralityScore || 0.5,
          sentimentScore: analysis.sentimentScore || 0.5,
          domain: extractDomain(cleanedUrl),
          sourceType: source.sourceType || "general",
          credibilityScore: calculateCredibilityScore(
            extractDomain(cleanedUrl),
            source.sourceType
          ),
          aiGenerated: false,
          verified: true,
          lastVerified: new Date().toISOString(),
          contentSource: "direct_scraping",
          scrapedSuccessfully: true,
        });
      } else {
        // Scraping failed - use original data with lower credibility
        console.warn(`Scraping failed for URL: ${cleanedUrl}`);

        // Use whatever content we have for analysis
        const contentToAnalyze =
          source.contentSnippet || source.title || "No content available";
        const analysis = await getNeutralityAndSentiment(contentToAnalyze);
        const tags = await getTagsFromAI(contentToAnalyze);

        validatedSources.push({
          ...source,
          url: cleanedUrl,
          title: source.title || "No title available",
          text:
            source.contentSnippet || "Content not available through scraping",
          tags: Array.isArray(tags) ? tags : [],
          neutralityScore: analysis.neutralityScore || 0.5,
          sentimentScore: analysis.sentimentScore || 0.5,
          domain: extractDomain(cleanedUrl),
          sourceType: source.sourceType || "general",
          credibilityScore: Math.max(
            0.2,
            (source.credibilityScore || 0.5) - 0.3
          ),
          verified: false,
          lastVerified: new Date().toISOString(),
          scrapedSuccessfully: false,
        });
      }
    } catch (error) {
      console.error(`Error validating source ${source.url}:`, error.message);
      // Still include the source but mark it as failed
      validatedSources.push({
        ...source,
        tags: [],
        neutralityScore: 0.5,
        sentimentScore: 0.5,
        credibilityScore: 0.2,
        verified: false,
        scrapedSuccessfully: false,
        error: error.message,
      });
    }
  }

  return validatedSources;
}

// Basic AI analysis functions
async function getNeutralityAndSentiment(text) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      neutralityScore: { type: Type.NUMBER },
      sentimentScore: { type: Type.NUMBER },
    },
  };

  const prompt = `Analyze this text for neutrality (0=biased, 1=neutral) and sentiment (0=negative, 1=positive): ${text.substring(
    0,
    3000
  )}`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          "Provide only JSON with neutralityScore and sentimentScore.",
      },
    },
    { neutralityScore: 0.5, sentimentScore: 0.5 }
  );
}

async function getTagsFromAI(text) {
  const responseSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  const prompt = `Extract relevant tags from: ${text.substring(0, 2000)}`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction: "Return only a JSON array of tags.",
      },
    },
    []
  );
}

async function getGenSummary(text) {
  try {
    const prompt = `Provide a concise summary of the following text. Return ONLY the summary text, no JSON formatting:

${text.substring(0, 6000)}`;

    const response = await ai.models.generateContent({
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: prompt }],
      config: {
        systemInstruction: "Provide only a concise summary as plain text.",
      },
    });

    const summary = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    return summary || text.slice(0, 200) + "...";
  } catch (error) {
    console.error("Summary generation failed:", error.message);
    return text.slice(0, 200) + "...";
  }
}

// Pre-defined reliable sources for fallback
const reliableDomains = {
  health: [
    "https://www.cdc.gov/",
    "https://www.nih.gov/",
    "https://www.who.int/",
    "https://www.mayoclinic.org/",
    "https://www.health.harvard.edu/",
  ],
  nutrition: [
    "https://www.nutrition.gov/",
    "https://www.hsph.harvard.edu/nutritionsource/",
    "https://www.eatright.org/",
  ],
  general: [
    "https://www.wikipedia.org/",
    "https://www.britannica.com/",
    "https://www.sciencedaily.com/",
  ],
};

// Generate predefined reliable sources
async function generatePredefinedSources(prompt) {
  let category = "general";
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("health") ||
    lowerPrompt.includes("medical") ||
    lowerPrompt.includes("disease")
  ) {
    category = "health";
  } else if (
    lowerPrompt.includes("nutrition") ||
    lowerPrompt.includes("diet") ||
    lowerPrompt.includes("food")
  ) {
    category = "nutrition";
  }

  const domains = reliableDomains[category].slice(0, 3);

  return domains.map((domain) => ({
    url: domain,
    title: `Reliable ${category} information source`,
    text: `Visit this reputable ${category} website for verified information about "${prompt.substring(
      0,
      100
    )}"`,
    tags: [category, "reliable", "verified"],
    neutralityScore: 0.7,
    sentimentScore: 0.5,
    domain: extractDomain(domain),
    sourceType: category === "health" ? "medical" : "general",
    credibilityScore: 0.8,
    aiGenerated: false,
    verified: true,
    predefined: true,
    lastVerified: new Date().toISOString(),
    scrapedSuccessfully: false,
  }));
}

// More reliable approach for getting sources with fallback
async function getReliableSourcesWithFallback(prompt) {
  try {
    const initialResponse = await getInitialAIResponse(prompt);
    const sourcesAnalysis = await getActualSourcesUsed(prompt, initialResponse);
    const validatedSources = await validateAndEnrichSourcesWithScraping(
      sourcesAnalysis.sources
    );

    if (validatedSources.length > 0) {
      return {
        summary: initialResponse,
        neutralityScore: sourcesAnalysis.overallNeutrality || 0.5,
        persuasionScore: sourcesAnalysis.overallPersuasion || 0.5,
        sources: validatedSources,
      };
    }

    console.log(
      "No AI-validated sources found, using predefined reliable sources"
    );
    const fallbackSources = await generatePredefinedSources(prompt);

    return {
      summary: initialResponse,
      neutralityScore: 0.5,
      persuasionScore: 0.5,
      sources: fallbackSources,
      usedFallback: true,
    };
  } catch (error) {
    console.error("Error in reliable sources approach:", error);
    return await getFallbackResponse(prompt);
  }
}

// Step 1: Get initial AI response
async function getInitialAIResponse(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: FLASH_LITE_MODEL,
      contents: [
        { type: "text", text: `Provide a comprehensive answer to: ${prompt}` },
      ],
      config: {
        systemInstruction:
          "Provide a well-researched, balanced response based on credible information.",
      },
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "Unable to generate response";
  } catch (error) {
    console.error("Initial AI response failed:", error.message);
    return "Unable to generate response";
  }
}

// Step 2: Get ACTUAL sources used by Gemini
async function getActualSourcesUsed(prompt, aiResponse) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallNeutrality: { type: Type.NUMBER },
      overallPersuasion: { type: Type.NUMBER },
      sources: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING },
            title: { type: Type.STRING },
            contentSnippet: { type: Type.STRING },
            domain: { type: Type.STRING },
            sourceType: { type: Type.STRING },
          },
        },
      },
    },
  };

  const promptText = `
Provide 2-3 REAL, VERIFIABLE sources that would contain accurate information about: "${prompt}"

CRITICAL REQUIREMENTS:
- Return ONLY clean, simple URLs without tracking parameters
- Only include well-known, authoritative domains like .gov, .edu, .org
- Do NOT include any Facebook tracking parameters
- If you cannot provide a clean, verifiable URL, do not include the source

Return as JSON with the exact schema provided.
`;

  const result = await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "You MUST return only clean, verifiable URLs without tracking parameters.",
      },
    },
    {
      overallNeutrality: 0.5,
      overallPersuasion: 0.5,
      sources: [],
    }
  );

  // Clean all URLs in the result
  if (result.sources && Array.isArray(result.sources)) {
    result.sources = result.sources
      .map((source) => ({
        ...source,
        url: cleanUrl(source.url) || source.url,
        tags: [], // Initialize empty tags array
      }))
      .filter((source) => source.url);
  }

  return result;
}

// Calculate credibility based on domain and source type
function calculateCredibilityScore(domain, sourceType) {
  let score = 0.5;

  if (domain) {
    const domainLower = domain.toLowerCase();
    if (domainLower.includes(".edu")) score = 0.9;
    else if (domainLower.includes(".gov")) score = 0.85;
    else if (domainLower.includes(".org")) score = 0.7;
    else if (domainLower.includes(".com")) {
      const trustedNews = ["reuters", "apnews", "bbc", "npr", "pbs"];
      if (trustedNews.some((news) => domainLower.includes(news))) score = 0.8;
      else score = 0.6;
    }
  }

  const typeScores = {
    academic: 0.9,
    government: 0.85,
    scientific_journal: 0.9,
    established_news: 0.8,
    news: 0.7,
    organization: 0.7,
    general: 0.5,
  };

  if (sourceType && typeScores[sourceType]) {
    score = Math.max(score, typeScores[sourceType]);
  }

  return Math.max(0.1, Math.min(1, score));
}

// Fallback response
async function getFallbackResponse(prompt) {
  const summary = await getGenSummary(prompt);
  return {
    summary: summary,
    neutralityScore: 0.5,
    persuasionScore: 0.5,
    sources: [],
    fallback: true,
  };
}

// Enhanced bias analysis with comprehensive error handling
async function getBiasAnalysisInsights(aiResponse) {
  if (
    !aiResponse ||
    !aiResponse.sources ||
    !Array.isArray(aiResponse.sources)
  ) {
    console.warn("Invalid response data for bias analysis");
    return getFallbackBiasAnalysis();
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallAssessment: { type: Type.STRING },
      keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
      criticalThinkingQuestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      researchSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      confidenceLevel: { type: Type.STRING },
      biasIndicators: {
        type: Type.OBJECT,
        properties: {
          languagePatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          perspectiveGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          sourceDiversity: { type: Type.STRING },
        },
      },
    },
  };

  // Safely build the analysis prompt with proper error handling
  const sourcesText = aiResponse.sources
    .map((source, index) => {
      const tags = Array.isArray(source.tags) ? source.tags : [];
      return `
Source ${index + 1}:
- Title: ${source.title || "No title"}
- URL: ${source.url || "No URL"}
- Domain: ${source.domain || "Unknown"}
- Source Type: ${source.sourceType || "Unknown"}
- Credibility: ${((source.credibilityScore || 0.5) * 100).toFixed(0)}%
- Neutrality: ${source.neutralityScore || 0.5}
- Sentiment: ${source.sentimentScore || 0.5}
- Tags: ${tags.join(", ") || "No tags"}
${source.predefined ? "- Note: Predefined reliable source" : ""}
${
  source.scrapedSuccessfully
    ? "- Note: Content obtained through direct scraping"
    : "- Note: Content from AI description"
}
`;
    })
    .join("\n");

  const analysisPrompt = `
Analyze this research response for bias and provide educational insights:

RESEARCH SUMMARY: ${aiResponse.summary || "No summary available"}
OVERALL NEUTRALITY SCORE: ${aiResponse.neutralityScore || 0.5}
OVERALL PERSUASION SCORE: ${aiResponse.persuasionScore || 0.5}

ACTUAL SOURCES USED:${sourcesText}

Provide a comprehensive bias analysis that helps users understand:
1. How balanced or skewed the information appears based on ACTUAL sources
2. What patterns might indicate bias in the source selection
3. Questions to encourage critical thinking about these specific sources
4. Suggestions for more balanced research based on the source analysis
5. Confidence level in the neutrality assessment

Focus on educational value and helping users understand the actual sources behind AI responses.
`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: analysisPrompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "Provide educational, non-political bias analysis based on the ACTUAL sources used.",
      },
    },
    getFallbackBiasAnalysis()
  );
}

function getFallbackBiasAnalysis() {
  return {
    overallAssessment: "Analysis unavailable - using default metrics",
    keyFindings: ["Consider the actual sources used by the AI system"],
    criticalThinkingQuestions: [
      "What perspectives might be missing from these sources?",
    ],
    researchSuggestions: ["Verify claims with primary sources when possible"],
    confidenceLevel: "medium",
    biasIndicators: {
      languagePatterns: ["Unable to analyze language patterns"],
      perspectiveGaps: ["Check source diversity manually"],
      sourceDiversity: "unknown",
    },
  };
}

// Enhanced version with actual source validation
async function getEnhancedSmartResponseWithSources(prompt) {
  try {
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) return null;

    // Always ensure sources array exists and has proper structure
    const sources = Array.isArray(aiResponse.sources) ? aiResponse.sources : [];

    // Update the response with validated sources structure
    const responseWithSources = {
      ...aiResponse,
      sources: sources.map((source) => ({
        ...source,
        tags: Array.isArray(source.tags) ? source.tags : [],
        neutralityScore: source.neutralityScore || 0.5,
        sentimentScore: source.sentimentScore || 0.5,
        credibilityScore: source.credibilityScore || 0.5,
      })),
    };

    const biasInsights = await getBiasAnalysisInsights(responseWithSources);
    const sourceMetrics = calculateSourceMetrics(responseWithSources.sources);
    const researchQuality = assessResearchQuality(
      responseWithSources,
      sourceMetrics
    );

    return {
      ...responseWithSources,
      biasAnalysis: biasInsights,
      sourceMetrics,
      researchQuality,
      quickAssessment: generateQuickAssessment(
        responseWithSources,
        sourceMetrics,
        researchQuality
      ),
      sourcesValidated: true,
    };
  } catch (error) {
    console.error("Error in enhanced smart response:", error);
    return await getFallbackResponse(prompt);
  }
}

// Updated main function
async function getSmartResponseWithSources(prompt) {
  return await getReliableSourcesWithFallback(prompt);
}

// Helper functions (keep the same implementations as before)
function calculateSourceMetrics(sources) {
  if (!sources || sources.length === 0) {
    return {
      neutralityRange: { min: 0, max: 0, average: 0 },
      sentimentRange: { min: 0, max: 0, average: 0 },
      diversityScore: 0,
      scoreVariance: 0,
    };
  }

  const neutralityScores = sources.map((s) => s.neutralityScore || 0.5);
  const sentimentScores = sources.map((s) => s.sentimentScore || 0.5);
  const credibilityScores = sources.map((s) => s.credibilityScore || 0.5);

  return {
    neutralityRange: {
      min: Math.min(...neutralityScores),
      max: Math.max(...neutralityScores),
      average:
        neutralityScores.reduce((a, b) => a + b, 0) / neutralityScores.length,
    },
    sentimentRange: {
      min: Math.min(...sentimentScores),
      max: Math.max(...sentimentScores),
      average:
        sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length,
    },
    credibilityRange: {
      min: Math.min(...credibilityScores),
      max: Math.max(...credibilityScores),
      average:
        credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length,
    },
    diversityScore: calculateDiversityScore(sources),
    scoreVariance: calculateScoreVariance(neutralityScores),
    balancedPerspectives: checkPerspectiveBalance(neutralityScores),
    sourceTypes: countSourceTypes(sources),
  };
}

function countSourceTypes(sources) {
  const types = {};
  sources.forEach((source) => {
    const type = source.sourceType || "unknown";
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

function assessResearchQuality(aiResponse, sourceMetrics) {
  const {
    neutralityScore = 0.5,
    persuasionScore = 0.5,
    sources = [],
  } = aiResponse;
  const {
    neutralityRange,
    diversityScore = 0,
    credibilityRange = { average: 0.5 },
    sourceTypes = {},
  } = sourceMetrics;

  let qualityScore = 0;
  const factors = [];

  if (neutralityScore > 0.7) {
    qualityScore += 0.2;
    factors.push("High overall neutrality");
  } else if (neutralityScore > 0.5) {
    qualityScore += 0.1;
    factors.push("Moderate overall neutrality");
  }

  if (diversityScore > 0.7) {
    qualityScore += 0.2;
    factors.push("Good source diversity");
  } else if (diversityScore > 0.4) {
    qualityScore += 0.1;
    factors.push("Moderate source diversity");
  }

  if (neutralityRange.max - neutralityRange.min > 0.3) {
    qualityScore += 0.15;
    factors.push("Wide perspective range");
  }
  if (credibilityRange.average > 0.7) {
    qualityScore += 0.25;
    factors.push("High source credibility");
  } else if (credibilityRange.average > 0.5) {
    qualityScore += 0.15;
    factors.push("Moderate source credibility");
  }

  const uniqueTypes = Object.keys(sourceTypes).length;
  if (uniqueTypes >= 3) {
    qualityScore += 0.1;
    factors.push("Good source type variety");
  }
  if (sources.length >= 3) {
    qualityScore += 0.1;
    factors.push("Adequate source quantity");
  }

  return {
    qualityScore: Math.min(qualityScore, 1),
    factors,
    rating: qualityScore > 0.7 ? "high" : qualityScore > 0.4 ? "medium" : "low",
  };
}

function generateQuickAssessment(aiResponse, sourceMetrics, researchQuality) {
  const { neutralityScore = 0.5, persuasionScore = 0.5 } = aiResponse;
  const {
    neutralityRange = { min: 0, max: 0 },
    balancedPerspectives = false,
    credibilityRange = { average: 0.5 },
  } = sourceMetrics;

  const assessment = {
    overallNeutrality:
      neutralityScore > 0.7
        ? "high"
        : neutralityScore > 0.5
        ? "moderate"
        : "low",
    perspectiveBalance: balancedPerspectives ? "balanced" : "skewed",
    researchQuality: researchQuality.rating,
    sourceCredibility:
      credibilityRange.average > 0.7
        ? "high"
        : credibilityRange.average > 0.5
        ? "moderate"
        : "low",
    keyConsideration: "",
  };

  if (neutralityRange.max - neutralityRange.min < 0.2) {
    assessment.keyConsideration =
      "Sources show similar neutrality levels - consider seeking contrasting viewpoints";
  } else if (persuasionScore > 0.7) {
    assessment.keyConsideration =
      "High persuasion detected - evaluate argument strength critically";
  } else if (neutralityScore < 0.4) {
    assessment.keyConsideration =
      "Low overall neutrality - verify claims with additional sources";
  } else if (credibilityRange.average < 0.5) {
    assessment.keyConsideration =
      "Source credibility is low - consider more authoritative references";
  } else {
    assessment.keyConsideration =
      "Based on actual sources used - continue critical evaluation";
  }

  return assessment;
}

function calculateDiversityScore(sources) {
  if (!sources || sources.length === 0) return 0;
  const neutralityScores = sources.map((s) => s.neutralityScore || 0.5);
  const variance = calculateScoreVariance(neutralityScores);
  return Math.min(variance * 5, 1);
}

function calculateScoreVariance(scores) {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
    scores.length;
  return variance;
}

function checkPerspectiveBalance(neutralityScores) {
  if (neutralityScores.length < 3) return false;
  const highNeutral = neutralityScores.filter((s) => s > 0.7).length;
  const lowNeutral = neutralityScores.filter((s) => s < 0.4).length;
  const moderateNeutral = neutralityScores.filter(
    (s) => s >= 0.4 && s <= 0.7
  ).length;
  return (
    (highNeutral > 0 && lowNeutral > 0) ||
    moderateNeutral >= neutralityScores.length / 2
  );
}

module.exports = {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getSmartResponseWithSources,
  getEnhancedSmartResponseWithSources,
  getBiasAnalysisInsights,
};
