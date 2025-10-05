//creating model for sraping sources from user input/url
const mongoose = require('mongoose'); 

const ScrapedContentSchema = new mongoose.Schema({
    url: { type: String, required: true }, 
    title: String, 
    text: String, 
    tags: [String], //mainly to help with retrieval, this represents the groups articles will belong to for egs (education, politics, pop-culture, tech, etc)
    neutralityScore: Number, 
    sentimentScore: Number, 
    createdAt: { type: Date, default: Date.now}

});

module.exports = mongoose.model('ScrapedContent', ScrapedContentSchema); 