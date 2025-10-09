const express = require('express'); 
const connectDB = require('./config/db');

//routes import 
console.log("importing routes");
const scrapeRoutes = require('./routes/scrapeRoutes');
console.log("scrapes importd: ", scrapeRoutes);
const thnkRoutes = require("./controllers/thnkController");
console.log("thnk importd: ", thnkRoutes);

require('dotenv').config(); 

connectDB();

const app = express(); 

app.use(express.json());
app.use('/api', scrapeRoutes); 
app.use("/api/thnk", thnkRoutes)

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});

/* 
TODO: 
- testing 
- AI integration for Scoring 
- AI integration for tagging 
- deeper 'thnk' functionality
- Firebase user Authentication 
- user search/history storing 
*/