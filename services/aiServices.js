const ai = require("../config/gemini.js");
const { Type } = require("@google/genai");

//this is a scrub. later  integrate AI
async function getNeutralityAndSentiment(text) {
  //TODO: call gemini here and parse the response
  //temp solution below:
  return {
    neutralityScore: Math.random(),
    sentimentScore: Math.random(),
  };
}

async function getTagsFromAI(text) {
  //this is how gemini sshould structure the response
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: TypeSTRING,
    },
  };

  const prompt = "Generate concise, relevant tags for the following content:"; //ensuring that every parsed text is prompted to return the correct tag

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { type: "text", text: prompt },
      { type: "text", text: text },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: {
        thinkingBudget: 0, // Disables thinking
      },
      systemInstruction: "You are a research tool that lets users undestand topics and urls based on tagging, neutrality and sentiment analysis. Your name is THNK.",
    },
  });

  return response.parsed || [];
}

async function getGenSummary(text) {
  return text.slice(0, 200) + "..."; // Swap for AI summary later
}

async function getDeepDiveSummaries(prompt) {
  //Replace again with an api AI call
  //return up to 6 summaries, with neutrality and sourcess
  return [
    {
      summary: "Sumamry 1",
      neutralityScore: Math.random(),
      sources: ["https://sourcesite1.com", "https://sourcesite2.com"],
    },
    // up to 6
  ];
}

module.exports = {
  getNeutralityAndSentiment,
  getTagsFromAI,
  getGenSummary,
  getDeepDiveSummaries,
};
