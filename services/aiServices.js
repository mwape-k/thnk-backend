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

module.exports = {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
};
