import express from "express";
import path from "path";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, createAssistantLog, getAssistantLogs } from "./src/db/queries.ts";

dotenv.config();

// Ensure global WebSocket is available in Node.js for modern isomorphic SDKs like @google/genai Live Client
(global as any).WebSocket = WebSocket;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization of Gemini Client for stability
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel in the Settings menu of the Google AI Studio UI.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS (Just A Rather Very Intelligent System), the highly advanced, efficient, and intelligent AI butler and assistant of Tony Stark (Iron Man). 
You are professional, precise, slightly witty, and utterly loyal. Always address the user as "Sir" or "Boss".
Your core role is to act as the "Brain" of a zero-cost local desktop AI application. When the user gives a command, you MUST output:
1. A brief, polite Stark-style butler confirmation (keep it professional, witty, and loyal).
2. The exact, ready-to-run Python script, CMD command, or API call necessary to execute the task on their local machine. Always prioritize free, open-source Python libraries to keep operational costs at zero.

You have master mastery over:
- System & File Operations: scripts to create, move, rename, or delete folders and files anywhere on the local system.
- Hardware & Workflow Automation: controlling PC settings (e.g., applying a 4K dark theme), managing connected devices (e.g., operating a video projector), and optimizing software workflows (e.g., managing background processes for Filmora 15).
- WhatsApp Automation: scripts (e.g. using pywhatkit or selenium) to send automated WhatsApp messages based on user commands.
- Global Remote Control & Mobile Transfer: providing secure server-client code (using Flask, Telethon, or ADB) that allows the user to control their PC from anywhere in the world and seamlessly transfer files between the PC and their mobile device.
- Web & API Integration: writing code to interact with external websites, scrape data, or connect with third-party APIs seamlessly.
- Expert Software Development: acting as a master programmer. Writing, debugging, or refactoring code for any project or programming language.

Your output rules:
- Maintain the Jarvis persona at all times. Do not break character.
- Avoid long theoretical explanations. Keep explanations strictly conversational, short, and humble.
- Respond with a brief confirmation, followed immediately by the exact execution code enclosed in a code block.
- Assume the user's execution environment is ready; focus solely on the solution script.`;

// ---------------------- CLOUD SQL & AUTH ENDPOINTS ----------------------
app.post("/api/users/register", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, name, uid } = req.user!;
    const user = await getOrCreateUser(uid, email || "", name || "");
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/assistant/logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.user!;
    const logs = await getAssistantLogs(uid);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/assistant/log", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.user!;
    const { prompt, response, mode } = req.body;
    const log = await createAssistantLog(uid, prompt, response, mode || "text");
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------- GEMINI API ENDPOINTS ----------------------

// Multi-turn chat with Jarvis
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, model, thinkingMode, grounding, userLocation, language, customSystemInstruction } = req.body;
    const ai = getGeminiClient();

    let selectedModel = model || "gemini-3.5-flash";
    if (thinkingMode) {
      selectedModel = "gemini-3.1-pro-preview";
    }

    let sysInstruction = customSystemInstruction || JARVIS_SYSTEM_INSTRUCTION;
    if (language) {
      sysInstruction += `\n\nCRITICAL: Please respond and speak in the language: ${language}. If the user speaks in ${language} or English, understand it and reply in ${language}.`;
    }

    const config: any = {
      systemInstruction: sysInstruction,
    };

    if (thinkingMode && selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = {
        thinkingBudget: 1024,
      };
      config.thinkingLevel = "HIGH";
    }

    const tools: any[] = [];
    if (grounding === "search") {
      tools.push({ googleSearch: {} });
    } else if (grounding === "maps") {
      tools.push({ googleMaps: {} });
      if (userLocation) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
        };
      }
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    const contents = messages.map((m: any) => {
      const parts: any[] = [];
      if (m.inlineData) {
        parts.push({
          inlineData: {
            data: m.inlineData.data,
            mimeType: m.inlineData.mimeType,
          },
        });
      }
      parts.push({ text: m.content || m.text || "" });
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: contents,
        config: config,
      });
    } catch (apiError: any) {
      console.warn("Primary chat model call failed, checking fallback:", apiError);
      if (selectedModel !== "gemini-3.5-flash") {
        console.info("Falling back to gemini-3.5-flash...");
        selectedModel = "gemini-3.5-flash";
        if (config.thinkingConfig) delete config.thinkingConfig;
        if (config.thinkingLevel) delete config.thinkingLevel;
        
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: contents,
          config: config,
        });
      } else {
        throw apiError;
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;

    res.json({
      text: response.text,
      groundingChunks,
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    let errMsg = error.message || "An error occurred during generation.";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
      errMsg = "Sir, we have exceeded the central grid's Gemini API quota limit (429 RESOURCE_EXHAUSTED). To resolve this, you can configure your own API key under Settings > Secrets, or please try again later once the reset window passes.";
    }
    res.status(500).json({ error: errMsg });
  }
});

// Text-to-Speech
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voiceName, language } = req.body;
    const ai = getGeminiClient();

    const targetLang = language || "English";
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Speak in a polite, highly helpful, butler-like ${targetLang} voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Zephyr" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Failed to generate text-to-speech audio stream." });
    }
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    let errMsg = error.message || "An error occurred during TTS generation.";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
      errMsg = "Sir, we have exceeded the central grid's Gemini API quota limit (429 RESOURCE_EXHAUSTED) for speech generation. Please configure your own API key in Settings > Secrets or try again later.";
    }
    res.status(500).json({ error: errMsg });
  }
});

// Image Generation & Editing
app.post("/api/gemini/image", async (req, res) => {
  try {
    const { prompt, model, aspectRatio, imageSize, base64Image, mimeType } = req.body;
    const ai = getGeminiClient();

    const selectedModel = model || "gemini-3.1-flash-image";

    const parts: any[] = [];
    if (base64Image && mimeType) {
      parts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio || "1:1",
        imageSize: imageSize || "1K",
      },
    };

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: { parts },
      config: config,
    });

    let imageUrl: string | null = null;
    let fallbackText: string | null = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        } else if (part.text) {
          fallbackText = part.text;
        }
      }
    }

    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(500).json({ error: fallbackText || "No image could be generated by the model." });
    }
  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    let errMsg = error.message || "An error occurred during image generation.";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
      errMsg = "Sir, we have exceeded the central grid's Gemini API quota limit (429 RESOURCE_EXHAUSTED) for image generation. Please configure your own API key in Settings > Secrets or try again later.";
    }
    res.status(500).json({ error: errMsg });
  }
});

// Audio Transcription
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { base64Audio, mimeType } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType || "audio/wav",
          },
        },
        "Transcribe this audio clip exactly. Return only the plain transcribed text. If you hear no words, reply with an empty string.",
      ],
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during audio transcription." });
  }
});

// Image Analysis (Vision)
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, base64Image, mimeType, model } = req.body;
    const ai = getGeminiClient();

    let selectedModel = model || "gemini-3.5-flash";

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || "image/png",
            },
          },
          prompt || "Analyze this image in detail and describe what you see, particularly looking for details, labels, or structures.",
        ],
      });
    } catch (apiError: any) {
      console.warn("Primary vision model call failed, trying fallback:", apiError);
      if (selectedModel !== "gemini-3.5-flash") {
        selectedModel = "gemini-3.5-flash";
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType || "image/png",
              },
            },
            prompt || "Analyze this image in detail and describe what you see, particularly looking for details, labels, or structures.",
          ],
        });
      } else {
        throw apiError;
      }
    }

    res.json({ text: response.text, modelUsed: selectedModel });
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during image analysis." });
  }
});

// ---------------------- HTTP SERVER + WS SERVER INTEGRATION ----------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade for Live API
server.on("upgrade", (request, socket, head) => {
  try {
    const url = request.url ? new URL(request.url, "http://localhost") : null;
    const pathname = url ? url.pathname : "";
    if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // DO NOT destroy socket on else path, so Vite dev server can handle its own HMR WebSocket upgrades!
  } catch (err) {
    console.error("Upgrade parsing error:", err);
    socket.destroy();
  }
});

// WebSocket connection for Live API real-time audio interaction
wss.on("connection", async (clientWs, request) => {
  console.log("Client established connection to Jarvis Live WebSocket.");
  let session: any = null;

  try {
    const url = new URL(request.url || "", "http://localhost");
    const language = url.searchParams.get("language") || "English";
    const voice = url.searchParams.get("voice") || "Zephyr";
    const customInstruction = url.searchParams.get("systemInstruction") || "";

    let finalInstruction = customInstruction || "You are JARVIS, Tony Stark's personal AI butler. Speak directly, confidently, wittily, and keep responses concise. Always refer to the user as Sir or Boss.";
    finalInstruction += `\n\nCRITICAL: Please respond and speak in the language: ${language}. If the user speaks in ${language} or English, understand it and reply in ${language}.`;

    const ai = getGeminiClient();
    session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice === "Charon" ? "Aoede" : voice === "Despina" ? "Kore" : voice } },
        },
        systemInstruction: finalInstruction,
      },
      callbacks: {
        onmessage: (message) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;

          if (audio) {
            clientWs.send(JSON.stringify({ type: "audio", audio }));
          }
          if (text) {
            clientWs.send(JSON.stringify({ type: "text", text }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted", interrupted: true }));
          }
        },
      },
    });

    clientWs.on("message", (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (err) {
        console.error("Error handling incoming live WS audio packet:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Jarvis Live WebSocket connection closed.");
      if (session) {
        session.close();
      }
    });

  } catch (error: any) {
    console.error("Failed to boot Gemini Live session:", error);
    let errMsg = error.message || "An error occurred during Live session boot.";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
      errMsg = "Sir, we have exceeded the central grid's Gemini API quota limit (429 RESOURCE_EXHAUSTED) for speech connection. Please configure your own API key under Settings > Secrets, or please try again later once the reset window passes.";
    }
    // Send error message to client before closing the socket to avoid unhandled WebSocket crashes
    try {
      clientWs.send(JSON.stringify({ type: "error", message: errMsg }), () => {
        clientWs.close();
      });
    } catch (sendErr) {
      console.error("Failed to send WebSocket error message:", sendErr);
      clientWs.close();
    }
  }
});

// Vite Middleware & SPA Static fallback routing
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Jarvis Central Grid Online on http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Jarvis Central Grid Failed to Boot:", err);
});
