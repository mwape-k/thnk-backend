const axios = require("axios");
const cheerio = require("cheerio");
const { getNeutralityAndSentiment, getTagsFromAI, getGenSummary } = require("./aiServices");


const scrapeWebsite = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const title = $('title').text();
        const bodyText = $('body').text();

        const tags = await getTagsFromAI(bodyText); // Ready for future asynchronicity
        const { neutralityScore, sentimentScore } = await getNeutralityAndSentiment(bodyText);
        const textSummary = await getGenSummary(bodyText);

        return {
            url, title,
            text: textSummary,
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
