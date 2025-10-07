const getDeepDiveSummaries = require("../services/aiServices");

exports.deepDive = async (req, res) => {
    const { promt } = req.body; 
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
        const summaries = await getDeepDiveSummaries(prompt);
        res.json({ summaries });
    } catch (error) {
        console.error("Deep dive generation failed:", error.message);
        res.status(500).json({ error: "Failed to generate deep dive summaries" });
    }
}