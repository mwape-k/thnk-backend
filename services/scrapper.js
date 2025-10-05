const axios = require("axios");
const cheerio = require("cheerio"); // For parsing HTML


//tag extraction: this is where AI will take over 
const getTags = (text) => {
    let tags = []; 
    if(text.match(/education/gi)) tags.push("education");
    if (text.match(/impact/gi)) tags.push("social impact");
    if (text.match(/accessibility/gi)) tags.push("accessibility");
    // more tags will be added here 
    return tags.length ? tags : ["general"];
}

// Placeholder  scoring logic (AI can be integrated here) 
const scoreNeutrality = (text) => { 
    // Simple heuristic: if text contains words like "always", "never", "everyone", it might be less neutral
    return Math.random(); //float between 0 and 1 
};

const scoreSentiment  = (text) => { 
    return Math.random(); //float between 0 and 1 
};

const genSummary = (text) => {
    return text.slice(0, 200) + "..."; // Simple truncation for now
 }
 
const scrapeWebsite = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const title = $('title').text();
        const bodyText = $('body').text();
        const tags = getTags(bodyText);
        const neutralityScore = scoreNeutrality(bodyText);
        const sentimentScore = scoreSentiment(bodyText);

        const textSummary = genSummary(bodyText);

        return {
            url, title,
            text: textSummary, // Truncate for simplicity, future this will be a summary gen by AI integration
            tags,
            neutralityScore,
            sentimentScore
        };
    } catch (error) {
        console.error("Scraping failed:", error.message);
        return null;
    }
};

module.exports = scrapeWebsite; 