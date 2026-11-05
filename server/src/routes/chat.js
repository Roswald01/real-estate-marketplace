import express from "express";
import { chatWithAgent } from "../agent.js";

const router = express.Router();

// POST /api/chat -> Send message toI Agent
router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Basic validation
    if (!message || typeof message !== "string") {
      return res.status(400).json({ 
        success: false, 
        message: "A valid 'message' string is required in the request body." 
      });
    }

    // Call our autonomous agent
    const result = await chatWithAgent(message, history || []);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Chat route error:", error);
    res.status(500).json({ 
      success: false, 
      message: "AI Agent encountered an error.",
      error: error.message 
    });
  }
});

export default router;