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

  const promptText = `Provide 3-6 research summaries for: ${prompt}. Each with summary, neutralityScore (0-1), and source URLs. Return only JSON array.`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: "Return only JSON array of research summaries.",
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

// Optimized: More concise prompt
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

  const promptText = `Research: ${prompt}. Provide JSON with summary, scores, and 4-6 credible sources with valid URLs, titles, text, tags, and scores.`;

  return await callAI(
    {
      model: FLASH_LITE_MODEL,
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "Return only valid JSON with research response and sources.",
      },
    },
    null
  );
}

//Below is an async function for source insight -> goal to give the THNK platform more use beyond summaries
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

// Enhanced version of getSmartResponseWithSources that includes bias insights
async function getEnhancedSmartResponseWithSources(prompt) {
  try {
    // Get the original AI response
    const aiResponse = await getSmartResponseWithSources(prompt);
    if (!aiResponse) return null;

    // Get comprehensive bias analysis
    const biasInsights = await getBiasAnalysisInsights(aiResponse);

    // Calculate additional metrics
    const sourceMetrics = calculateSourceMetrics(aiResponse.sources);
    const researchQuality = assessResearchQuality(aiResponse, sourceMetrics);

    return {
      // Original response
      ...aiResponse,

      // Enhanced educational components
      biasAnalysis: biasInsights,
      sourceMetrics,
      researchQuality,

      // Quick assessment for UI display
      quickAssessment: generateQuickAssessment(
        aiResponse,
        sourceMetrics,
        researchQuality
      ),
    };
  } catch (error) {
    console.error("Error in enhanced smart response:", error);
    return await getSmartResponseWithSources(prompt); // Fallback to original
  }
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
  };
}

// Helper function to assess research quality
function assessResearchQuality(aiResponse, sourceMetrics) {
  const { neutralityScore, persuasionScore, sources } = aiResponse;
  const { neutralityRange, diversityScore, scoreVariance } = sourceMetrics;

  let qualityScore = 0;
  const factors = [];

  // Factor 1: Overall neutrality
  if (neutralityScore > 0.7) {
    qualityScore += 0.3;
    factors.push("High overall neutrality");
  } else if (neutralityScore > 0.5) {
    qualityScore += 0.2;
    factors.push("Moderate overall neutrality");
  }

  // Factor 2: Source diversity
  if (diversityScore > 0.7) {
    qualityScore += 0.3;
    factors.push("Good source diversity");
  } else if (diversityScore > 0.4) {
    qualityScore += 0.2;
    factors.push("Moderate source diversity");
  }

  // Factor 3: Perspective range
  if (neutralityRange.max - neutralityRange.min > 0.3) {
    qualityScore += 0.2;
    factors.push("Wide perspective range");
  }

  // Factor 4: Source count
  if (sources.length >= 4) {
    qualityScore += 0.2;
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
  const { neutralityRange, balancedPerspectives } = sourceMetrics;

  const assessment = {
    overallNeutrality:
      neutralityScore > 0.7
        ? "high"
        : neutralityScore > 0.5
        ? "moderate"
        : "low",
    perspectiveBalance: balancedPerspectives ? "balanced" : "skewed",
    researchQuality: researchQuality.rating,
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
};
