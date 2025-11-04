const ai = require("../config/gemini.js");
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

// Optimized: Cleaner prompt structure
async function getDeepDiveSummaries(prompt) {
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        neutralityScore: { type: Type.NUMBER },
        sources: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
  };

  const promptText = `Provide 3-6 research summaries for: ${prompt}. Each with summary, neutralityScore (0-1), and source URLs from credible domains only. Return only JSON array.`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "Return only JSON array of research summaries with valid URLs from reputable sources.",
      },
    },
    [
      {
        summary: "Sample summary",
        neutralityScore: 0.5,
        sources: ["https://example.com"],
      },
    ]
  );
}

// Enhanced: Strict URL validation and credibility requirements
async function getSmartResponseWithSources(prompt) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      neutralityScore: { type: Type.NUMBER },
      persuasionScore: { type: Type.NUMBER },
      sources: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING },
            title: { type: Type.STRING },
            text: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            neutralityScore: { type: Type.NUMBER },
            sentimentScore: { type: Type.NUMBER },
          },
        },
      },
    },
  };

  const promptText = `
Research the topic: "${prompt}"

CRITICAL REQUIREMENTS FOR SOURCES:
1. URLs MUST be real, accessible websites that exist (no 404 errors)
2. Prioritize credible domains: .edu, .gov, .org, established news outlets, academic journals
3. AVOID: Wikipedia, personal blogs, social media, forums, questionable domains
4. Each URL must be a complete, valid web address starting with https://
5. Sources must be relevant and authoritative for the topic
6. Ensure URLs are not made up or hallucinated

Provide 4-6 high-quality sources with:
- Valid, working URLs from reputable domains
- Accurate titles that match the actual content
- Concise, relevant text excerpts
- Appropriate tags
- Neutrality and sentiment scores

Return only valid JSON with research response and verified sources.
`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: `You are a research assistant that provides ONLY real, verifiable sources. 
        
STRICT RULES:
- NEVER invent or hallucinate URLs
- ONLY use domains that are known to exist and be credible
- ALWAYS verify URLs would be accessible to users
- REJECT any questionable or low-quality sources
- PRIORITIZE: .edu, .gov, .org, academic, and established media sources
- AVOID: Wikipedia, personal blogs, social media, forums

Return valid JSON with real, working sources only.`,
      },
    },
    null
  );
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

SOURCES ANALYSIS:
${aiResponse.sources
  .map(
    (source, index) => `
Source ${index + 1}:
- Title: ${source.title}
- URL: ${source.url}
- Domain: ${source.url ? new URL(source.url).hostname : "N/A"}
- Neutrality: ${source.neutralityScore}
- Sentiment: ${source.sentimentScore}
- Tags: ${source.tags.join(", ")}
`
  )
  .join("\n")}

Provide a comprehensive bias analysis that helps users understand:
1. How balanced or skewed the information appears
2. What patterns might indicate bias
3. Questions to encourage critical thinking
4. Suggestions for more balanced research
5. Confidence level in the neutrality assessment

Focus on educational value and helping users develop media literacy skills.
`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: analysisPrompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "Provide educational, non-political bias analysis that helps users think critically about information sources. Be objective and focus on media literacy principles.",
      },
    },
    {
      overallAssessment: "Analysis unavailable - using default metrics",
      keyFindings: [
        "Consider the neutrality scores of individual sources",
        "Compare multiple perspectives for balanced understanding",
      ],
      criticalThinkingQuestions: [
        "What perspectives might be missing?",
        "How do the source scores compare to each other?",
      ],
      researchSuggestions: [
        "Seek sources with different neutrality scores",
        "Look for primary sources when possible",
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

// Enhanced version with URL validation
async function getEnhancedSmartResponseWithSources(prompt) {
  try {
    // Get the original AI response
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) return null;

    // Validate URLs in the response
    const validatedResponse = await validateAndEnhanceSources(aiResponse);

    // Get comprehensive bias analysis
    const biasInsights = await getBiasAnalysisInsights(validatedResponse);

    // Calculate additional metrics
    const sourceMetrics = calculateSourceMetrics(validatedResponse.sources);
    const researchQuality = assessResearchQuality(
      validatedResponse,
      sourceMetrics
    );

    return {
      // Validated response
      ...validatedResponse,

      // Enhanced educational components
      biasAnalysis: biasInsights,
      sourceMetrics,
      researchQuality,

      // Quick assessment for UI display
      quickAssessment: generateQuickAssessment(
        validatedResponse,
        sourceMetrics,
        researchQuality
      ),
    };
  } catch (error) {
    console.error("Error in enhanced smart response:", error);
    return await getSmartResponseWithSources(prompt); // Fallback to original
  }
}

// New function to validate and enhance sources
async function validateAndEnhanceSources(aiResponse) {
  if (!aiResponse.sources) return aiResponse;

  const validatedSources = aiResponse.sources.map((source) => {
    // Basic URL validation
    let urlValid = false;
    let domainType = "unknown";

    try {
      const url = new URL(source.url);
      urlValid = true;

      // Categorize domain for credibility assessment
      const hostname = url.hostname.toLowerCase();
      if (hostname.includes(".edu")) domainType = "academic";
      else if (hostname.includes(".gov")) domainType = "government";
      else if (hostname.includes(".org")) domainType = "organization";
      else if (
        hostname.includes(".com") &&
        (hostname.includes("reuters") ||
          hostname.includes("apnews") ||
          hostname.includes("bbc") ||
          hostname.includes("nytimes") ||
          hostname.includes("theguardian"))
      )
        domainType = "established_media";
      else domainType = "general";
    } catch (error) {
      console.warn(`Invalid URL format: ${source.url}`);
      urlValid = false;
    }

    return {
      ...source,
      urlValid,
      domainType,
      credibilityScore: calculateCredibilityScore(source.url, domainType),
    };
  });

  return {
    ...aiResponse,
    sources: validatedSources,
  };
}

// Helper function to calculate source credibility
function calculateCredibilityScore(url, domainType) {
  let score = 0.5; // Base score

  // Domain type scoring
  const domainScores = {
    academic: 0.9,
    government: 0.8,
    established_media: 0.7,
    organization: 0.6,
    general: 0.4,
  };

  score = domainScores[domainType] || 0.5;

  // Additional factors
  if (url.includes("blog.") || url.includes("medium.com")) score -= 0.2;
  if (url.includes("wikipedia.org")) score = 0.6; // Wikipedia is generally reliable but not primary

  return Math.max(0.1, Math.min(1, score));
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
    diversityScore: calculateDiversityScore(sources),
    scoreVariance: calculateScoreVariance(neutralityScores),
    balancedPerspectives: checkPerspectiveBalance(neutralityScores),
    credibilityStats: calculateCredibilityStats(sources),
  };
}

// New function to calculate credibility statistics
function calculateCredibilityStats(sources) {
  const credibilityScores = sources.map((s) => s.credibilityScore || 0.5);
  const domainTypes = sources.map((s) => s.domainType || "unknown");

  return {
    averageCredibility:
      credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length,
    highCredibilityCount: credibilityScores.filter((s) => s > 0.7).length,
    domainDistribution: domainTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
  };
}

// Enhanced research quality assessment
function assessResearchQuality(aiResponse, sourceMetrics) {
  const { neutralityScore, persuasionScore, sources } = aiResponse;
  const { neutralityRange, diversityScore, scoreVariance, credibilityStats } =
    sourceMetrics;

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

  // Factor 4: Source count
  if (sources.length >= 4) {
    qualityScore += 0.15;
    factors.push("Adequate source quantity");
  }

  // Factor 5: Source credibility (NEW)
  if (credibilityStats.averageCredibility > 0.7) {
    qualityScore += 0.2;
    factors.push("High source credibility");
  } else if (credibilityStats.averageCredibility > 0.5) {
    qualityScore += 0.1;
    factors.push("Moderate source credibility");
  }

  // Factor 6: Valid URLs (NEW)
  const validUrlCount = sources.filter((s) => s.urlValid !== false).length;
  if (validUrlCount === sources.length) {
    qualityScore += 0.1;
    factors.push("All URLs appear valid");
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
  const { neutralityRange, balancedPerspectives, credibilityStats } =
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
      credibilityStats.averageCredibility > 0.7
        ? "high"
        : credibilityStats.averageCredibility > 0.5
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
  } else if (credibilityStats.averageCredibility < 0.5) {
    assessment.keyConsideration =
      "Source credibility is low - consider more authoritative references";
  } else {
    assessment.keyConsideration =
      "Moderate balance achieved - continue critical evaluation";
  }

  return assessment;
}

// Additional helper functions
function calculateDiversityScore(sources) {
  if (!sources || sources.length === 0) return 0;

  // Simple diversity calculation based on neutrality score spread
  const neutralityScores = sources.map((s) => s.neutralityScore);
  const variance = calculateScoreVariance(neutralityScores);

  // Normalize to 0-1 scale (some variance is good for diversity)
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

  // for balanced scores
  return (
    (highNeutral > 0 && lowNeutral > 0) ||
    moderateNeutral >= neutralityScores.length / 2
  );
}

module.exports = {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
  getEnhancedSmartResponseWithSources,
  getBiasAnalysisInsights,
  validateAndEnhanceSources,
};
