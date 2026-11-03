import express from "express";
import cors from "cors";
//If you don't use CORS on the backend, when your React app tries to fetch property listings, the browser blocks it and throws error 
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json()); // Allows server to read JSON bodies in requests
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Real Estate AI Backend is live!",
    timestamp: new Date().toISOString()
  });
});
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});