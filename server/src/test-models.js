import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listAllModels() {
  try {
    const response = await ai.models.list();
    console.log(" Available models for your API key:");
    for await (const model of response) {
      if (model.supportedActions?.includes("generateContent") || model.name?.includes("flash")) {
        console.log(" -", model.name);
      }
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listAllModels();