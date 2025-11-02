const ai = require("../config/gemini.js");
const { Type } = require("@google/genai");

// Utility to safely call AI with logging and error handling
async function callAI(params, fallbackValue) {
  try {
    const response = await ai.models.generateContent(params);
    if (
      response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      Array.isArray(response.candidates[0].content.parts) &&
      response.candidates[0].content.parts.length > 0 &&
      response.candidates[0].content.parts[0].text
    ) {
      const text = response.candidates[0].content.parts[0].text;
      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (e) {
        console.error("JSON parse error:", e.message);
        console.error("Text:", text);
        return fallbackValue;
      }
    } else {
      console.error(
        "Missing or malformed response content parts:",
        JSON.stringify(response, null, 2)
      );
      return fallbackValue;
    }
  } catch (error) {
    console.error("AI service call failed:", error.message);
    return fallbackValue;
  }
}

// Call Gemini to get neutrality and sentiment scores as structured response
async function getNeutralityAndSentiment(text) {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      neutralityScore: { type: Type.NUMBER },
      sentimentScore: { type: Type.NUMBER },
    },
  };

  const prompt = `
Analyze the following text and provide a JSON object with:
- neutralityScore: a number between 0 (very biased) and 1 (completely neutral)
- sentimentScore: a number between 0 (very negative) and 1 (very positive)

Text:
${text}
`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [
        { type: "text", text: prompt },
        { type: "text", text: text },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction:
          "You are a research tool providing neutrality and sentiment analysis.",
      },
    },
    { neutralityScore: 0, sentimentScore: 0 }
  );
}

// Call Gemini to get tags in a structured JSON array
async function getTagsFromAI(text) {
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.STRING,
    },
  };

  const prompt = `
Generate a concise list of relevant tags for the following content.
Return only an array of strings:

${text}
`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [
        { type: "text", text: prompt },
        { type: "text", text: text },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction:
          "You are a research tool that helps tag content with relevant keywords.",
      },
    },
    []
  );
}

// Call Gemini to generate a brief summary of the text
async function getGenSummary(text) {
  const responseSchema = {
    type: Type.STRING,
  };

  const prompt = `
Generate a clear and concise summary for the following content:

${text}
`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [
        { type: "text", text: prompt },
        { type: "text", text: text },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: "You are a summarization tool.",
      },
    },
    text.slice(0, 200) + "..."
  );
}

// Call Gemini to generate up to 6 deep dive summaries with neutrality and sources
async function getDeepDiveSummaries(prompt) {
  const responseSchema = {
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
  };

  const promptText = `
You are a highly skilled research assistant working to provide in-depth, accurate, and unbiased research summaries.
Based on the prompt below, please provide up to 6 detailed and unique summaries related to the topic. 
For each summary, include the following:
- A clear and concise summary text explaining the key points.
- A neutralityScore, a number between 0 (very biased) and 1 (completely neutral).
- A list of credible source URLs used to create the summary.
- For each source, provide a brief explanation (1-2 sentences) of why it is credible or relevant.

Important: Only return a JSON array where each item contains the keys: summary, neutralityScore, and sources. Do NOT include any additional commentary or text outside the JSON structure.

Prompt:
${prompt}
`;

  return await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "You are a research assistant providing detailed summaries with neutrality scores and sources.",
      },
    },
    [
      {
        summary: "Sample summary 1",
        neutralityScore: 0.5,
        sources: ["https://sourcesite1.com", "https://sourcesite2.com"],
      },
    ]
  );
}

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

  const promptText = `You are a research assistant with access to credible information. Given the prompt below, provide:

1. A concise summary answering the prompt.
2. Neutrality and persuasion scores (0 to 1).
3. An array "sources" of up to 6 reputable sources used, each with:
  - url: full URL starting with http:// or https://
  - title: source title
  - text: brief summary or excerpt
  - tags: array of relevant keywords
  - neutralityScore: 0 to 1
  - sentimentScore: 0 to 1

Return only a valid JSON object with keys: summary, neutralityScore, persuasionScore, sources.

No explanation or extra text outside JSON.

Prompt:
${prompt}`;

  const response = await callAI(
    {
      model: "gemini-2.5-flash-lite",
      contents: [{ type: "text", text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction:
          "You assist users by providing concise summaries and detailed source info.",
      },
    },
    null
  );

  return response;
}

//add funtions to assist with deeper scraping and analysis here

module.exports = {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
  getSmartResponseWithSources,
};
