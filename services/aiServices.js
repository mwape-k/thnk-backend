//this is a scrub. later  integrate AI 
async function getNeutralityAndSentiment(text) {
    //TODO: call gemini here and parse the response 
    //temp solution below: 
    return{
        neutralityScore: Math.random(),
        sentimentScore: Math.random()
    };
}

async function getTagsFromAI(text) {
    //TODO: call gemini here to perform tagging
    return ['general', education]
}

async function getGenSummary(text) {
    return text.slice(0, 200) + "..."; // Swap for AI summary later
}

async function getDeepDiveSummaries(prompt){
    //Replace again with an api AI call 
    //return up to 6 summaries, with neutrality and sourcess
    return [
        { 
        summary: 'Sumamry 1',
        neutralityScore: Math.random(), 
        sources: ['https://sourcesite1.com', 'https://sourcesite2.com']
    }, 
    // up to 6
    ]
}

module.exports = { getNeutralityAndSentiment, getTagsFromAI, getGenSummary,getDeepDiveSummaries };