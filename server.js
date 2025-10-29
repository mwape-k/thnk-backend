const express = require("express");
const setupSwagger = require("./swagger");

const connectDB = require("./config/db");

//routes import
console.log("importing routes");
const scrapeRoutes = require("./routes/scrapeRoutes");
console.log("scrapes importd: ", scrapeRoutes);
const thnkRoutes = require("./routes/thnkRoutes");
console.log("thnk importd: ", thnkRoutes);

console.log("loading env");

require("dotenv").config();
console.log("env loaded");
console.log("connecting to DB");

connectDB();

console.log("DB connected, starting server");

const app = express();
app.use(express.json());

//Routes
app.use("/api", scrapeRoutes);
app.use("/api", thnkRoutes);

// Setup Swagger docs route
setupSwagger(app);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
  console.log(
    `Swagger docs available at http://localhost:${
      process.env.PORT || 5000
    }/api-docs`
  );
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
