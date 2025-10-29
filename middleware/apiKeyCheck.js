module.exports = function (req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.GEMINI_API_KEY; // Set this in your .env file

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: "Unauthorized: invalid API key" });
  }
  next();
};
