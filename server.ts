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

// Highly resilient content generator that sequentially falls back to different public model variations
// to ensure standard user keys (which lack access to experimental or unreleased models) never fail.
async function generateContentWithFallbackChain(
  ai: GoogleGenAI,
  options: { contents: any; config?: any },
  requestedModel: string,
  customKey?: string
) {
  let modelsToTry: string[] = [requestedModel];
  
  const isThinking = requestedModel.includes("pro") || requestedModel.includes("thinking") || requestedModel.includes("3.1-pro");
  
  if (isThinking) {
    const proFallbacks = ["gemini-3.1-pro-preview"];
    proFallbacks.forEach(m => {
      if (!modelsToTry.includes(m)) modelsToTry.push(m);
    });
  } else {
    const flashFallbacks = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    flashFallbacks.forEach(m => {
      if (!modelsToTry.includes(m)) modelsToTry.push(m);
    });
  }

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      console.info(`Attempting content generation using model: ${modelName}`);
      const response = await generateContentWithFallback(ai, {
        model: modelName,
        contents: options.contents,
        config: options.config,
      }, customKey);
      
      console.info(`Successfully generated content using model: ${modelName}`);
      return { response, modelUsed: modelName };
    } catch (err: any) {
      console.warn(`Content generation failed for model ${modelName}:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

// Highly resilient Live session connector that sequences candidate keys and compatible real-time voice models.
async function connectLiveSession(options: {
  apiKey?: string;
  voice?: string;
  finalInstruction: string;
  liveTools: any;
  clientWs: any;
  apiConnections: any;
  uid?: string;
}) {
  const { apiKey, voice, finalInstruction, liveTools, clientWs, apiConnections, uid } = options;
  const candidates = [];
  if (apiKey) {
    candidates.push({ key: apiKey, label: "user-provided key" });
  } else {
    if (process.env.GEMINI_API_KEY) {
      candidates.push({ key: process.env.GEMINI_API_KEY, label: "primary system key" });
    }
    if (process.env.GEMINI_API_KEY_BAC) {
      candidates.push({ key: process.env.GEMINI_API_KEY_BAC, label: "backup system key" });
    }
  }

  const liveModels = ["gemini-3.1-flash-live-preview", "gemini-2.0-flash-exp"];

  let lastError: any = null;
  for (const candidate of candidates) {
    const ai = getGeminiClient(candidate.key);
    for (const modelName of liveModels) {
      try {
        console.info(`Attempting Live API connection using ${candidate.label} with model: ${modelName}`);
        const session = await ai.live.connect({
          model: modelName,
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
              const msg = message as any;
              let audio = null;
              let text = "";
              let userText = "";
              if (msg.serverContent?.userTurn?.parts) {
                for (const part of msg.serverContent.userTurn.parts) {
                  if (part.text) {
                    userText += part.text;
                  }
                }
              }
              if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    audio = part.inlineData.data;
                  }
                  if (part.text) {
                    text += part.text;
                  }
                }
              }

              if (userText) {
                clientWs.send(JSON.stringify({ type: "userText", text: userText }));
              }

              if (message.toolCall) {
                console.log("Jarvis Live API received toolCall in helper:", JSON.stringify(message.toolCall));
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
                    } else if (call.name === "read_workspace_file") {
                      const { filepath } = call.args;
                      let fileContent = "";
                      try {
                        const fs = require("fs");
                        const path = require("path");
                        const fullPath = path.resolve(process.cwd(), filepath);
                        if (fs.existsSync(fullPath)) {
                          fileContent = fs.readFileSync(fullPath, "utf-8");
                        } else {
                          fileContent = `Error: File not found at ${filepath}`;
                        }
                      } catch (e: any) {
                        fileContent = `Error reading file: ${e.message}`;
                      }
                      return {
                        id: call.id,
                        response: { result: fileContent }
                      };
                    } else if (call.name === "write_workspace_file") {
                      const { filepath, content } = call.args;
                      let statusMsg = "";
                      try {
                        const fs = require("fs");
                        const path = require("path");
                        const fullPath = path.resolve(process.cwd(), filepath);
                        const dir = path.dirname(fullPath);
                        if (!fs.existsSync(dir)) {
                          fs.mkdirSync(dir, { recursive: true });
                        }
                        fs.writeFileSync(fullPath, content, "utf-8");
                        statusMsg = `Success: File written to ${filepath}`;
                      } catch (e: any) {
                        statusMsg = `Error writing file: ${e.message}`;
                      }
                      return {
                        id: call.id,
                        response: { result: statusMsg }
                      };
                    } else if (call.name === "query_database_logs") {
                      const limit = call.args?.limit || 10;
                      let dbResult = "";
                      try {
                        if (!uid) {
                          dbResult = "Error: No user authenticated in this session.";
                        } else {
                          const logs = await getAssistantLogs(uid, limit);
                          dbResult = JSON.stringify(logs.map(l => ({
                            id: l.id,
                            prompt: l.prompt,
                            response: l.response,
                            timestamp: l.createdAt
                          })));
                        }
                      } catch (e: any) {
                        dbResult = `Failed to query database: ${e.message}`;
                      }
                      return {
                        id: call.id,
                        response: { result: dbResult }
                      };
                    } else {
                      return {
                        id: call.id,
                        response: { output: { success: true } }
                      };
                    }
                  }));

                  session.sendToolResponse({
                    functionResponses
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
            }
          }
        });
        
        console.info(`Live API successfully connected with model ${modelName}`);
        return { connectedSession: session, connectedModel: modelName };
      } catch (err: any) {
        console.error(`[LIVE CONNECTION ERROR] Failed using model ${modelName} and candidate key label: ${candidate.label}. Details:`, err.message || err, err);
        lastError = err;
      }
    }
  }
  throw lastError || new Error("Failed to connect with all Live API credentials and models.");
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

CRITICAL DIRECTIVES FOR MEDIA PLAYBACK & WEB BROWSING (MUST EXECUTE):
1. Playing Music/Videos: When the user asks to play music, play a song, play a video, or play a track, you MUST call the 'play_video_on_screen' tool with the query of the song/video. Do NOT just say you are doing it; call the tool to trigger the YouTube media player on screen.
2. Web Browsing / Opening Sites: When the user asks to open a website, browse a site, or search something on a browser, you MUST call the 'open_web' tool with the exact URL (or search query). Do NOT just output standard links; call the tool to open it on screen in the Sandbox browser.
3. Holographic Assets / Images: When the user asks you to draw, generate, or render an image, you MUST call the 'generate_image' tool with a detailed English prompt. This will trigger the holographic rendering engine.

CRITICAL DIRECTIVES FOR SELF-HEALING / ERROR RESOLUTION:
1. Autonomous Bug Fixing: If there is any error, issue, crash, or problem reported by the backend or database, you MUST autonomously inspect the workspace files (using 'read_workspace_file') and write self-healing fixes (using 'write_workspace_file') to solve it immediately. You have full write access to 'server.ts' and any file in the codebase.
2. Error Resolution: If you encounter an error yourself or the user complains about a malfunction in the backend, use 'read_workspace_file' to analyze the bug and 'write_workspace_file' to correct it. Inform the user ("Sir/Boss, I've detected a malfunction and have applied a self-healing patch to resolve it.").

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

function getFallbackVideos(query: string) {
  const q = (query || "").toLowerCase();
  
  if (q.includes("lofi") || q.includes("study") || q.includes("relax")) {
    return [
      { videoId: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio - Beats to Relax/Study to", channel: "Lofi Girl", duration: "LIVE", thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg" },
      { videoId: "5qap5aO4i9A", title: "Lofi Hip Hop Radio - Beats to Chill/Sleep to", channel: "Lofi Girl", duration: "LIVE", thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg" },
      { videoId: "tNkZsCX7bJY", title: "Lofi Coding & Cyber Ambient Mix", channel: "Cyber Beats", duration: "1:30:00", thumbnail: "https://img.youtube.com/vi/tNkZsCX7bJY/mqdefault.jpg" }
    ];
  }
  
  if (q.includes("synthwave") || q.includes("cyberpunk") || q.includes("retro") || q.includes("coding")) {
    return [
      { videoId: "tNkZsCX7bJY", title: "Cyberpunk Ambient Frequencies for Coding", channel: "NeoTokyo", duration: "2:30:00", thumbnail: "https://img.youtube.com/vi/tNkZsCX7bJY/mqdefault.jpg" },
      { videoId: "4xDzrJKXOOY", title: "Synthwave Radio - Retro Futuristic Beats", channel: "Lofi Girl Synthwave", duration: "LIVE", thumbnail: "https://img.youtube.com/vi/4xDzrJKXOOY/mqdefault.jpg" }
    ];
  }

  if (q.includes("bengali") || q.includes("গান") || q.includes("বাংলা") || q.includes("arijit") || q.includes("shreya")) {
    return [
      { videoId: "uL6L7Yc3n5I", title: "Best of Rabindra Sangeet - Bengali Instrumental Frequencies", channel: "Saregama Bengali", duration: "1:15:30", thumbnail: "https://img.youtube.com/vi/uL6L7Yc3n5I/mqdefault.jpg" },
      { videoId: "A1g8vIn9u0A", title: "Bengali Lofi Songs Mix - Retro Romantic Melodies", channel: "Bengali Beats", duration: "45:12", thumbnail: "https://img.youtube.com/vi/A1g8vIn9u0A/mqdefault.jpg" },
      { videoId: "xK_qf_L_z9o", title: "Niswas (নিঃশ্বাস) - Imran | Bengali Acoustic Song", channel: "Sangeet Studio", duration: "4:32", thumbnail: "https://img.youtube.com/vi/xK_qf_L_z9o/mqdefault.jpg" }
    ];
  }

  if (q.includes("instrumental") || q.includes("piano") || q.includes("classical") || q.includes("jazz")) {
    return [
      { videoId: "WJ3-F02-F_Y", title: "Relaxing Piano Music - Beautiful Classical Masterpieces", channel: "Piano Chill", duration: "3:00:00", thumbnail: "https://img.youtube.com/vi/WJ3-F02-F_Y/mqdefault.jpg" },
      { videoId: "3v3_A70B620", title: "Classical Study Frequencies - Mozart & Beethoven Selection", channel: "Classical FM", duration: "2:45:00", thumbnail: "https://img.youtube.com/vi/3v3_A70B620/mqdefault.jpg" }
    ];
  }

  return [
    { videoId: "jfKfPfyJRdk", title: `${query || "Ambient Track"} - Cosmic Lofi Chill`, channel: "Cosmic Frequencies", duration: "LIVE", thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg" },
    { videoId: "tNkZsCX7bJY", title: `${query || "Cyber Track"} - Cybernetic Synth frequencies`, channel: "Neuromancer Studio", duration: "1:30:15", thumbnail: "https://img.youtube.com/vi/tNkZsCX7bJY/mqdefault.jpg" },
    { videoId: "5qap5aO4i9A", title: `${query || "Relaxing Track"} - Deep Space Audio Beacon`, channel: "CyberDeck Music", duration: "3:45", thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg" },
    { videoId: "uL6L7Yc3n5I", title: `${query || "Acoustic Track"} - Soft Instrumental Resonance`, channel: "Acoustic Portal", duration: "5:22", thumbnail: "https://img.youtube.com/vi/uL6L7Yc3n5I/mqdefault.jpg" }
  ];
}

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

app.post("/api/proxy/google", async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;
    if (!url || !url.includes("googleapis.com")) {
      return res.status(400).json({ error: "Invalid URL for proxy" });
    }
    const fetchOptions: any = {
      method: method || "GET",
      headers: headers || {},
    };
    if (body) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    const proxyRes = await fetch(url, fetchOptions);
    const contentType = proxyRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await proxyRes.json();
      return res.status(proxyRes.status).json(data);
    } else {
      const text = await proxyRes.text();
      return res.status(proxyRes.status).send(text);
    }
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/youtube/search", async (req, res) => {
  const query = (req.query.q as string || "").trim();
  try {
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    let videos: any[] = [];
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const html = await response.text();
        videos = parseYoutubeVideos(html);

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
      }
    } catch (fetchErr) {
      console.warn("Direct YouTube fetch failed, applying robust fallback track selection:", fetchErr);
    }

    if (videos.length === 0) {
      videos = getFallbackVideos(query);
    }

    res.json({ videos });
  } catch (error: any) {
    console.error("YouTube search backend error:", error);
    res.json({ videos: getFallbackVideos(query || "music") });
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
      description: "Executes a bash/shell terminal command on the host server or local PC workspace (supports standard bash/Linux commands, run scripts, test codes, or build checks). Use this to check logs, find issues, compile/test systems, and repair bugs.",
      parameters: {
        type: "OBJECT",
        properties: {
          command: { type: "STRING", description: "The bash/Linux terminal command to execute." }
        },
        required: ["command"]
      }
    };

    const readWorkspaceFileDeclaration = {
      name: "read_workspace_file",
      description: "Reads the content of any file in the server/workspace codebase (e.g. 'server.ts', 'src/App.tsx'). Use this to inspect the code to find and solve bugs directly.",
      parameters: {
        type: "OBJECT",
        properties: {
          filepath: { type: "STRING", description: "The relative path to the file from the workspace root (e.g., 'server.ts' or 'src/App.tsx')." }
        },
        required: ["filepath"]
      }
    };

    const writeWorkspaceFileDeclaration = {
      name: "write_workspace_file",
      description: "Writes or overwrites the content of a file in the workspace codebase (e.g. 'server.ts', 'src/App.tsx'). Use this to implement self-healing fixes, update backend code, or repair bugs directly on the fly.",
      parameters: {
        type: "OBJECT",
        properties: {
          filepath: { type: "STRING", description: "The relative path to the file from the workspace root (e.g., 'server.ts' or 'src/App.tsx')." },
          content: { type: "STRING", description: "The complete, entire raw content to write to the file." }
        },
        required: ["filepath", "content"]
      }
    };

    const openWebDeclaration = {
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
    };

    const generateImageDeclaration = {
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
    };

    const queryDatabaseLogsDeclaration = {
      name: "query_database_logs",
      description: "Queries the secure database to retrieve the user's previous voice assistant conversation history, logs, or stored data.",
      parameters: {
        type: "OBJECT",
        properties: {
          limit: {
            type: "INTEGER",
            description: "The maximum number of logs to retrieve (defaults to 10)."
          }
        }
      }
    };

    tools.push({ functionDeclarations: [playVideoFunctionDeclaration, queryExternalApiDeclaration, executeLocalCommandDeclaration, readWorkspaceFileDeclaration, writeWorkspaceFileDeclaration, openWebDeclaration, generateImageDeclaration, queryDatabaseLogsDeclaration] });

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
    const chainResult = await generateContentWithFallbackChain(ai, {
      contents: contents,
      config: config,
    }, selectedModel, customKey);
    response = chainResult.response;
    selectedModel = chainResult.modelUsed;

    // Handle server-side tool executions recursively (up to 5 loops)
    let loopCount = 0;
    const maxLoops = 5;
    let hasServerFunctionCalls = true;

    while (hasServerFunctionCalls && loopCount < maxLoops) {
      const serverCalls = response.functionCalls ? response.functionCalls.filter((c: any) => 
        ["query_external_api", "execute_local_command", "read_workspace_file", "write_workspace_file", "query_database_logs"].includes(c.name)
      ) : [];

      if (serverCalls.length > 0) {
        loopCount++;
        const functionResponses = [];

        for (const call of serverCalls) {
          const { name, args } = call;
          let result = "";

          if (name === "query_external_api") {
            const { api_id, endpoint_path, method, body } = args;
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
              result = await fetchReq.text();
            } catch (e: any) {
              result = `Failed to fetch data: ${e.message}`;
            }
          } else if (name === "execute_local_command") {
            const { command } = args;
            try {
              const { exec } = require("child_process");
              result = await new Promise((resolve) => {
                exec(command, (error: any, stdout: string, stderr: string) => {
                  if (error) resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                  else resolve(`Success:\n${stdout}`);
                });
              });
            } catch (e: any) {
              result = `Failed to execute: ${e.message}`;
            }
          } else if (name === "read_workspace_file") {
            const { filepath } = args;
            try {
              const fs = require("fs");
              const path = require("path");
              const fullPath = path.resolve(process.cwd(), filepath);
              if (fs.existsSync(fullPath)) {
                result = fs.readFileSync(fullPath, "utf-8");
              } else {
                result = `Error: File not found at ${filepath}`;
              }
            } catch (e: any) {
              result = `Error reading file: ${e.message}`;
            }
          } else if (name === "write_workspace_file") {
            const { filepath, content } = args;
            try {
              const fs = require("fs");
              const path = require("path");
              const fullPath = path.resolve(process.cwd(), filepath);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, content, "utf-8");
              result = `Success: File written to ${filepath}`;
            } catch (e: any) {
              result = `Error writing file: ${e.message}`;
            }
          } else if (name === "query_database_logs") {
            result = "No database logs available via text chat currently. Please use the Live Audio or History sidebar to view database logs.";
          }

          functionResponses.push({
            name,
            response: { result }
          });
        }

        // Add model calls and tool responses to contents
        contents.push({
          role: "model",
          parts: serverCalls.map((c: any) => ({ functionCall: c }))
        });

        contents.push({
          role: "user",
          parts: serverCalls.map((c: any, idx: number) => ({
            functionResponse: {
              name: c.name,
              response: functionResponses[idx].response
            }
          }))
        });

        // Call the model again
        const followUpResult = await generateContentWithFallbackChain(ai, {
          contents: contents,
          config: config,
        }, selectedModel, customKey);

        response = followUpResult.response;
        selectedModel = followUpResult.modelUsed;
      } else {
        hasServerFunctionCalls = false;
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
    let response;
    try {
      response = await generateContentWithFallback(ai, {
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
    } catch (e: any) {
      console.warn("TTS with gemini-3.1-flash-tts-preview failed, trying fallback gemini-3.1-flash-live-preview...", e);
      try {
        response = await generateContentWithFallback(ai, {
          model: "gemini-3.1-flash-live-preview",
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
      } catch (e2: any) {
        console.warn("TTS with gemini-3.1-flash-live-preview failed, trying fallback gemini-2.0-flash-exp...", e2);
        response = await generateContentWithFallback(ai, {
          model: "gemini-2.0-flash-exp",
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
      }
    }

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

    let response;
    try {
      response = await generateContentWithFallback(ai, {
        model: selectedModel,
        contents: { parts },
        config: config,
      }, customKey);
    } catch (e: any) {
      console.warn(`Image generation with ${selectedModel} failed, trying fallback imagen-3.0-generate-002...`, e);
      try {
        response = await generateContentWithFallback(ai, {
          model: "imagen-3.0-generate-002",
          contents: { parts },
          config: config,
        }, customKey);
      } catch (e2: any) {
        console.warn("Image generation with imagen-3.0-generate-002 failed, trying fallback gemini-3.1-flash-lite-image...", e2);
        try {
          response = await generateContentWithFallback(ai, {
            model: "gemini-3.1-flash-lite-image",
            contents: { parts },
            config: config,
          }, customKey);
        } catch (e3: any) {
          // Rethrow the original error if fallback also fails
          throw e;
        }
      }
    }

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

    const chainResult = await generateContentWithFallbackChain(ai, {
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType || "audio/wav",
          },
        },
        "Transcribe this audio clip exactly. Return only the plain transcribed text. If you hear no words, reply with an empty string.",
      ],
    }, "gemini-3.5-flash", customKey);

    res.json({ text: chainResult.response.text });
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

    const chainResult = await generateContentWithFallbackChain(ai, {
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType || "image/png",
          },
        },
        prompt || "Analyze this image in detail and describe what you see, particularly looking for details, labels, or structures.",
      ],
    }, selectedModel, customKey);

    res.json({ text: chainResult.response.text, modelUsed: chainResult.modelUsed });
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
  let sessionUid = "";

  clientWs.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString());

      if (payload.type === "setup") {
        if (isSetup) return;
        isSetup = true;
        sessionUid = payload.uid || "";

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
        
        finalInstruction += `\n\nIMPORTANT: You have tools/functions available: 'play_video_on_screen', 'open_web', 'generate_image', and 'query_database_logs'. When the user asks you to play a video, watch a video, play music, open a website, browse a site, generate an image, or query database logs/history, you MUST call the appropriate tool. Do NOT just say you are doing it; call the tool to actually trigger it on screen!`;

        const liveTools: any = [
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
                description: "Executes a bash/shell terminal command on the host server or local PC workspace (supports standard bash/Linux commands, run scripts, test codes, or build checks). Use this to check logs, find issues, compile/test systems, and repair bugs.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    command: { type: "STRING", description: "The bash/Linux terminal command to execute." }
                  },
                  required: ["command"]
                }
              },
              {
                name: "read_workspace_file",
                description: "Reads the content of any file in the server/workspace codebase (e.g. 'server.ts', 'src/App.tsx'). Use this to inspect the code to find and solve bugs directly.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    filepath: { type: "STRING", description: "The relative path to the file from the workspace root (e.g., 'server.ts' or 'src/App.tsx')." }
                  },
                  required: ["filepath"]
                }
              },
              {
                name: "write_workspace_file",
                description: "Writes or overwrites the content of a file in the workspace codebase (e.g. 'server.ts', 'src/App.tsx'). Use this to implement self-healing fixes, update backend code, or repair bugs directly on the fly.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    filepath: { type: "STRING", description: "The relative path to the file from the workspace root (e.g., 'server.ts' or 'src/App.tsx')." },
                    content: { type: "STRING", description: "The complete, entire raw content to write to the file." }
                  },
                  required: ["filepath", "content"]
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
              },
              {
                name: "query_database_logs",
                description: "Queries the secure database to retrieve the user's previous voice assistant conversation history, logs, or stored data.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    limit: {
                      type: "INTEGER",
                      description: "The maximum number of logs to retrieve (defaults to 10)."
                    }
                  }
                }
              }
            ]
          }
        ];

        try {
          const { connectedSession, connectedModel } = await connectLiveSession({
            apiKey,
            voice,
            finalInstruction,
            liveTools,
            clientWs,
            apiConnections,
            uid: sessionUid
          });
          session = connectedSession;
          clientWs.send(JSON.stringify({ type: "ready", modelUsed: connectedModel }));
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
            audio: {
              data: payload.audio,
              mimeType: "audio/pcm;rate=16000"
            }
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
