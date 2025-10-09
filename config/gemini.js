//centralising API setup and loading keys
const { GoogleGenAI, Type } = require("@google/genai");
const dotenv = require("dotenv"); 

dotenv.config(); 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = ai;