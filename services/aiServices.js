const ai = require("../config/gemini.js");
const { Type } = require("@google/genai");

// Enhanced utility with better error handling and logging
async function callAI(params, fallbackValue) {
  try {
    const startTime = Date.now();
    const response = await ai.models.generateContent(params);
    const endTime = Date.now();

    console.log(`AI call completed in ${endTime - startTime}ms`);

    // Simplified response checking
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error(
        "Missing response text:",
        JSON.stringify(response, null, 2)
      );
      return fallbackValue;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      console.error("Raw text:", text);
      return fallbackValue;
    }
  } catch (error) {
    console.error("AI service call failed:", error.message);
    return fallbackValue;
  }
}

// Single call to get ALL analysis in one go
async function getComprehensiveAnalysis(text) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      neutralityScore: { type: Type.NUMBER },
      sentimentScore: { type: Type.NUMBER },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      summary: { type: Type.STRING },
      deepDiveSummaries: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            neutralityScore: { type: Type.NUMBER },
            sources: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    },
  };

  const prompt = `
Analyze the following text comprehensively and provide a single JSON response with:

1. neutralityScore: number between 0 (very biased) and 1 (completely neutral)
2. sentimentScore: number between 0 (very negative) and 1 (very positive)
3. tags: array of relevant keywords/tags
4. summary: concise summary of the content
5. deepDiveSummaries: array of up to 3 detailed summaries with neutrality scores and potential sources

Text:
${text.substring(0, 10000)}  // Limit text length to prevent token limits
`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [{ type: "text", text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 1 }, // Small budget for better analysis
        systemInstruction:
          "You are a comprehensive research analysis tool that provides multiple insights in a single response.",
      },
    },
    {
      neutralityScore: 0.5,
      sentimentScore: 0.5,
      tags: [],
      summary: text.substring(0, 200) + "...",
      deepDiveSummaries: [],
    }
  );
}

// Keep existing functions for individual use cases
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

  const promptText = `Provide a comprehensive research response for: ${prompt}

Return JSON with:
- summary: concise answer
- neutralityScore: 0-1
- persuasionScore: 0-1  
- sources: up to 4 reputable sources with url, title, text, tags, neutralityScore, sentimentScore

Only return valid JSON.`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "Provide concise research summaries with detailed source information.",
      },
    },
    null
  );
}

module.exports = {
  getComprehensiveAnalysis,
  getSmartResponseWithSources,
  // Keep individual functions for backward compatibility
  getNeutralityAndSentiment: (text) =>
    getComprehensiveAnalysis(text).then((r) => ({
      neutralityScore: r.neutralityScore,
      sentimentScore: r.sentimentScore,
    })),
  getTagsFromAI: (text) => getComprehensiveAnalysis(text).then((r) => r.tags),
  getGenSummary: (text) =>
    getComprehensiveAnalysis(text).then((r) => r.summary),
  getDeepDiveSummaries: (text) =>
    getComprehensiveAnalysis(text).then((r) => r.deepDiveSummaries),
};
