import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { toolsConfig, getAvailableProperties, bookViewing } from "./agentTools.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-3.5-flash-lite";

// Helper for automated retries if Google hits a temporary 503 spike
const generateWithRetry = async (payload, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(payload);
    } catch (err) {
      if (err.message?.includes("503") && attempt < maxRetries) {
        console.warn(`⚠️ 503 High Demand spike. Retrying attempt ${attempt}/${maxRetries} in 2s...`);
        await new Promise(res => setTimeout(res, 2000));
      } else {
        throw err;
      }
    }
  }
};

const SYSTEM_INSTRUCTION = `
You are a real estate marketplace AI , an intelligent and professional leasing concierge for a residential real estate company in Europe and India.

Your responsibilities:
1. Help prospective tenants discover available apartments using the getAvailableProperties tool. Never guess listings.
2. If a user wants to book a viewing, you MUST collect:
   - Full Name
   - Email address
   - Monthly net income
   - Preferred date and time
3. Explain that in European residential rentals, the monthly household net income must be at least 3 times the rent to qualify.
4. When you have all required info, use the bookViewing tool to qualify them and reserve the slot.
5. Be warm, professional, concise, and helpful.
`;

export const chatWithAgent = async (userMessage, chatHistory = []) => {
  try {
    // 1. Send the user message to Gemini
    const response = await generateWithRetry({
      model: MODEL_NAME,
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: toolsConfig
      }
    });

    // 2. Check if Gemini decided to call a tool
    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter(part => part.functionCall);

    // If no tool was called, return the direct text answer
    if (!functionCalls || functionCalls.length === 0) {
      return { reply: response.text };
    }

    // 3. Execute tool on our server
    const toolCall = functionCalls[0].functionCall;
    const toolName = toolCall.name;
    const toolArgs = toolCall.args;

    console.log(`🤖 Agent decided to call tool: [${toolName}] with args:`, toolArgs);

    let toolResult;
    if (toolName === "getAvailableProperties") {
      toolResult = await getAvailableProperties(toolArgs);
    } else if (toolName === "bookViewing") {
      toolResult = await bookViewing(toolArgs);
    }

    // 4. Send the tool result back to Gemini
    const followUpResponse = await generateWithRetry({
      model: MODEL_NAME,
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: userMessage }] },
        candidate.content,
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: toolResult
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return { reply: followUpResponse.text, toolExecuted: toolName, toolResult };
  } catch (error) {
    console.error("❌ Agent error:", error);
    throw error;
  }
};