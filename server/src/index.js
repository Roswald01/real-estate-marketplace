import express from "express";
import cors from "cors";
//cross origin resource sharing
//If you don't use CORS on the backend, when your React app tries to fetch property listings, the browser blocks it and throws error 
import dotenv from "dotenv";

import "./db.js";

import { initDB } from "./schema.js";

import propertyRoutes from "./routes/properties.js";

import chatRoutes from "./routes/chat.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allows server to read JSON bodies in requests

//Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Real Estate AI Backend is live!",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/properties", propertyRoutes);

app.use("/api/chat", chatRoutes);

app.listen(PORT, async() => {
  console.log(`Server is listening on http://localhost:${PORT}`);

  await initDB();
});