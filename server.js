const express = require("express");
const cors = require("cors");
const setupSwagger = require("./swagger");

const connectDB = require("./config/db");

//routes import
console.log("importing routes");
const scrapeRoutes = require("./routes/scrapeRoutes");
console.log("scrapes importd: ", scrapeRoutes);
const thnkRoutes = require("./routes/thnkRoutes");
console.log("thnk importd: ", thnkRoutes);
const historyRoutes = require("./routes/historyRoutes");

console.log("loading env");

require("dotenv").config();
console.log("env loaded");
console.log("connecting to DB");

connectDB();

console.log("DB connected, starting server");

const app = express();

//enable CORS for all routes
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://0.0.0.0",
    ], // Your frontend URL
    credentials: true, // If you're using cookies/sessions
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json());

//Routes
app.use("/api", scrapeRoutes);
app.use("/api", thnkRoutes);
app.use("/api/history", historyRoutes);

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
