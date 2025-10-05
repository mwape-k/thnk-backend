const express = require('express'); 
const connectDB = require('./config/db');
const scrapeRoutes = require('./routes/scrapeRoutes');
require('dotenv').config(); 

connectDB();

const app = express(); 

app.use(express.json());
app.use('/api', scrapeRoutes); 

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});