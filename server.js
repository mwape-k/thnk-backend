const express = require("express");
const cors = require("cors");
const setupSwagger = require("./swagger");
const connectDB = require("./config/db");

// CRITICAL: Load environment variables FIRST for good server.js order
require("dotenv").config();

console.log("Environment loaded");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Routes import
const scrapeRoutes = require("./routes/scrapeRoutes");
const thnkRoutes = require("./routes/thnkRoutes");
const historyRoutes = require("./routes/historyRoutes");

// Connect to database
console.log("Connecting to DB...");
connectDB();

const app = express();

// CORS configuration - UPDATED for production
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5000",
        "http://0.0.0.0:5000/api-docs",
        "http://127.0.0.1:5173",
        "https://thnk-frontend.vercel.app",
        "https://thnk-frontend.vercel.app/",
      ];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Detailed route debugging
app.use((req, res, next) => {
  console.log("=== ROUTE DEBUGGING ===");
  console.log("Method:", req.method);
  console.log("Original URL:", req.originalUrl);
  console.log("Path:", req.path);
  console.log("Base URL:", req.baseUrl);
  console.log("==================");
  next();
});

// Routes
app.use("/api", scrapeRoutes);
app.use("/api", thnkRoutes);
app.use("/api/history", historyRoutes);

// Health check endpoint (IMPORTANT for Railway)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Backend API is running!",
    docs: `/api-docs`,
  });
});

// Setup Swagger docs route
setupSwagger(app);

// CRITICAL FIX: Bind to 0.0.0.0 for Railway
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Swagger docs available at http://0.0.0.0:${PORT}/api-docs`);
  console.log(` Health check at http://0.0.0.0:${PORT}/health`);
});
