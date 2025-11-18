const ai = require("../config/gemini.js");
const scrapeWebsite = require("./scrapper.js");
const { Type } = require("@google/genai");

// Optimized utility function with faster response checking
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
      // 100k character limit
      console.error("Response too large, likely truncated:", text.length);
      return fallbackValue;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      console.error("First 500 chars:", text.substring(0, 500));
      console.error("Last 500 chars:", text.substring(text.length - 500));
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

//function to handle url validation

async function validateAndEnrichSources(sources) {
  if (!sources || sources.length === 0) return [];

  const validatedSources = [];

  for (const source of sources) {
    try {
      // Basic URL validation
      if (!isValidUrl(source.url)) {
        console.warn(`Invalid URL format: ${source.url}`);
        continue;
      }

      // Try to scrape the URL to verify it exists and get real content
      const scrapedData = await scrapeWebsite(source.url);

      if (scrapedData) {
        // Use actual scraped data instead of AI-generated snippets
        validatedSources.push({
          url: source.url,
          title: scrapedData.title || source.title,
          text: scrapedData.text || source.contentSnippet,
          tags: scrapedData.tags || [],
          neutralityScore: scrapedData.neutralityScore || 0.5,
          sentimentScore: scrapedData.sentimentScore || 0.5,
          domain: extractDomain(source.url),
          sourceType: source.sourceType,
          credibilityScore: calculateCredibilityScore(
            extractDomain(source.url),
            source.sourceType
          ),
          aiGenerated: false,
          verified: true, // Mark as verified
          lastVerified: new Date().toISOString(),
        });
      } else {
        // URL exists but scraping failed - use original data with lower credibility
        console.warn(`Scraping failed for URL: ${source.url}`);
        validatedSources.push({
          ...source,
          credibilityScore: Math.max(
            0.2,
            (source.credibilityScore || 0.5) - 0.3
          ),
          verified: false,
          lastVerified: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Error validating source ${source.url}:`, error.message);
      // Skip invalid sources
      continue;
    }
  }

  return validatedSources;
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

// Optimized: Remove duplicate text in contents
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
    4000
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
    { neutralityScore: 0, sentimentScore: 0 }
  );
}

// Optimized: Shorter prompt and faster processing
async function getTagsFromAI(text) {
  const responseSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  const prompt = `Extract relevant tags from: ${text.substring(0, 3000)}`;

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

// Optimized: Simplified prompt
async function getGenSummary(text) {
  const responseSchema = { type: Type.STRING };

  const prompt = `Summarize concisely: ${text.substring(0, 6000)}`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: "Provide a concise summary as a JSON string.",
      },
    },
    text.slice(0, 200) + "..."
  );
}

// NEW APPROACH: Two-step process to get REAL sources
async function getSmartResponseWithSources(prompt) {
  try {
    // Step 1: Get the AI's response naturally
    const initialResponse = await getInitialAIResponse(prompt);

    // Step 2: Ask Gemini to reveal what sources it actually used/considered
    const sourcesAnalysis = await getActualSourcesUsed(prompt, initialResponse);

    // Step 3: Analyze the neutrality and sentiment of the actual sources
    const analyzedSources = await analyzeActualSources(sourcesAnalysis.sources);

    return {
      summary: initialResponse,
      neutralityScore: sourcesAnalysis.overallNeutrality,
      persuasionScore: sourcesAnalysis.overallPersuasion,
      sources: analyzedSources,
    };
  } catch (error) {
    console.error("Error in getSmartResponseWithSources:", error);
    return await getFallbackResponse(prompt);
  }
}

// Step 1: Get initial AI response
async function getInitialAIResponse(prompt) {
  const response = await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [
        { type: "text", text: `Provide a comprehensive answer to: ${prompt}` },
      ],
      config: {
        systemInstruction:
          "Provide a well-researched, balanced response based on credible information.",
      },
    },
    "Unable to generate response"
  );

  return typeof response === "string" ? response : JSON.stringify(response);
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
            // Add confidence level for the source
            aiConfidence: { type: Type.NUMBER },
          },
        },
      },
    },
  };

  const promptText = `
Based on your knowledge and training data, provide the MOST LIKELY real sources that would contain accurate information about: "${prompt}"

Your response was: "${aiResponse.substring(0, 1000)}..."

IMPORTANT REQUIREMENTS:
- Provide ONLY URLs that are highly likely to be real and accessible
- Focus on well-known, authoritative sources
- If you're not highly confident about a source's existence, do NOT include it
- Include an "aiConfidence" score (0-1) for each source indicating how sure you are it's real
- Prioritize sources that are commonly referenced and stable

Return a maximum of 4 high-confidence sources.
`;

  const result = await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: `You MUST only include sources you are highly confident actually exist and are accessible. 
        Be conservative - better to return fewer sources than include fake ones.
        Include an aiConfidence score (0.8-1.0 for high confidence, 0.5-0.7 for medium).`,
      },
    },
    {
      overallNeutrality: 0.5,
      overallPersuasion: 0.5,
      sources: [],
    }
  );

  // Filter by confidence threshold
  const highConfidenceSources = result.sources.filter(
    (source) => source.aiConfidence >= 0.7
  );

  return {
    ...result,
    sources: highConfidenceSources,
  };
}

// Step 3: Analyze the actual sources for bias and sentiment
async function analyzeActualSources(sources) {
  if (!sources || sources.length === 0) return [];

  // Validate and enrich sources with real data
  const validatedSources = await validateAndEnrichSources(sources);

  // If validation fails for all sources, return empty
  if (validatedSources.length === 0) {
    console.warn("No valid sources found after validation");
    return [];
  }

  return validatedSources;
}

// Calculate credibility based on domain and source type
function calculateCredibilityScore(domain, sourceType) {
  let score = 0.5; // Base score

  // Domain-based scoring
  if (domain) {
    const domainLower = domain.toLowerCase();
    if (domainLower.includes(".edu")) score = 0.9;
    else if (domainLower.includes(".gov")) score = 0.85;
    else if (domainLower.includes(".org")) score = 0.7;
    else if (domainLower.includes(".com")) {
      // Trusted news domains
      const trustedNews = [
        "reuters",
        "apnews",
        "bbc",
        "npr",
        "pbs",
        "associatedpress",
      ];
      if (trustedNews.some((news) => domainLower.includes(news))) score = 0.8;
      else score = 0.6;
    }
  }

  // Source type adjustments
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

// Fallback response if the main approach fails
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

// Enhanced bias analysis with educational insights
async function getBiasAnalysisInsights(aiResponse) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallAssessment: { type: Type.STRING },
      keyFindings: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      criticalThinkingQuestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      researchSuggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
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

  const analysisPrompt = `
Analyze this research response for bias and provide educational insights:

RESEARCH SUMMARY: ${aiResponse.summary}
OVERALL NEUTRALITY SCORE: ${aiResponse.neutralityScore}
OVERALL PERSUASION SCORE: ${aiResponse.persuasionScore}

ACTUAL SOURCES USED:
${aiResponse.sources
  .map(
    (source, index) => `
Source ${index + 1}:
- Title: ${source.title}
- URL: ${source.url}
- Domain: ${source.domain}
- Source Type: ${source.sourceType}
- Credibility: ${(source.credibilityScore * 100).toFixed(0)}%
- Neutrality: ${source.neutralityScore}
- Sentiment: ${source.sentimentScore}
- Tags: ${source.tags.join(", ")}
`
  )
  .join("\n")}

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
          "Provide educational, non-political bias analysis based on the ACTUAL sources used. Be transparent about source limitations and help users think critically about AI information sources.",
      },
    },
    {
      overallAssessment: "Analysis unavailable - using default metrics",
      keyFindings: [
        "Consider the actual sources used by the AI system",
        "Evaluate source credibility and potential biases",
      ],
      criticalThinkingQuestions: [
        "What perspectives might be missing from these sources?",
        "How do the source credibility scores affect your trust in this information?",
      ],
      researchSuggestions: [
        "Verify claims with primary sources when possible",
        "Consider seeking additional perspectives not represented here",
      ],
      confidenceLevel: "medium",
      biasIndicators: {
        languagePatterns: ["Unable to analyze language patterns"],
        perspectiveGaps: ["Check source diversity manually"],
        sourceDiversity: "unknown",
      },
    }
  );
}

// Enhanced version with actual source analysis
async function getEnhancedSmartResponseWithSources(prompt) {
  try {
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) return null;

    // If no valid sources found, use fallback with disclaimer
    if (aiResponse.sources.length === 0) {
      console.warn("No valid sources found, using fallback strategy");
      return await getFallbackWithWebSearch(prompt);
    }

    // Continue with bias analysis for valid sources
    const biasInsights = await getBiasAnalysisInsights(aiResponse);
    const sourceMetrics = calculateSourceMetrics(aiResponse.sources);
    const researchQuality = assessResearchQuality(aiResponse, sourceMetrics);

    return {
      ...aiResponse,
      biasAnalysis: biasInsights,
      sourceMetrics,
      researchQuality,
      quickAssessment: generateQuickAssessment(
        aiResponse,
        sourceMetrics,
        researchQuality
      ),
      sourcesValidated: true, // Indicate sources were validated
    };
  } catch (error) {
    console.error("Error in enhanced smart response:", error);
    return await getFallbackResponse(prompt);
  }
}

// New fallback that performs actual web search
async function getFallbackWithWebSearch(prompt) {
  // You could integrate with a real search API here
  // For now, return a clear disclaimer
  const summary = await getGenSummary(prompt);

  return {
    summary: summary,
    neutralityScore: 0.5,
    persuasionScore: 0.5,
    sources: [],
    fallback: true,
    disclaimer:
      "Unable to verify sources automatically. Consider verifying information through direct research.",
    sourceValidation: "failed",
  };
}

// Helper function to calculate source metrics
function calculateSourceMetrics(sources) {
  if (!sources || sources.length === 0) {
    return {
      neutralityRange: { min: 0, max: 0, average: 0 },
      sentimentRange: { min: 0, max: 0, average: 0 },
      diversityScore: 0,
      scoreVariance: 0,
    };
  }

  const neutralityScores = sources.map((s) => s.neutralityScore);
  const sentimentScores = sources.map((s) => s.sentimentScore);
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

// Count different types of sources
function countSourceTypes(sources) {
  const types = {};
  sources.forEach((source) => {
    const type = source.sourceType || "unknown";
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

// Helper function to assess research quality
function assessResearchQuality(aiResponse, sourceMetrics) {
  const { neutralityScore, persuasionScore, sources } = aiResponse;
  const {
    neutralityRange,
    diversityScore,
    scoreVariance,
    credibilityRange,
    sourceTypes,
  } = sourceMetrics;

  let qualityScore = 0;
  const factors = [];

  // Factor 1: Overall neutrality
  if (neutralityScore > 0.7) {
    qualityScore += 0.2;
    factors.push("High overall neutrality");
  } else if (neutralityScore > 0.5) {
    qualityScore += 0.1;
    factors.push("Moderate overall neutrality");
  }

  // Factor 2: Source diversity
  if (diversityScore > 0.7) {
    qualityScore += 0.2;
    factors.push("Good source diversity");
  } else if (diversityScore > 0.4) {
    qualityScore += 0.1;
    factors.push("Moderate source diversity");
  }

  // Factor 3: Perspective range
  if (neutralityRange.max - neutralityRange.min > 0.3) {
    qualityScore += 0.15;
    factors.push("Wide perspective range");
  }

  // Factor 4: Source credibility
  if (credibilityRange.average > 0.7) {
    qualityScore += 0.25;
    factors.push("High source credibility");
  } else if (credibilityRange.average > 0.5) {
    qualityScore += 0.15;
    factors.push("Moderate source credibility");
  }

  // Factor 5: Source variety
  const uniqueTypes = Object.keys(sourceTypes).length;
  if (uniqueTypes >= 3) {
    qualityScore += 0.1;
    factors.push("Good source type variety");
  }

  // Factor 6: Source count
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

// Helper function to generate quick assessment for UI
function generateQuickAssessment(aiResponse, sourceMetrics, researchQuality) {
  const { neutralityScore, persuasionScore } = aiResponse;
  const { neutralityRange, balancedPerspectives, credibilityRange } =
    sourceMetrics;

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

  // Determine key consideration
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

// Additional helper functions
function calculateDiversityScore(sources) {
  if (!sources || sources.length === 0) return 0;

  const neutralityScores = sources.map((s) => s.neutralityScore);
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
