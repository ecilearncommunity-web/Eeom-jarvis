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
(globalThis as any).WebSocket = WebSocket;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization of Gemini Client for stability
let defaultAiClient: GoogleGenAI | null = null;
let backupAiClient: GoogleGenAI | null = null;

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const trimmedKey = customApiKey?.trim();
  
  // 1. If no custom API key is passed, determine the default key to use
  if (!trimmedKey) {
    let defaultKey = process.env.GEMINI_API_KEY;
    if (!defaultKey && process.env.GEMINI_API_KEY_BAC) {
      console.info("Using process.env.GEMINI_API_KEY_BAC as default key fallback...");
      defaultKey = process.env.GEMINI_API_KEY_BAC;
    }
    
    if (!defaultKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel in the Settings menu of the Google AI Studio UI.");
    }
    
    if (!defaultAiClient) {
      defaultAiClient = new GoogleGenAI({
        apiKey: defaultKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return defaultAiClient;
  }

  // 2. If the custom key is exactly process.env.GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY && trimmedKey === process.env.GEMINI_API_KEY.trim()) {
    if (!defaultAiClient) {
      defaultAiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return defaultAiClient;
  }

  // 3. If the custom key is exactly process.env.GEMINI_API_KEY_BAC
  if (process.env.GEMINI_API_KEY_BAC && trimmedKey === process.env.GEMINI_API_KEY_BAC.trim()) {
    if (!backupAiClient) {
      backupAiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY_BAC,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return backupAiClient;
  }

  // 4. Any other custom API key provided by the user in-app (dynamic client creation)
  return new GoogleGenAI({
    apiKey: trimmedKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Wrapper function to automatically fallback to GEMINI_API_KEY_BAC if a rate limit/quota error is detected on the primary key, and the user hasn't provided a custom key
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: { model: string; contents: any; config?: any },
  customKey?: string
) {
  try {
    return await ai.models.generateContent(options);
  } catch (err: any) {
    const isQuotaError = (e: any) => {
      const msg = (e?.message || "").toLowerCase();
      return msg.includes("quota") || msg.includes("exhausted") || msg.includes("429") || msg.includes("limit");
    };
    if (isQuotaError(err) && process.env.GEMINI_API_KEY_BAC && !customKey) {
      console.info("Quota exceeded on primary key during generateContent. Retrying with backup key...");
      const backupAi = getGeminiClient(process.env.GEMINI_API_KEY_BAC);
      return await backupAi.models.generateContent(options);
    }
    throw err;
  }
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

// ---------------------- YOUTUBE SCRAPER & SEARCH API ----------------------

function parseYoutubeVideos(html: string) {
  const videos: any[] = [];
  const parts = html.split('"videoRenderer":');
  
  for (let i = 1; i < parts.length && videos.length < 10; i++) {
    const part = parts[i];
    
    // Extract videoId
    const videoIdMatch = part.match(/"videoId"\s*:\s*"([^"]+)"/);
    if (!videoIdMatch) continue;
    const videoId = videoIdMatch[1];
    
    // Extract title
    let title = "";
    const titlePart = part.split('"title":')[1];
    if (titlePart) {
      const textMatch = titlePart.match(/"text"\s*:\s*"([^"]+)"/);
      if (textMatch) {
        try {
          // Replace escaped quotes and backslashes
          const cleanText = textMatch[1].replace(/\\"/g, '"');
          title = JSON.parse(`"${cleanText}"`);
        } catch {
          title = textMatch[1];
        }
      }
    }
    
    // Extract channel/author
    let channel = "";
    const ownerPart = part.split('"ownerText":')[1] || part.split('"longBylineText":')[1];
    if (ownerPart) {
      const channelMatch = ownerPart.match(/"text"\s*:\s*"([^"]+)"/);
      if (channelMatch) {
        try {
          const cleanChannel = channelMatch[1].replace(/\\"/g, '"');
          channel = JSON.parse(`"${cleanChannel}"`);
        } catch {
          channel = channelMatch[1];
        }
      }
    }
    
    // Extract duration
    let duration = "";
    const lengthPart = part.split('"lengthText":')[1];
    if (lengthPart) {
      const lenMatch = lengthPart.match(/"simpleText"\s*:\s*"([^"]+)"/);
      if (lenMatch) {
        duration = lenMatch[1];
      }
    }

    let thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    
    videos.push({
      videoId,
      title: title || "YouTube Video",
      channel: channel || "YouTube Creator",
      duration: duration || "Live/Unknown",
      thumbnail
    });
  }
  return videos;
}

app.get("/api/youtube/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube responded with status ${response.status}`);
    }

    const html = await response.text();
    let videos = parseYoutubeVideos(html);

    // Fallback if scraping didn't find any well-structured videoRenderers
    if (videos.length === 0) {
      const watchMatches = html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
      const uniqueIds = Array.from(new Set(Array.from(watchMatches).map(m => m[1]))).slice(0, 5);
      
      videos = uniqueIds.map(id => ({
        videoId: id,
        title: `${query} (Search Result)`,
        channel: "YouTube",
        duration: "Stream",
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      }));
    }

    res.json({ videos });
  } catch (error: any) {
    console.error("YouTube search backend error:", error);
    res.status(500).json({ error: error.message, videos: [] });
  }
});

// ---------------------- GEMINI API ENDPOINTS ----------------------

// Multi-turn chat with Jarvis
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, model, thinkingMode, grounding, userLocation, language, customSystemInstruction, apiConnections } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);

    let selectedModel = model || "gemini-3.5-flash";
    if (thinkingMode) {
      selectedModel = "gemini-3.1-pro-preview";
    }

    let sysInstruction = customSystemInstruction || JARVIS_SYSTEM_INSTRUCTION;

    if (apiConnections && Array.isArray(apiConnections) && apiConnections.length > 0) {
      sysInstruction += `\n\nEXTERNAL API CONNECTIONS AVAILABLE:\n`;
      apiConnections.forEach((conn: any) => {
        sysInstruction += `- API ID: "${conn.id}"\n  Name: ${conn.name}\n  Base URL: ${conn.baseUrl}\n  Description/Use Case: ${conn.description}\n`;
      });
      sysInstruction += `\nYou have a tool called 'query_external_api'. When the user asks to check data from one of the above websites/APIs, you MUST call this tool, providing the correct 'api_id', 'endpoint_path' (e.g. '/orders', must start with '/'), and 'method' (GET/POST). Do NOT make up the data. Fetch it using the tool first.`;
    }

    // Inject precise real-time temporal context (forcing year 2026 to fix outdated model responses)
    const containerTime = new Date();
    const targetDate = new Date(containerTime);
    if (targetDate.getFullYear() < 2026) {
      targetDate.setFullYear(2026);
    }

    const formatInTZ = (date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) => {
      try {
        return date.toLocaleString("en-US", { ...options, timeZone });
      } catch (e) {
        return date.toLocaleString("en-US", options);
      }
    };

    const bstDate = formatInTZ(targetDate, "Asia/Dhaka", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const bstTime = formatInTZ(targetDate, "Asia/Dhaka", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

    const pdtDate = formatInTZ(targetDate, "America/Los_Angeles", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const pdtTime = formatInTZ(targetDate, "America/Los_Angeles", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

    const utcDate = formatInTZ(targetDate, "UTC", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const utcTime = formatInTZ(targetDate, "UTC", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

    sysInstruction += `\n\nCRITICAL REAL-TIME TEMPORAL CONTEXT (YEAR 2026):
- Bangladesh Standard Time (BST, Asia/Dhaka): Today is ${bstDate}, Current Time: ${bstTime}
- Pacific Standard Time (PST/PDT, America/Los_Angeles): Today is ${pdtDate}, Current Time: ${pdtTime}
- Universal Time (UTC): Today is ${utcDate}, Current Time: ${utcTime}
- Year check: The current year is 2026.
- Directives:
  1. The user resides in Bangladesh. When they ask "আজকে কি বার?", "বাংলাদেশের সময় কত?", "বাংলাদেশ সময় কত?" or similar, you MUST answer based on the "Bangladesh Standard Time" context above (i.e., today is ${bstDate}, time is ${bstTime}).
  2. If the user asks about the gold price (XAU/USD), currency exchange rates, live share market index, or recent 2026 global news, you MUST use the googleSearch tool to perform a Google Search query for the absolute latest 2026 rates (e.g. search "current gold rate XAU USD 2026"). Reply with the actual current rates fetched and cite the sources.`;

    if (language) {
      sysInstruction += `\n\nCRITICAL: Please respond and speak in the language: ${language}. If the user speaks in ${language} or English, understand it and reply in ${language}.`;
    }

    const tools: any[] = [];
    const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
    const lastContent = lastMessage ? (lastMessage.content || lastMessage.text || "").toLowerCase() : "";

    const searchKeywords = [
      "search", "find", "google", "news", "weather", "today", "live", "browse", "internet", "website", "current", "latest", "recent", "time", "date", "gold", "xau", "rate", "price", "stock", "market",
      "সার্চ", "খবর", "আজকের", "লাইভ", "আবহাওয়া", "ব্রাউজ", "ইন্টারনেট", "ওয়েবসাইট", "খোজ", "খোঁজ", "সময়", "তারিখ", "স্বর্ণ", "সোনা", "দাম", "প্রাইজ", "প্রাইস", "রেট", "শেয়ার", "মার্কেট"
    ];

    const needsSearch = searchKeywords.some(kw => lastContent.includes(kw));

    if (grounding === "search" || needsSearch || grounding === "none" || !grounding) {
      if (grounding !== "maps") {
        tools.push({ googleSearch: {} });
        sysInstruction += `\n\nREAL-TIME DATA DIRECTIVE:\n- You are connected to Google Search in real-time.\n- Whenever the user asks about recent events, current weather, latest news, market trends, stock prices, international updates, e-commerce products, or any live information, you MUST use Google Search to fetch and verify the absolute latest facts.\n- NEVER use old or outdated pre-trained knowledge if the user expects live data. Bring details from actual websites and cite them naturally.`;
      }
    }

    // Custom play_video_on_screen tool for dynamic video playback on screen
    const playVideoFunctionDeclaration = {
      name: "play_video_on_screen",
      description: "Plays a YouTube video or music track on the screen matching a search query or song name.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description: "The name of the song, artist, video or search query to play on the YouTube player widget, e.g. Heeriye song."
          }
        },
        required: ["query"]
      }
    };

    const queryExternalApiDeclaration = {
      name: "query_external_api",
      description: "Fetches, creates, or updates data from one of the configured external API connections (e.g. WordPress, Laravel, Shopify).",
      parameters: {
        type: "OBJECT",
        properties: {
          api_id: { type: "STRING", description: "The ID of the API connection to use." },
          endpoint_path: { type: "STRING", description: "The path of the endpoint to hit (e.g. /wp-json/wc/v3/orders)." },
          method: { type: "STRING", description: "HTTP Method: GET, POST, PUT, DELETE" },
          body: { type: "STRING", description: "Optional JSON string body for POST/PUT requests." }
        },
        required: ["api_id", "endpoint_path", "method"]
      }
    };

    const executeLocalCommandDeclaration = {
      name: "execute_local_command",
      description: "Executes a shell command on the local Windows PC (e.g. 'start chrome', 'calc', 'shutdown /s', 'dir'). ONLY WORKS when running locally via Electron.",
      parameters: {
        type: "OBJECT",
        properties: {
          command: { type: "STRING", description: "The Windows command to execute." }
        },
        required: ["command"]
      }
    };

    tools.push({ functionDeclarations: [playVideoFunctionDeclaration, queryExternalApiDeclaration, executeLocalCommandDeclaration] });

    const config: any = {
      systemInstruction: sysInstruction,
    };

    if (thinkingMode && selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = {
        thinkingBudget: 1024,
      };
      config.thinkingLevel = "HIGH";
    }

    if (grounding === "maps") {
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
      config.toolConfig = {
        includeServerSideToolInvocations: true
      };
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
      response = await generateContentWithFallback(ai, {
        model: selectedModel,
        contents: contents,
        config: config,
      }, customKey);

      // Handle internal tool execution (query_external_api)
      if (response.functionCalls && response.functionCalls.some((c: any) => c.name === "query_external_api")) {
        const call = response.functionCalls.find((c: any) => c.name === "query_external_api");
        const { api_id, endpoint_path, method, body } = call.args;
        let fetchResult = "";

        try {
          const conn = apiConnections?.find((c: any) => c.id === api_id);
          if (!conn) throw new Error("API Connection ID not found.");
          
          let fullUrl = conn.baseUrl;
          if (endpoint_path && endpoint_path.startsWith("/")) {
            fullUrl += endpoint_path;
          } else if (endpoint_path) {
            fullUrl += "/" + endpoint_path;
          }

          const headers: any = {};
          if (conn.authHeaderName && conn.authHeaderValue) {
            headers[conn.authHeaderName] = conn.authHeaderValue;
          }
          headers["Content-Type"] = "application/json";

          const fetchOptions: any = { method: method || "GET", headers };
          if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
            fetchOptions.body = body;
          }

          const fetchReq = await fetch(fullUrl, fetchOptions);
          if (!fetchReq.ok) throw new Error(`HTTP Error: ${fetchReq.status}`);
          fetchResult = await fetchReq.text();
        } catch (e: any) {
          fetchResult = `Failed to fetch data: ${e.message}`;
        }

        // Add the model's call and the tool's response to the conversation
        contents.push({
          role: "model",
          parts: [{ functionCall: call }]
        });
        contents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: "query_external_api",
              response: { result: fetchResult }
            }
          }]
        });

        // Call the model again to generate the final response
        response = await generateContentWithFallback(ai, {
          model: selectedModel,
          contents: contents,
          config: config,
        }, customKey);
      } else if (response.functionCalls && response.functionCalls.some((c: any) => c.name === "execute_local_command")) {
        const call = response.functionCalls.find((c: any) => c.name === "execute_local_command");
        const { command } = call.args;
        let execResult = "";

        try {
          const { exec } = require("child_process");
          execResult = await new Promise((resolve) => {
            exec(command, (error: any, stdout: string, stderr: string) => {
              if (error) resolve(`Error: ${error.message}\nStderr: ${stderr}`);
              else resolve(`Success:\n${stdout}`);
            });
          });
        } catch (e: any) {
          execResult = `Failed to execute: ${e.message}`;
        }

        contents.push({
          role: "model",
          parts: [{ functionCall: call }]
        });
        contents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: "execute_local_command",
              response: { result: execResult }
            }
          }]
        });

        response = await generateContentWithFallback(ai, {
          model: selectedModel,
          contents: contents,
          config: config,
        }, customKey);
      }

    } catch (apiError: any) {
      console.warn("Primary chat model call failed, checking fallback:", apiError);
      
      if (selectedModel !== "gemini-3.5-flash" && selectedModel !== "gemini-3.1-flash-lite") {
        console.info("Falling back to gemini-3.5-flash...");
        selectedModel = "gemini-3.5-flash";
        if (config.thinkingConfig) delete config.thinkingConfig;
        if (config.thinkingLevel) delete config.thinkingLevel;
        
        try {
          response = await generateContentWithFallback(ai, {
            model: selectedModel,
            contents: contents,
            config: config,
          }, customKey);
        } catch (fallbackError: any) {
          console.warn("Fallback to gemini-3.5-flash failed, checking further fallback to gemini-3.1-flash-lite:", fallbackError);
          selectedModel = "gemini-3.1-flash-lite";
          response = await generateContentWithFallback(ai, {
            model: selectedModel,
            contents: contents,
            config: config,
          }, customKey);
        }
      } else if (selectedModel === "gemini-3.5-flash") {
        // If gemini-3.5-flash was selected and failed (e.g., quota exceeded), fall back to gemini-3.1-flash-lite
        console.info("gemini-3.5-flash failed, trying gemini-3.1-flash-lite as secondary resilient fallback...");
        selectedModel = "gemini-3.1-flash-lite";
        response = await generateContentWithFallback(ai, {
          model: selectedModel,
          contents: contents,
          config: config,
        }, customKey);
      } else {
        throw apiError;
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;
    const functionCalls = response.functionCalls || null;

    res.json({
      text: response.text || "",
      functionCalls,
      groundingChunks,
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    let errMsg = error.message || "An error occurred during generation.";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
      errMsg = `⚠️ সেন্ট্রাল গ্রিড এপিআই কোটা শেষ (API QUOTA EXHAUSTED) ⚠️

দুঃখিত স্যার, আমাদের শেয়ারড ফ্রি এপিআই কোটা লিমিট শেষ হয়ে গেছে। আপনি সম্পূর্ণ বিনামূল্যে আপনার নিজস্ব API Key তৈরি করে এটি সহজে সমাধান করতে পারেন:
১. Google AI Studio ওয়েবসাইটে যান: https://aistudio.google.com/ এবং একটি ফ্রি Gemini API Key তৈরি করুন।
২. এই অ্যাপ্লিকেশনের ডানদিকের উপরে Settings (গিয়ার আইকন ⚙️)-এ ক্লিক করুন।
৩. Voice Assistant ট্যাবের অধীনে "🔑 GEMINI LIVE API KEY" ইনপুটে আপনার এপিআই কি-টি পেস্ট করুন।
৪. নিচে স্ক্রল করে "Save System Config" বাটনে ক্লিক করুন।

------------------

Sir, the shared free API quota limit has been exceeded. To resolve this, configure your own free Gemini API key:
1. Go to Google AI Studio (https://aistudio.google.com/) and create a free API key.
2. Click the Settings gear icon (⚙️) on the top-right in this app.
3. Paste your key in the "🔑 GEMINI LIVE API KEY" input under the "Voice Assistant" tab.
4. Scroll down and click "Save System Config".`;
    }
    res.status(500).json({ error: errMsg });
  }
});

// Text-to-Speech
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voiceName, language } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);

    const targetLang = language || "English";
    const response = await generateContentWithFallback(ai, {
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
    }, customKey);

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
      errMsg = `⚠️ সেন্ট্রাল গ্রিড স্পিচ কোটা শেষ (TTS QUOTA EXHAUSTED) ⚠️

দুঃখিত স্যার, আমাদের শেয়ারড স্পিচ এপিআই কোটা লিমিট শেষ হয়ে গেছে। দয়া করে সেটিংস (গিয়ার আইকন ⚙️) থেকে আপনার নিজস্ব API Key যোগ করুন।

Sir, speech API quota limit exceeded. Please configure your own Gemini API key in System Settings (gear icon ⚙️) to continue.`;
    }
    res.status(500).json({ error: errMsg });
  }
});

// Image Generation & Editing
app.post("/api/gemini/image", async (req, res) => {
  try {
    const { prompt, model, aspectRatio, imageSize, base64Image, mimeType } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);

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

    const response = await generateContentWithFallback(ai, {
      model: selectedModel,
      contents: { parts },
      config: config,
    }, customKey);

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
      errMsg = `⚠️ সেন্ট্রাল গ্রিড ইমেজ কোটা শেষ (IMAGE GEN QUOTA EXHAUSTED) ⚠️

দুঃখিত স্যার, আমাদের শেয়ারড ইমেজ জেনারেট এপিআই কোটা লিমিট শেষ হয়ে গেছে। দয়া করে সেটিংস (গিয়ার আইকন ⚙️) থেকে আপনার নিজস্ব API Key যোগ করুন।

Sir, image generation API quota limit exceeded. Please configure your own Gemini API key in System Settings (gear icon ⚙️) to continue.`;
    }
    res.status(500).json({ error: errMsg });
  }
});

// Audio Transcription
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { base64Audio, mimeType } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);

    const response = await generateContentWithFallback(ai, {
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
    }, customKey);

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
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);

    let selectedModel = model || "gemini-3.5-flash";

    let response;
    try {
      response = await generateContentWithFallback(ai, {
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
      }, customKey);
    } catch (apiError: any) {
      console.warn("Primary vision model call failed, trying fallback:", apiError);
      if (selectedModel !== "gemini-3.5-flash") {
        selectedModel = "gemini-3.5-flash";
        response = await generateContentWithFallback(ai, {
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
        }, customKey);
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

// ---------------------- WEBHOOK & ALERTS (PROACTIVE UPDATES) ----------------------
const sseClients = new Set<any>();

app.get("/api/notifications/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  sseClients.add(res);
  
  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.post("/api/webhook/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  
  console.log(`Received webhook for connection ${id}:`, payload);
  
  const alertMsg = JSON.stringify({
    type: "webhook_alert",
    connectionId: id,
    data: payload,
    timestamp: new Date().toISOString()
  });

  sseClients.forEach(client => {
    client.write(`data: ${alertMsg}\n\n`);
  });

  res.json({ success: true, message: "Webhook received and broadcasted." });
});

// ---------------------- HTTP SERVER + WS SERVER INTEGRATION ----------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade for Live API
server.on("upgrade", (request, socket, head) => {
  try {
    const urlStr = request.url || "";
    const pathname = urlStr.split("?")[0];
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
  let isSetup = false;

  clientWs.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString());

      if (payload.type === "setup") {
        if (isSetup) return;
        isSetup = true;

        const language = payload.language || "English";
        const voice = payload.voice || "Zephyr";
        const customInstruction = payload.systemInstruction || "";
        const apiKey = payload.apiKey || "";
        const apiConnections = payload.apiConnections || [];

        let finalInstruction = customInstruction || "You are JARVIS, Tony Stark's personal AI butler. Speak directly, confidently, wittily, and keep responses concise. Always refer to the user as Sir or Boss.";
        finalInstruction += `\n\nCRITICAL: Please respond and speak in the language: ${language}. If the user speaks in ${language} or English, understand it and reply in ${language}.`;
        
        if (apiConnections && Array.isArray(apiConnections) && apiConnections.length > 0) {
          finalInstruction += `\n\nEXTERNAL API CONNECTIONS AVAILABLE:\n`;
          apiConnections.forEach((conn: any) => {
            finalInstruction += `- API ID: "${conn.id}"\n  Name: ${conn.name}\n  Base URL: ${conn.baseUrl}\n  Description/Use Case: ${conn.description}\n`;
          });
          finalInstruction += `\nYou have a tool called 'query_external_api'. When the user asks to check data from one of the above websites/APIs, you MUST call this tool, providing the correct 'api_id', 'endpoint_path' (e.g. '/orders'), and 'method' (GET/POST). Fetch it using the tool first before replying.`;
        }
        
        finalInstruction += `\n\nIMPORTANT: You have tools/functions available: 'play_video_on_screen', 'open_web', and 'generate_image'. When the user asks you to play a video, watch a video, play music, open a website, browse a site, or generate an image, you MUST call the appropriate tool. Do NOT just say you are doing it; call the tool to actually trigger it on screen!`;

        const liveTools: any = [
          { googleSearch: {} },
          {
            functionDeclarations: [
              {
                name: "play_video_on_screen",
                description: "Plays a YouTube video or music track on the screen matching a search query or song name.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    query: {
                      type: "STRING",
                      description: "The name of the song, artist, video or search query to play on the YouTube player widget, e.g. Heeriye song."
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "query_external_api",
                description: "Fetches, creates, or updates data from one of the configured external API connections (e.g. WordPress, Laravel, Shopify).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    api_id: { type: "STRING", description: "The ID of the API connection to use." },
                    endpoint_path: { type: "STRING", description: "The path of the endpoint to hit (e.g. /wp-json/wc/v3/orders)." },
                    method: { type: "STRING", description: "HTTP Method: GET, POST, PUT, DELETE" },
                    body: { type: "STRING", description: "Optional JSON string body for POST/PUT requests." }
                  },
                  required: ["api_id", "endpoint_path", "method"]
                }
              },
              {
                name: "execute_local_command",
                description: "Executes a shell command on the local Windows PC (e.g. 'start chrome', 'calc', 'shutdown /s', 'dir'). ONLY WORKS when running locally via Electron.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    command: { type: "STRING", description: "The Windows command to execute." }
                  },
                  required: ["command"]
                }
              },
              {
                name: "open_web",
                description: "Opens a website or searches Google with the given URL.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    url: {
                      type: "STRING",
                      description: "The exact URL of the website to open, or a google search URL with query parameter."
                    }
                  },
                  required: ["url"]
                }
              },
              {
                name: "generate_image",
                description: "Generates or draws an image based on a prompt.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    prompt: {
                      type: "STRING",
                      description: "A detailed description in English of the image to generate."
                    }
                  },
                  required: ["prompt"]
                }
              }
            ]
          }
        ];

        try {
          let ai = getGeminiClient(apiKey);
          try {
            session = await ai.live.connect({
              model: "gemini-3.1-flash-live-preview",
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice === "Charon" ? "Charon" : voice === "Despina" ? "Kore" : voice } },
                },
                systemInstruction: finalInstruction,
                outputAudioTranscription: {},
                tools: liveTools,
              },
              callbacks: {
                onmessage: async (message) => {
                  let audio = null;
                  let text = "";
                  if (message.serverContent?.modelTurn?.parts) {
                    for (const part of message.serverContent.modelTurn.parts) {
                      if (part.inlineData?.data) {
                        audio = part.inlineData.data;
                      }
                      if (part.text) {
                        text += part.text;
                      }
                    }
                  }

                  if (message.toolCall) {
                    console.log("Jarvis Live API received toolCall:", JSON.stringify(message.toolCall));
                    // Send toolCall to the client ws so the frontend can execute it in real-time!
                    clientWs.send(JSON.stringify({ type: "toolCall", toolCall: message.toolCall }));

                    if (message.toolCall.functionCalls) {
                      const functionResponses = await Promise.all(message.toolCall.functionCalls.map(async (call: any) => {
                        if (call.name === "query_external_api") {
                          const { api_id, endpoint_path, method, body } = call.args;
                          let fetchResult = "";
                          try {
                            const conn = apiConnections?.find((c: any) => c.id === api_id);
                            if (!conn) throw new Error("API Connection ID not found.");
                            let fullUrl = conn.baseUrl;
                            if (endpoint_path && endpoint_path.startsWith("/")) {
                              fullUrl += endpoint_path;
                            } else if (endpoint_path) {
                              fullUrl += "/" + endpoint_path;
                            }
                            const headers: any = {};
                            if (conn.authHeaderName && conn.authHeaderValue) {
                              headers[conn.authHeaderName] = conn.authHeaderValue;
                            }
                            headers["Content-Type"] = "application/json";
                            
                            const fetchOptions: any = { method: method || "GET", headers };
                            if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
                              fetchOptions.body = body;
                            }
                            
                            const fetchReq = await fetch(fullUrl, fetchOptions);
                            if (!fetchReq.ok) throw new Error(`HTTP Error: ${fetchReq.status}`);
                            fetchResult = await fetchReq.text();
                          } catch (e: any) {
                            fetchResult = `Failed to fetch data: ${e.message}`;
                          }
                          return {
                            id: call.id,
                            response: { result: fetchResult }
                          };
                        } else if (call.name === "execute_local_command") {
                          const { command } = call.args;
                          let execResult = "";
                          try {
                            const { exec } = require("child_process");
                            execResult = await new Promise((resolve) => {
                              exec(command, (error: any, stdout: string, stderr: string) => {
                                if (error) resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                                else resolve(`Success:\n${stdout}`);
                              });
                            });
                          } catch (e: any) {
                            execResult = `Failed to execute: ${e.message}`;
                          }
                          return {
                            id: call.id,
                            response: { result: execResult }
                          };
                        } else {
                          return {
                            id: call.id,
                            response: { output: { success: true } }
                          };
                        }
                      }));

                      session.send({
                        toolResponse: {
                          functionResponses
                        }
                      });
                    }
                  }

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
          } catch (liveError: any) {
            const isQuotaError = (err: any) => {
              const msg = (err?.message || "").toLowerCase();
              return msg.includes("quota") || msg.includes("exhausted") || msg.includes("429") || msg.includes("limit");
            };
            if (isQuotaError(liveError) && process.env.GEMINI_API_KEY_BAC && !apiKey) {
              console.info("Quota exceeded on primary key for Live API. Retrying with GEMINI_API_KEY_BAC...");
              ai = getGeminiClient(process.env.GEMINI_API_KEY_BAC);
              session = await ai.live.connect({
                model: "gemini-3.1-flash-live-preview",
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice === "Charon" ? "Charon" : voice === "Despina" ? "Kore" : voice } },
                  },
                  systemInstruction: finalInstruction,
                  outputAudioTranscription: {},
                  tools: liveTools,
                },
                callbacks: {
                  onmessage: (message) => {
                    let audio = null;
                    let text = "";
                    if (message.serverContent?.modelTurn?.parts) {
                      for (const part of message.serverContent.modelTurn.parts) {
                        if (part.inlineData?.data) {
                          audio = part.inlineData.data;
                        }
                        if (part.text) {
                          text += part.text;
                        }
                      }
                    }

                    if (message.toolCall) {
                      console.log("Jarvis Live API Backup received toolCall:", JSON.stringify(message.toolCall));
                      // Send toolCall to the client ws so the frontend can execute it in real-time!
                      clientWs.send(JSON.stringify({ type: "toolCall", toolCall: message.toolCall }));

                      // Immediately respond back to session so the model is satisfied and continues
                      if (message.toolCall.functionCalls) {
                        const functionResponses = message.toolCall.functionCalls.map((call: any) => ({
                          id: call.id,
                          response: { output: { success: true } }
                        }));
                        session.send({
                          toolResponse: {
                            functionResponses
                          }
                        });
                      }
                    }

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
            } else {
              throw liveError;
            }
          }

          // Inform client that setup is successful and we're ready
          clientWs.send(JSON.stringify({ type: "ready" }));

        } catch (error: any) {
          console.error("Failed to boot Gemini Live session:", error);
          let errMsg = error.message || "An error occurred during Live session boot.";
          if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("limit")) {
            errMsg = `⚠️ সেন্ট্রাল গ্রিড লাইভ স্পিচ কোটা শেষ (LIVE SPEECH QUOTA EXHAUSTED) ⚠️

দুঃখিত স্যার, আমাদের শেয়ারড লাইভ স্পিচ এপিআই কোটা লিমিট শেষ হয়ে গেছে। আপনি সম্পূর্ণ বিনামূল্যে আপনার নিজস্ব API Key তৈরি করে এটি সহজে সমাধান করতে পারেন:
১. Google AI Studio ওয়েবসাইটে যান: https://aistudio.google.com/ এবং একটি ফ্রি Gemini API Key তৈরি করুন।
২. এই অ্যাপ্লিকেশনের ডানদিকের উপরে Settings (গিয়ার আইকন ⚙️)-এ ক্লিক করুন।
৩. Voice Assistant ট্যাবের অধীনে "🔑 GEMINI LIVE API KEY" ইনপুটে আপনার এপিআই কি-টি পেস্ট করুন।
৪. নিচে স্ক্রল করে "Save System Config" বাটনে ক্লিক করুন।

------------------

Sir, the shared Live speech API quota limit has been exceeded. To resolve this, configure your own free Gemini API key:
1. Go to Google AI Studio (https://aistudio.google.com/) and create a free API key.
2. Click the Settings gear icon (⚙️) on the top-right in this app.
3. Paste your key in the "🔑 GEMINI LIVE API KEY" input under the "Voice Assistant" tab.
4. Scroll down and click "Save System Config".`;
          }
          try {
            clientWs.send(JSON.stringify({ type: "error", message: errMsg }), () => {
              clientWs.close();
            });
          } catch (sendErr) {
            console.error("Failed to send WebSocket error message:", sendErr);
            clientWs.close();
          }
        }
      } else if (payload.audio) {
        if (session) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      }
    } catch (err) {
      console.error("Error handling incoming live WS packet:", err);
    }
  });

  clientWs.on("close", () => {
    console.log("Jarvis Live WebSocket connection closed.");
    if (session) {
      session.close();
    }
  });
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
