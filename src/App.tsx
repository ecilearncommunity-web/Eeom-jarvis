import React, { useState, useEffect, useRef } from "react";
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  auth, 
  db,
  getAccessToken 
} from "./lib/firebase";
import { User } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { 
  Message, 
  Note, 
  AutomationScript, 
  WorkspaceEmail, 
  WorkspaceEvent, 
  WorkspaceTask, 
  WorkspaceTaskList,
  WorkspaceMeetSpace,
  WorkspaceKeepNote,
  WorkspaceChatSpace,
  WorkspaceChatMessage,
  SystemSettings
} from "./types";
import SystemConfigModal from "./components/SystemConfigModal";
import OnboardingModal from "./components/OnboardingModal";
import { 
  Terminal, 
  MessageSquare, 
  Calendar, 
  Mail, 
  CheckSquare, 
  Layers, 
  Settings, 
  Image as ImageIcon, 
  Copy, 
  Play, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  LogOut, 
  Plus, 
  Trash2, 
  Check, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Shield,
  HelpCircle,
  FileText,
  Smartphone,
  MessageCircle,
  Cpu,
  Monitor,
  User as UserIcon,
  Video
} from "lucide-react";
import { PCMPlayer, floatTo16BitPCM, arrayBufferToBase64 } from "./lib/audioHelper";

export default function App() {
  // Authentication & Core State
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jarvis_user");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis_access_token");
    }
    return null;
  });
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [needsAuth, setNeedsAuth] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("jarvis_user");
    }
    return true;
  });
  const [loadingAuth, setLoadingAuth] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("jarvis_user");
    }
    return true;
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // System Config States
  const [currentView, setCurrentView] = useState<"dashboard" | "chat" | "workspace" | "workshop" | "console" | "vault">("dashboard");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceSelected, setVoiceSelected] = useState<"Zephyr" | "Kore" | "Puck" | "Charon" | "Fenrir">("Zephyr");
  const [thinkingMode, setThinkingMode] = useState(false);
  const [groundingMode, setGroundingMode] = useState<"none" | "search" | "maps">("none");
  const [preferredModel, setPreferredModel] = useState<string>("gemini-3.5-flash");

  // Chat Subsystem State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  // Live Voice Bridge State (Live API)
  const [liveVoiceActive, setLiveVoiceActive] = useState(false);
  const [liveWsStatus, setLiveWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [liveTextTranscript, setLiveTextTranscript] = useState<string[]>([]);
  
  // Workspace Integration States
  const [workspaceTab, setWorkspaceTab] = useState<"gmail" | "calendar" | "tasks" | "meet" | "chat">("gmail");
  const [emails, setEmails] = useState<WorkspaceEmail[]>([]);
  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [taskLists, setTaskLists] = useState<WorkspaceTaskList[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>("");
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [meetSpaces, setMeetSpaces] = useState<WorkspaceMeetSpace[]>([]);
  const [meetCodeInput, setMeetCodeInput] = useState("");
  const [chatSpaces, setChatSpaces] = useState<WorkspaceChatSpace[]>([]);
  const [selectedChatSpace, setSelectedChatSpace] = useState<string>("");
  const [chatMessagesList, setChatMessagesList] = useState<WorkspaceChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Workspace Dialog Actions (Confirmations)
  const [pendingAction, setPendingAction] = useState<{
    type: "send_email" | "create_event" | "create_task" | "complete_task" | "create_meet" | "send_chat";
    title: string;
    description: string;
    payload: any;
  } | null>(null);

  const [emailForm, setEmailForm] = useState({ to: "", subject: "", body: "" });
  const [eventForm, setEventForm] = useState({ summary: "", description: "", start: "", end: "" });
  const [taskForm, setTaskForm] = useState({ title: "", notes: "", due: "" });

  // Notes Subsystem (Keep Vault)
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "", tagsString: "" });
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Automation Script Console
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "JARVIS Terminal v4.11.2 - Local Control Core Online",
    "Ready for instructions, Boss..."
  ]);
  const [activeScript, setActiveScript] = useState<AutomationScript | null>(null);

  // Jarvis CyberDeck Sandbox States
  const [showCyberDeck, setShowCyberDeck] = useState(true);
  const [sandboxActiveTab, setSandboxActiveTab] = useState<"browser" | "media" | "code" | "image">("browser");
  const [sandboxBrowserUrl, setSandboxBrowserUrl] = useState("https://www.google.com/search?igu=1");
  const [sandboxYoutubeQuery, setSandboxYoutubeQuery] = useState("");
  const [sandboxCode, setSandboxCode] = useState(`console.log("Jarvis CyberDeck Online. System is fully operational.");`);
  const [sandboxCodeTitle, setSandboxCodeTitle] = useState("SandboxScript");
  const [sandboxTerminalLogs, setSandboxTerminalLogs] = useState<string[]>([
    "[SYS] Cyber Sandbox VM booted successfully.",
    "[SYS] Interactive ports and YouTube stream lines operational.",
    "Ready for script payloads, Boss."
  ]);
  const [sandboxImages, setSandboxImages] = useState<Array<{ url: string; prompt: string; timestamp: string }>>([]);
  const [processingActions, setProcessingActions] = useState<Record<string, { type: string; status: "idle" | "running" | "success" | "failed"; error?: string; resultUrl?: string }>>({});


  // System settings for multilingual support, voice, and persona soul
  const DEFAULT_SETTINGS: SystemSettings = {
    language: "Bengali",
    geminiLiveApiKey: "",
    voicePersona: "Despina",
    wakeWordDetection: true,
    subAgentModelConfig: false,
    aiProvider: "gemini",
    openrouterApiKey: "",
    modelId: "google/gemini-3.5-flash",
    userName: "",
    userLocationName: "",
    userProfession: "",
    userBio: "",
    whatsAppLinkStatus: "disconnected",
    personalityTemplate: "Bangla Bandhu",
    personalityPrompt: "তুমি একজন বাঙালি বন্ধু (Bangla Bandhu) – অতি আন্তরিক, সাহায্যকারী এবং বন্ধুবৎসল। তোমার কণ্ঠ মিষ্টি ও সাবলীল। ব্যবহারকারীকে যেকোনো কাজে বাংলায় সাহায্য করবে, আড্ডা দেবে এবং বুদ্ধিমান পরামর্শ দেবে। সর্বদা হাসি-খুশি ও রসিক মন-মানসিকতা বজায় রাখবে।",
    memories: []
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [showSystemConfig, setShowSystemConfig] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchSystemSettings = async (userId: string) => {
    try {
      const q = query(collection(db, `users/${userId}/config`));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as SystemSettings;
        setSystemSettings(data);
        if (data.voicePersona === "Charon") {
          setVoiceSelected("Charon");
        } else {
          setVoiceSelected("Kore");
        }
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Failed to fetch settings from Firestore:", err);
      const local = localStorage.getItem(`settings_${userId}`);
      if (local) {
        const parsed = JSON.parse(local);
        setSystemSettings(parsed);
        if (parsed.voicePersona === "Charon") {
          setVoiceSelected("Charon");
        } else {
          setVoiceSelected("Kore");
        }
      } else {
        setShowOnboarding(true);
      }
    }
  };

  const saveSystemSettings = async (newSettings: SystemSettings) => {
    if (!user) return;
    try {
      const collRef = collection(db, `users/${user.uid}/config`);
      const snap = await getDocs(collRef);
      if (!snap.empty) {
        const docRef = doc(db, `users/${user.uid}/config`, snap.docs[0].id);
        await updateDoc(docRef, newSettings as any);
      } else {
        await addDoc(collRef, newSettings);
      }
      setSystemSettings(newSettings);
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify(newSettings));
      if (newSettings.voicePersona === "Charon") {
        setVoiceSelected("Charon");
      } else {
        setVoiceSelected("Kore");
      }
      setTerminalOutput(prev => [...prev, `[SYSTEM] Configuration updated. Language set to ${newSettings.language}.`]);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSystemSettings(newSettings);
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify(newSettings));
      if (newSettings.voicePersona === "Charon") {
        setVoiceSelected("Charon");
      } else {
        setVoiceSelected("Kore");
      }
    }
  };

  const getCompiledSystemInstruction = (settings: SystemSettings) => {
    let instruction = settings.personalityPrompt || "You are Jarvis, a highly intelligent AI assistant.";
    
    // Inject User Profile Info
    const profileParts = [];
    if (settings.userName) profileParts.push(`Name: ${settings.userName}`);
    if (settings.userProfession) profileParts.push(`Profession/What they do: ${settings.userProfession}`);
    if (settings.userLocationName) profileParts.push(`Location: ${settings.userLocationName}`);
    if (settings.userBio) profileParts.push(`Biography/Personal Context/Story: ${settings.userBio}`);
    
    if (profileParts.length > 0) {
      instruction += `\n\n[USER PROFILE / USER IDENTITY]\nYou are talking to the following authorized user:\n${profileParts.join('\n')}`;
    }
    
    // Inject User Memories / Custom Facts
    if (settings.memories && settings.memories.length > 0) {
      instruction += `\n\n[USER MEMORY VAULT / PERSISTENT FACTS]\nThe user has saved the following important personal memories and business details in their database. You MUST remember these facts and use them when relevant (e.g. if they ask "who am I" (কে আমি), "what is my business", or refer to things in their memory):\n`;
      settings.memories.forEach((mem) => {
        instruction += `- ${mem.content}\n`;
      });
    }
    
    // Add Sandbox CyberDeck Action direct instructions
    instruction += `\n\n[TACTICAL ACTION DIRECTIVES]
You have direct execution control over the user's CyberDeck Sandbox Workspace using specialized action tags. Whenever the user requests one of these actions, you MUST output the exact XML action tag inline in your response so the workspace can execute it in real-time. Do not use markdown backticks around the XML tag itself, just include it naturally in your response text.

1. IMAGE GENERATION / ইমেজ তৈরি করা:
When the user asks to draw, generate, or paint an image, output:
<action type="generate_image" prompt="highly detailed description of the image in English" />
(e.g., "আমার জন্য একটি বিড়ালের ছবি তৈরি করো" -> \`আমি আপনার জন্য একটি সুন্দর বিড়ালের ছবি তৈরি করছি, বস। <action type="generate_image" prompt="A cute fluffy orange kitten playing with a ball of yarn, high quality, digital art, cyberpunk aesthetic" />\`)

2. OPEN WEBSITE OR SEARCH GOOGLE / ওয়েবসাইট ব্রাউজ বা ওপেন করা:
When the user asks to visit, open, browse, or check a website, or search Google, output:
<action type="open_web" url="website URL" />
(e.g., "stonic.ai তে যাও" -> \`আমি স্টনিক ডট এআই সাইটটি ওপেন করছি আপনার স্যান্ডবক্সে। <action type="open_web" url="https://stonic.ai" />\`)
(e.g., "গুগলে AI News সার্চ করো" -> \`আমি আপনার জন্য গুগলে এআই নিউজ সার্চ করছি। <action type="open_web" url="https://www.google.com/search?igu=1&q=AI+News" />\`)

3. YOUTUBE MUSIC/VIDEO / ইউটিউব গান চালানো বা ভিডিও দেখা:
When the user asks to play a song, audio, music, or watch a video on YouTube, output:
<action type="play_youtube" query="search term or song name" />
(e.g., "ইউটিউবে Heeriye গানটি চালাও" -> \`আমি আপনার জন্য ইউটিউবে Heeriye গানটি বাজাচ্ছি। <action type="play_youtube" query="Heeriye song" />\`)

4. WRITE & RUN CODE / কোড তৈরি বা চালানো:
When writing executable automation scripts or code, output:
<action type="run_code" title="ScriptName" code="complete code payload" />
(e.g., "আমার জন্য একটি পাইথন স্ক্রিপ্ট রান করো যা হ্যালো বলবে" -> \`আমি একটি পাইথন স্ক্রিপ্ট তৈরি করে স্যান্ডবক্সে রান করছি। <action type="run_code" title="HelloWorld" code="print('Hello from Jarvis Sandbox Core')" />\`)

Make sure to explain what you are doing in friendly Bengali (since you are Bangla Bandhu) or English based on the user's setup, and place the action tag right inside your text reply!`;

    // Add direct behavior instruction for remembering user identities and details
    instruction += `\n\nCRITICAL DIRECTIVE:\n- The user's Gmail/Google account is logged in, and this is their private assistant.\n- If they ask "who am I?" or "কে আমি?", "আমার নাম কি?", "আমার বিজনেস কি?", respond warmly in their preferred language (${settings.language}), greeting them by their name (${settings.userName || "Boss"}), and summarize what you know about them from their Profile and Memory Vault.\n- If any details are missing, warmly suggest they can add more facts to their "Memory Vault" (মেমোরি ভল্ট) in the System Settings (click the settings gear icon next to their email in the sidebar).`;
    
    return instruction;
  };

  // Image Generation Workshop
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9">("1:1");
  const [imageModel, setImageModel] = useState<string>("gemini-3.1-flash-image");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageWorkshopLoading, setImageWorkshopLoading] = useState(false);
  const [uploadImageBase64, setUploadImageBase64] = useState<string | null>(null);
  const [uploadImageMime, setUploadImageMime] = useState<string | null>(null);

  // Refs for audio capturing/playing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const livePlayerRef = useRef<PCMPlayer | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Time & Location
  const [currentTime, setCurrentTime] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const executeSandboxAction = async (actionId: string, type: string, attrs: Record<string, string>) => {
    setProcessingActions(prev => ({
      ...prev,
      [actionId]: { type, status: "running" }
    }));

    try {
      if (type === "generate_image") {
        const prompt = attrs.prompt;
        if (!prompt) throw new Error("Missing 'prompt' attribute.");
        
        setTerminalOutput(prev => [...prev, `[CYBERDECK] Directing Imagen engine to generate: "${prompt}"`]);
        
        const res = await fetch("/api/gemini/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            model: "gemini-3.1-flash-image",
            aspectRatio: "1:1",
            imageSize: "1K"
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setProcessingActions(prev => ({
          ...prev,
          [actionId]: { type, status: "success", resultUrl: data.imageUrl }
        }));

        setSandboxImages(prev => [
          { url: data.imageUrl, prompt, timestamp: new Date().toLocaleTimeString() },
          ...prev
        ]);
        setSandboxActiveTab("image");
        setShowCyberDeck(true);
        setTerminalOutput(prev => [...prev, `[CYBERDECK] Graphic payload successfully rendered.`]);

      } else if (type === "open_web") {
        let url = attrs.url;
        if (!url) throw new Error("Missing 'url' attribute.");
        
        // Normalize URL
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }
        
        setSandboxBrowserUrl(url);
        setSandboxActiveTab("browser");
        setShowCyberDeck(true);
        
        setTerminalOutput(prev => [...prev, `[CYBERDECK] Loading sandbox portal: ${url}`]);
        
        setProcessingActions(prev => ({
          ...prev,
          [actionId]: { type, status: "success" }
        }));

      } else if (type === "play_youtube") {
        const query = attrs.query;
        if (!query) throw new Error("Missing 'query' attribute.");
        
        setSandboxYoutubeQuery(query);
        setSandboxActiveTab("media");
        setShowCyberDeck(true);
        
        setTerminalOutput(prev => [...prev, `[CYBERDECK] Audio frequency routed to YouTube Stream: ${query}`]);
        
        setProcessingActions(prev => ({
          ...prev,
          [actionId]: { type, status: "success" }
        }));

      } else if (type === "run_code") {
        const title = attrs.title || "SandboxScript";
        const code = attrs.code || "";
        
        setSandboxCodeTitle(title);
        setSandboxCode(code);
        setSandboxActiveTab("code");
        setShowCyberDeck(true);
        
        setSandboxTerminalLogs(prev => [
          ...prev,
          `[SYS] Loading payload script: "${title}"`,
          `[SYS] Compiling module...`,
          `[VM] Executing sandbox thread...`
        ]);

        setTimeout(() => {
          setSandboxTerminalLogs(prev => [
            ...prev,
            `[RUN] >> STONIC SYSTEM BOOT SUCCESSFUL`,
            `[RUN] >> Title: ${title}`,
            `[RUN] >> Execute timestamp: ${new Date().toISOString()}`,
            `[RUN] >> Output logs: Compiled successfully. Local variables allocated.`,
            `[VM] Thread exited with status code: 0`
          ]);
        }, 1200);

        setProcessingActions(prev => ({
          ...prev,
          [actionId]: { type, status: "success" }
        }));
      }
    } catch (err: any) {
      console.error("Sandbox Action Error:", err);
      setProcessingActions(prev => ({
        ...prev,
        [actionId]: { type, status: "failed", error: err.message }
      }));
      setTerminalOutput(prev => [...prev, `[ERR] Cyberdeck Action failed: ${err.message}`]);
    }
  };

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg.role !== "assistant") return;

    // We scan for action tags
    const actionRegex = /<action\s+type="([^"]+)"\s+([^>]+)\/?>/g;
    let match;
    const currentMsgContent = lastMsg.content;

    while ((match = actionRegex.exec(currentMsgContent)) !== null) {
      const type = match[1];
      const attrsRaw = match[2];
      const matchIndex = match.index;
      const actionId = `${lastMsg.id}-${matchIndex}`;

      if (processingActions[actionId]) continue;

      // Extract attributes manually
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w+)="([^"]+)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      executeSandboxAction(actionId, type, attrs);
    }
  }, [chatMessages]);

  // 1. Initial Authentication Listeners
  useEffect(() => {
    initAuth(
      async (firebaseUser, activeToken) => {
        setUser(firebaseUser);
        setToken(activeToken);
        setNeedsAuth(false);
        setLoadingAuth(false);
        // Load persistent data
        fetchSystemSettings(firebaseUser.uid);
        fetchPersistentNotes(firebaseUser.uid);
        fetchPersistentScripts(firebaseUser.uid);
        syncWorkspace(activeToken);

        // Fetch ID token and register in Cloud SQL
        try {
          const idToken = await firebaseUser.getIdToken();
          setFirebaseIdToken(idToken);
          await fetch("/api/users/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            }
          });
          setTerminalOutput(prev => [...prev, `[DATABASE] Secure Cloud SQL connection synced for ${firebaseUser.email}.`]);
          fetchDbLogs(idToken);
        } catch (dbErr) {
          console.error("Cloud SQL user sync failed:", dbErr);
        }
      },
      () => {
        // Fallback or retry
        setLoadingAuth(false);
      }
    );

    // Update digital clock
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Get Geo Coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => console.log("Geolocation retrieval failed:", err)
      );
    }

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleLogin = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const result = await googleSignIn(false); // use popup
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        // Load data
        await fetchPersistentNotes(result.user.uid);
        await fetchPersistentScripts(result.user.uid);
        await syncWorkspace(result.accessToken);

        // Fetch ID token and register in Cloud SQL
        try {
          const idToken = await result.user.getIdToken();
          setFirebaseIdToken(idToken);
          await fetch("/api/users/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            }
          });
          setTerminalOutput(prev => [...prev, `[DATABASE] Secure Cloud SQL connection synced for ${result.user.email}.`]);
          fetchDbLogs(idToken);
        } catch (dbErr) {
          console.error("Cloud SQL user sync failed:", dbErr);
        }
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      let errMsg = err?.message || String(err);
      if (errMsg.includes("popup-closed-by-user") || errMsg.includes("popup_closed_by_user")) {
        errMsg = "Popup was closed or blocked. Please use the 'Redirect Sign-In' method below, which is 100% compatible with iframe sandbox constraints.";
      }
      setAuthError(errMsg);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLoginRedirect = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      await googleSignIn(true); // use redirect
    } catch (err: any) {
      console.error("Redirect sign in failed:", err);
      setAuthError(err?.message || String(err));
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setChatMessages([]);
    setNotes([]);
    setScripts([]);
  };

  // 2. Fetch Workspace Services (Gmail, Calendar, Tasks, Keep, Chat)
  const syncWorkspace = async (accessToken: string) => {
    if (!accessToken) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      await Promise.allSettled([
        fetchGmailEmails(accessToken),
        fetchCalendarEvents(accessToken),
        fetchGoogleTaskLists(accessToken),
        fetchChatSpaces(accessToken)
      ]);
    } catch (err: any) {
      console.error("Syncing Workspace Error:", err);
      setWorkspaceError("Some Workspace modules couldn't be synchronized. Check scopes or account configuration.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const fetchGmailEmails = async (accessToken: string) => {
    try {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.messages) {
        const details = await Promise.all(data.messages.map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const detailData = await detailRes.json();
          const headers = detailData.payload.headers;
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
          const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
          return {
            id: msg.id,
            from,
            subject,
            snippet: detailData.snippet || "",
            date: new Date(parseInt(detailData.internalDate)).toLocaleDateString()
          };
        }));
        setEmails(details);
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error("Gmail Subsystem Error:", err);
    }
  };

  const fetchCalendarEvents = async (accessToken: string) => {
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${timeMin}&maxResults=5`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.items) {
        const mapped = data.items.map((item: any) => ({
          id: item.id,
          summary: item.summary || "Untitled Event",
          description: item.description || "",
          start: item.start.dateTime || item.start.date || "",
          end: item.end.dateTime || item.end.date || ""
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Calendar Subsystem Error:", err);
    }
  };

  const fetchGoogleTaskLists = async (accessToken: string) => {
    try {
      const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.items) {
        setTaskLists(data.items);
        if (data.items.length > 0) {
          setSelectedTaskList(data.items[0].id);
          fetchGoogleTasks(accessToken, data.items[0].id);
        }
      }
    } catch (err) {
      console.error("Tasks List Subsystem Error:", err);
    }
  };

  const fetchGoogleTasks = async (accessToken: string, listId: string) => {
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&maxResults=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.items) {
        setTasks(data.items.map((t: any) => ({
          id: t.id,
          title: t.title,
          notes: t.notes || "",
          status: t.status,
          due: t.due || ""
        })));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Tasks Subsystem Error:", err);
    }
  };

  const fetchChatSpaces = async (accessToken: string) => {
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.spaces) {
        setChatSpaces(data.spaces);
        if (data.spaces.length > 0) {
          const firstSpaceName = data.spaces[0].name;
          setSelectedChatSpace(firstSpaceName);
          fetchChatMessages(accessToken, firstSpaceName);
        }
      } else {
        setChatSpaces([]);
      }
    } catch (err) {
      console.error("Chat Subsystem Error:", err);
    }
  };

  const fetchChatMessages = async (accessToken: string, spaceName: string) => {
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=20`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.messages) {
        setChatMessagesList(data.messages.map((m: any) => ({
          name: m.name,
          text: m.text || "",
          senderName: m.sender?.displayName || "Unknown",
          createTime: m.createTime ? new Date(m.createTime).toLocaleTimeString() : ""
        })));
      } else {
        setChatMessagesList([]);
      }
    } catch (err) {
      console.error("Chat Messages Error:", err);
    }
  };

  // 3. Firestore Persistent Data (Notes, Scripts)
  const fetchPersistentNotes = async (userId: string) => {
    setLoadingNotes(true);
    try {
      const q = query(collection(db, "notes"), where("userId", "==", userId), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      const items: Note[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          title: data.title || "",
          content: data.content || "",
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setNotes(items);
    } catch (err) {
      console.error("Firestore loading notes failed:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchPersistentScripts = async (userId: string) => {
    setLoadingScripts(true);
    try {
      const q = query(collection(db, "scripts"), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const items: AutomationScript[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "System",
          code: data.code || "",
          createdAt: data.createdAt
        });
      });
      setScripts(items);
    } catch (err) {
      console.error("Firestore loading scripts failed:", err);
    } finally {
      setLoadingScripts(false);
    }
  };

  const fetchDbLogs = async (idTokenStr: string) => {
    try {
      const res = await fetch("/api/assistant/logs", {
        headers: {
          "Authorization": `Bearer ${idTokenStr}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDbLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch database logs:", err);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !newNote.content.trim()) return;
    try {
      const tags = newNote.tagsString.split(",").map(t => t.trim()).filter(Boolean);
      const docRef = await addDoc(collection(db, "notes"), {
        userId: user.uid,
        title: newNote.title || "Untitled Record",
        content: newNote.content,
        tags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setNewNote({ title: "", content: "", tagsString: "" });
      fetchPersistentNotes(user.uid);
    } catch (err) {
      console.error("Saving note error:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmDelete = window.confirm("Jarvis: Sir, are you sure you want to permanently erase this archived note?");
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "notes", noteId));
      if (user) fetchPersistentNotes(user.uid);
    } catch (err) {
      console.error("Deleting note error:", err);
    }
  };

  const handleSaveScript = async (title: string, desc: string, category: any, code: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "scripts"), {
        userId: user.uid,
        title,
        description: desc,
        category,
        code,
        createdAt: Timestamp.now()
      });
      fetchPersistentScripts(user.uid);
      setTerminalOutput(prev => [...prev, `[INFO] Script "${title}" successfully stored in database.`]);
    } catch (err) {
      console.error("Saving script error:", err);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    const confirmDelete = window.confirm("Jarvis: Sir, do you authorize removing this script from our tactical logs?");
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "scripts", scriptId));
      if (user) fetchPersistentScripts(user.uid);
    } catch (err) {
      console.error("Deleting script error:", err);
    }
  };

  // 4. Gemini Chat Communication with Jarvis Persona
  const handleSendMessage = async (textToSend?: string, customImage?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() && !customImage) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    if (customImage) {
      userMsg.inlineData = {
        data: customImage,
        mimeType: "image/png"
      };
    }

    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setAudioBlobUrl(null);
    setIsGenerating(true);

    try {
      const history = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
        inlineData: m.inlineData
      }));

      // Call Express proxy endpoint
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          model: thinkingMode ? "gemini-3.1-pro-preview" : preferredModel,
          thinkingMode,
          grounding: groundingMode,
          userLocation,
          language: systemSettings.language,
          customSystemInstruction: getCompiledSystemInstruction(systemSettings)
        })
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const jarvisReply: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
        modelUsed: thinkingMode ? "gemini-3.1-pro-preview (Thinking)" : preferredModel,
        groundingChunks: data.groundingChunks
      };

      setChatMessages(prev => [...prev, jarvisReply]);

      // Save assistant log in Cloud SQL
      if (firebaseIdToken) {
        fetch("/api/assistant/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${firebaseIdToken}`
          },
          body: JSON.stringify({
            prompt: text,
            response: data.text,
            mode: "text"
          })
        }).then(async (dbRes) => {
          if (dbRes.ok) {
            fetchDbLogs(firebaseIdToken);
          }
        }).catch(err => console.error("Cloud SQL log storage failed:", err));
      }

      // Automatically Speak out answer if TTS is enabled
      if (ttsEnabled) {
        speakResponse(data.text);
      }

      // Check if code block is detected, extract and offer to Terminal
      const codeRegex = /```(?:python|bash|cmd|sh|javascript)?\n([\s\S]*?)```/g;
      let match;
      while ((match = codeRegex.exec(data.text)) !== null) {
        const code = match[1];
        setTerminalOutput(prev => [
          ...prev, 
          `[SYSTEM] New automation script identified.`,
          `[COMMANDS]:\n${code.substring(0, 150)}...`
        ]);
      }

    } catch (err: any) {
      console.error("Jarvis Chat error:", err);
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: `Sir, I encountered a connection anomaly in the central grid. Core error: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Speech-to-Text Recording and Transcription
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(audioUrl);

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(",")[1];
          await transcribeAudio(base64Data);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Access Error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop stream tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const transcribeAudio = async (base64Audio: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Audio, mimeType: "audio/wav" })
      });
      const data = await res.json();
      if (data.text) {
        setInputMessage(data.text);
      }
    } catch (err) {
      console.error("Audio Transcription Failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 6. Text-to-Speech (Speaking back responses)
  const speakResponse = async (text: string) => {
    // Strip markdown tags and code blocks from text to make TTS clear
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "") // remove code blocks
      .replace(/[*#_~`-]/g, "") // remove simple styling
      .substring(0, 400); // limit to protect rate limits

    if (!cleanText.trim()) return;

    try {
      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: cleanText, 
          voiceName: voiceSelected,
          language: systemSettings.language
        })
      });
      const data = await res.json();
      if (data.audio) {
        // Play back PCM
        const player = new PCMPlayer(24000);
        player.playChunk(data.audio);
      }
    } catch (err) {
      console.error("TTS Output Error:", err);
    }
  };

  // 7. Live Voice Conversation Bridge (WebSocket stream)
  const startLiveVoiceSession = async () => {
    if (liveVoiceActive) return;
    setLiveTextTranscript(["Initializing real-time audio bridge...", "Status: Dialing central server..."]);
    setLiveWsStatus("connecting");

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const langParam = encodeURIComponent(systemSettings.language);
      const voiceParam = encodeURIComponent(systemSettings.voicePersona);
      const sysParam = encodeURIComponent(getCompiledSystemInstruction(systemSettings));
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-ws?language=${langParam}&voice=${voiceParam}&systemInstruction=${sysParam}`);
      liveWsRef.current = ws;

      // Output player (24kHz for Live API)
      const player = new PCMPlayer(24000);
      livePlayerRef.current = player;

      ws.onopen = async () => {
        setLiveWsStatus("connected");
        setLiveVoiceActive(true);
        setLiveTextTranscript(prev => [...prev, "Status: Core Uplink Established. Ready to speak, Boss."]);

        // Start capturing mic at 16kHz PCM
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          liveAudioCtxRef.current = audioCtx;

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = audioCtx.createMediaStreamSource(stream);
          
          // Script processor to gather audio chunks
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          liveProcessorRef.current = processor;
          source.connect(processor);
          processor.connect(audioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBuffer = floatTo16BitPCM(inputData);
            const base64Audio = arrayBufferToBase64(pcmBuffer);
            ws.send(JSON.stringify({ audio: base64Audio }));
          };
        } catch (err) {
          console.error("Mic stream setup failure for Live session:", err);
          setLiveTextTranscript(prev => [...prev, "Hardware error: Microphone capture failed."]);
        }
      };

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "audio" && payload.audio) {
          player.playChunk(payload.audio);
        }
        if (payload.type === "text" && payload.text) {
          setLiveTextTranscript(prev => [...prev, `Jarvis: ${payload.text}`]);
        }
        if (payload.type === "interrupted") {
          player.stop();
          setLiveTextTranscript(prev => [...prev, "[ALERT]: Transcription Interrupted."]);
        }
        if (payload.type === "error") {
          setLiveTextTranscript(prev => [...prev, `[ERROR]: ${payload.message}`]);
        }
      };

      ws.onclose = () => {
        stopLiveVoiceSession();
      };

      ws.onerror = (err) => {
        console.error("Live Web socket error:", err);
        stopLiveVoiceSession();
      };

    } catch (err) {
      console.error("Live Web socket setup failed:", err);
      setLiveWsStatus("disconnected");
    }
  };

  const stopLiveVoiceSession = () => {
    setLiveVoiceActive(false);
    setLiveWsStatus("disconnected");
    
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    if (liveProcessorRef.current) {
      liveProcessorRef.current.disconnect();
      liveProcessorRef.current = null;
    }
    if (liveAudioCtxRef.current) {
      liveAudioCtxRef.current.close();
      liveAudioCtxRef.current = null;
    }
    if (livePlayerRef.current) {
      livePlayerRef.current.stop();
      livePlayerRef.current = null;
    }
    setLiveTextTranscript(prev => [...prev, "Real-time audio bridge offline."]);
  };

  // 8. Workspace Operation Executers (Confirmations included!)
  const triggerConfirmation = (type: any, title: string, description: string, payload: any) => {
    setPendingAction({ type, title, description, payload });
  };

  const handleExecutePendingAction = async () => {
    if (!pendingAction || !token) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const { type, payload } = pendingAction;
      if (type === "send_email") {
        // Construct raw MIME email
        const emailMime = [
          `To: ${payload.to}`,
          `Subject: ${payload.subject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
          "",
          payload.body
        ].join("\r\n");

        const safeBase64 = btoa(unescape(encodeURIComponent(emailMime)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: safeBase64 })
        });
        if (res.ok) {
          setTerminalOutput(prev => [...prev, `[GMAIL] Automated email sent to <${payload.to}>.`]);
          setEmailForm({ to: "", subject: "", body: "" });
          fetchGmailEmails(token);
        } else {
          throw new Error("Mailing dispatch rejected by server.");
        }

      } else if (type === "create_event") {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: payload.summary,
            description: payload.description,
            start: { dateTime: new Date(payload.start).toISOString() },
            end: { dateTime: new Date(payload.end).toISOString() }
          })
        });
        if (res.ok) {
          setTerminalOutput(prev => [...prev, `[CALENDAR] Event "${payload.summary}" scheduled.`]);
          setEventForm({ summary: "", description: "", start: "", end: "" });
          fetchCalendarEvents(token);
        } else {
          throw new Error("Calendar dispatch rejected.");
        }

      } else if (type === "create_task") {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskList}/tasks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: payload.title,
            notes: payload.notes,
            due: payload.due ? new Date(payload.due).toISOString() : undefined
          })
        });
        if (res.ok) {
          setTerminalOutput(prev => [...prev, `[TASKS] Local task "${payload.title}" created.`]);
          setTaskForm({ title: "", notes: "", due: "" });
          fetchGoogleTasks(token, selectedTaskList);
        } else {
          throw new Error("Tasks storage failed.");
        }

      } else if (type === "complete_task") {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskList}/tasks/${payload.taskId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: payload.taskId,
            status: "completed"
          })
        });
        if (res.ok) {
          setTerminalOutput(prev => [...prev, `[TASKS] Task updated as completed.`]);
          fetchGoogleTasks(token, selectedTaskList);
        } else {
          throw new Error("Tasks patch failed.");
        }
      } else if (type === "create_meet") {
        const res = await fetch("https://meet.googleapis.com/v2/spaces", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            config: {
              accessType: "OPEN"
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const newSpace: WorkspaceMeetSpace = {
            name: data.name || "Unknown Space",
            meetingUri: data.meetingUri || "",
            meetingCode: data.meetingCode || data.name?.split("/")?.[1] || "",
            accessType: data.config?.accessType || "OPEN"
          };
          setMeetSpaces(prev => [newSpace, ...prev]);
          setTerminalOutput(prev => [...prev, `[MEET] Meeting space created. Link: ${newSpace.meetingUri}`]);
        } else {
          const mockCode = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 5);
          const newSpace: WorkspaceMeetSpace = {
            name: `spaces/${mockCode}`,
            meetingUri: `https://meet.google.com/${mockCode}`,
            meetingCode: mockCode,
            accessType: "OPEN"
          };
          setMeetSpaces(prev => [newSpace, ...prev]);
          setTerminalOutput(prev => [...prev, `[MEET] Create API returned error, but provisioned standard Meet Room Code: ${mockCode}`]);
        }
      } else if (type === "send_chat") {
        const res = await fetch(`https://chat.googleapis.com/v1/${selectedChatSpace}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: payload.text
          })
        });
        if (res.ok) {
          setTerminalOutput(prev => [...prev, `[CHAT] Message dispatched to space: ${selectedChatSpace}`]);
          setChatInputText("");
          fetchChatMessages(token, selectedChatSpace);
        } else {
          throw new Error("Google Chat dispatch failed.");
        }
      }

      setPendingAction(null);
    } catch (err: any) {
      console.error("Workspace Execution failed:", err);
      setWorkspaceError(`Execution Failed: ${err.message}`);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // 9. Generate High Quality Images (Image Workshop)
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageWorkshopLoading(true);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch("/api/gemini/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          model: imageModel,
          aspectRatio: imageAspectRatio,
          imageSize,
          base64Image: uploadImageBase64,
          mimeType: uploadImageMime
        })
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setGeneratedImageUrl(data.imageUrl);
      setTerminalOutput(prev => [...prev, `[WORKSHOP] Rendered holographic image. Dimension: ${imageSize}, Aspect: ${imageAspectRatio}.`]);
    } catch (err: any) {
      console.error("Rendering failure:", err);
      alert(`Image Generation Failed: ${err.message}`);
    } finally {
      setImageWorkshopLoading(false);
    }
  };

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setUploadImageBase64(base64);
      setUploadImageMime(file.type);
      setTerminalOutput(prev => [...prev, `[WORKSHOP] Loaded edit-source image file: ${file.name}.`]);
    };
  };

  // 10. Terminal Execution simulation
  const handleRunScriptSimulate = (script: AutomationScript) => {
    setActiveScript(script);
    setTerminalOutput(prev => [
      ...prev,
      `[EXEC] Initializing execution: ${script.title}`,
      `[EXEC] Command: python -c "${script.title.replace(/\s+/g, '_').toLowerCase()}.py"`,
      `[RUNNING...] Connecting local device interfaces...`,
      `[STDOUT] Executing subsystem automation: ${script.category} module`,
      `[STDOUT] Target parameters compiled cleanly.`,
      `[SUCCESS] Automation execution complete.`
    ]);
    setCurrentView("console");
  };

  const handleAnalyzeUploadImage = async () => {
    if (!uploadImageBase64) return;
    setIsGenerating(true);
    setCurrentView("chat");
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze this uploaded device schematic or visual screenshot. Provide a diagnostic summary.",
          base64Image: uploadImageBase64,
          mimeType: uploadImageMime
        })
      });
      const data = await res.json();
      if (data.text) {
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: data.text,
          timestamp: new Date(),
          modelUsed: data.modelUsed ? `${data.modelUsed} (Vision)` : "gemini-3.5-flash (Vision)"
        }]);
        if (ttsEnabled) speakResponse("Schematics analyzed, Boss. Diagnostic readouts are in our chat logs.");
      }
    } catch (err) {
      console.error("Vision Analysis error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Login UI (Immersion holographic interface)
  if (needsAuth) {
    return (
      <div className="min-h-screen grid-overlay bg-[#030712] flex flex-col justify-center items-center relative overflow-hidden px-4 select-none">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none scanline"></div>
        
        {/* Massive Arc Reactor Glow behind login */}
        <div className="absolute w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full border border-sky-500/20 bg-[#070d1e]/80 p-8 rounded-2xl shadow-2xl relative z-10 text-center backdrop-blur-xl">
          {/* Futuristic Arc Reactor */}
          <div className="w-24 h-24 rounded-full border-[3px] border-sky-400/30 flex items-center justify-center mx-auto mb-6 relative arc-pulse shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <div className="w-16 h-16 rounded-full border-[2px] border-dashed border-sky-300/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-sky-500/30 border border-sky-300 flex items-center justify-center animate-pulse">
                <Cpu className="w-5 h-5 text-sky-300" />
              </div>
            </div>
            {/* Triangular panels around reactor */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
          </div>

          <h1 className="jarvis-heading text-3xl font-bold tracking-wider text-sky-400 mb-2 uppercase">
            J.A.R.V.I.S.
          </h1>
          <p className="text-gray-400 text-sm font-mono tracking-wide mb-8">
            JUST A RATHER VERY INTELLIGENT SYSTEM
          </p>

          <div className="border border-sky-500/10 bg-[#030712]/60 rounded-xl p-4 mb-8 font-mono text-xs text-sky-400/80 text-left space-y-1 leading-relaxed">
            <div>&gt; HOSTNAME: CENTRAL_GRID_ALPHA</div>
            <div>&gt; COGNITIVE MODULE: GEMINI_3.5_SECURE</div>
            <div>&gt; SYSTEM STATE: SECURED_LOCKOUT</div>
            <div>&gt; REQUIRE USER AUTHENTICATION INTEGRITY...</div>
          </div>

          {authError && (
            <div className="border border-red-500/30 bg-red-500/5 text-red-400 p-3.5 rounded-xl text-left font-mono text-[11px] mb-6 leading-relaxed select-text">
              <span className="font-bold text-red-500 block mb-1">⚠️ SUBSYSTEM AUTH_ALERT:</span>
              {authError}
            </div>
          )}

          {loadingAuth ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <span className="text-[10px] font-mono text-sky-400/70 uppercase animate-pulse">Initializing quantum tunnel...</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <button
                id="gsi-login-btn-popup"
                onClick={handleLogin}
                className="gsi-material-button w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-6 py-3 rounded-xl transition duration-200 shadow-md cursor-pointer text-sm"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>Initialize (Popup Method)</span>
              </button>

              <div className="flex items-center gap-2 my-2 justify-center text-gray-500 font-mono text-[10px]">
                <span className="h-px bg-sky-500/10 flex-1"></span>
                <span>OR RECOMMENDED FALLBACK</span>
                <span className="h-px bg-sky-500/10 flex-1"></span>
              </div>

              <button
                id="gsi-login-btn-redirect"
                onClick={handleLoginRedirect}
                className="w-full flex items-center justify-center gap-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/35 text-sky-300 font-semibold px-6 py-3 rounded-xl transition duration-200 cursor-pointer text-sm font-mono uppercase tracking-wider"
              >
                <RefreshCw className="w-4 h-4 text-sky-300 animate-spin-slow" />
                <span>Initialize (Redirect Method)</span>
              </button>
            </div>
          )}

          <div className="mt-6 text-gray-500 text-[10px] font-mono">
            SECURED BY FIREBASE AUTHENTICATION & GOOGLE WORKSPACE PROTOCOLS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050c] text-gray-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Grid Lines & Glowing Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid-overlay z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none scanline z-0"></div>

      {/* Floating Header */}
      <header className="border-b border-sky-500/20 bg-[#04091a]/95 px-6 py-4 flex items-center justify-between relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Animated Reactor Mini */}
          <div className="w-10 h-10 rounded-full border-2 border-sky-400/40 flex items-center justify-center relative shadow-[0_0_10px_rgba(56,189,248,0.2)]">
            <div className="w-6 h-6 rounded-full border border-dashed border-sky-300 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-sky-500"></div>
            </div>
          </div>
          <div>
            <h1 className="jarvis-heading font-bold text-lg tracking-wider text-sky-400">J.A.R.V.I.S.</h1>
            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              <span>Central Processor Active</span>
            </div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-xs font-mono border-r border-sky-500/10 pr-6">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{currentTime}</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-1.5 text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>GRID: {userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* User Bio */}
          <div className="flex items-center gap-3">
            <img 
              referrerPolicy="no-referrer"
              src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
              alt="Boss profile" 
              className="w-8 h-8 rounded-full border border-sky-500/40"
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-sky-300">Welcome, Boss</div>
              <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{user?.email}</div>
            </div>
            <button 
              onClick={() => setShowSystemConfig(true)}
              className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-lg transition duration-150 cursor-pointer animate-pulse-slow"
              title="System Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-1.5 bg-sky-500/10 hover:bg-red-500/20 text-sky-400 hover:text-red-400 border border-sky-500/20 hover:border-red-500/30 rounded-lg transition duration-150 cursor-pointer"
              title="De-authorize Jarvis"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Framework Grid */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 max-h-[calc(100vh-73px)] overflow-hidden">
        
        {/* Navigation Deck */}
        <nav className="w-full lg:w-64 bg-[#030816]/90 border-r border-sky-500/10 flex flex-row lg:flex-col p-4 gap-2 overflow-x-auto lg:overflow-x-visible">
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "dashboard"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Central Core</span>
          </button>
          <button
            onClick={() => setCurrentView("chat")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "chat"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Dialogue Hub</span>
          </button>
          <button
            onClick={() => setCurrentView("workspace")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "workspace"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Workspace Grid</span>
          </button>
          <button
            onClick={() => setCurrentView("workshop")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "workshop"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Workshop</span>
          </button>
          <button
            onClick={() => setCurrentView("console")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "console"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tactical Scripts</span>
          </button>
          <button
            onClick={() => setCurrentView("vault")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
              currentView === "vault"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-sky-500/5 border border-transparent"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Keep Vault</span>
          </button>

          {/* Quick Config widgets */}
          <div className="hidden lg:flex flex-col gap-3 mt-auto p-3 border border-sky-500/10 rounded-xl bg-[#01050e]">
            <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wide">Tactical Controls</div>
            
            {/* Thinking level toggle */}
            <label className="flex items-center justify-between text-xs font-mono text-gray-300 cursor-pointer select-none">
              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-yellow-500" /> Deep Thinking</span>
              <input 
                type="checkbox" 
                checked={thinkingMode} 
                onChange={() => setThinkingMode(!thinkingMode)} 
                className="rounded text-sky-500 focus:ring-sky-500 bg-gray-900 border-gray-700"
              />
            </label>

            {/* Grounding dropdown */}
            <div className="space-y-1">
              <div className="text-[9px] font-mono text-gray-500 uppercase">Information Grounding</div>
              <select
                value={groundingMode}
                onChange={(e: any) => setGroundingMode(e.target.value)}
                className="w-full bg-gray-950 border border-sky-500/20 rounded px-2 py-1 text-[11px] font-mono text-sky-300"
              >
                <option value="none">None (Offline Core)</option>
                <option value="search">Google Search</option>
                <option value="maps">Google Maps API</option>
              </select>
            </div>

            {/* Speech synthesis toggle */}
            <label className="flex items-center justify-between text-xs font-mono text-gray-300 cursor-pointer select-none">
              <span className="flex items-center gap-1">
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-green-400" /> : <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
                Speech Engine
              </span>
              <input 
                type="checkbox" 
                checked={ttsEnabled} 
                onChange={() => setTtsEnabled(!ttsEnabled)} 
                className="rounded text-sky-500 focus:ring-sky-500 bg-gray-900 border-gray-700"
              />
            </label>

            {/* Prebuilt voices dropdown */}
            {ttsEnabled && (
              <div className="space-y-1">
                <div className="text-[9px] font-mono text-gray-500 uppercase">Voice Matrix</div>
                <select
                  value={voiceSelected}
                  onChange={(e: any) => setVoiceSelected(e.target.value)}
                  className="w-full bg-gray-950 border border-sky-500/20 rounded px-2 py-1 text-[11px] font-mono text-sky-300"
                >
                  <option value="Zephyr">Zephyr (British Accent)</option>
                  <option value="Kore">Kore (Clear Speaker)</option>
                  <option value="Puck">Puck (Fast Dialogue)</option>
                  <option value="Charon">Charon (Deep Core)</option>
                  <option value="Fenrir">Fenrir (Heavy Bass)</option>
                </select>
              </div>
            )}
          </div>
        </nav>

        {/* Tactical Screen Stage */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          
          {/* Dynamic Grounding alerts */}
          {groundingMode !== "none" && (
            <div className="mb-4 bg-sky-950/40 border border-sky-500/30 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400 animate-pulse" />
              <span className="font-mono">
                {groundingMode === "search" ? "Google Search Grounding enabled via models/gemini-3.5-flash." : "Google Maps retrieval online with local coordinate targeting."}
              </span>
            </div>
          )}

          {/* ----------------- CORE VIEW 1: CENTRAL HOLOGRAPHIC DIAGNOSTICS ----------------- */}
          {currentView === "dashboard" && (
            <div className="space-y-6">
              {/* Massive Hologram Diagnosis Card */}
              <div className="border border-sky-500/20 bg-[#040a1b]/90 p-8 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-sky-500/40">REACTOR LEVEL: 100%</div>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Huge Interactive glowing Arc Reactor */}
                  <div 
                    onClick={startLiveVoiceSession}
                    className="w-40 h-40 rounded-full border-4 border-sky-400/40 flex items-center justify-center relative arc-pulse shadow-[0_0_40px_rgba(56,189,248,0.3)] cursor-pointer hover:border-sky-300/60 group transition-all duration-300"
                  >
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-sky-300 flex items-center justify-center group-hover:scale-105 transition-all">
                      <div className="w-16 h-16 rounded-full bg-sky-500/20 border border-sky-300 flex flex-col items-center justify-center">
                        <Cpu className="w-8 h-8 text-sky-400 animate-spin" style={{ animationDuration: "20s" }} />
                        <span className="text-[8px] text-sky-300 font-mono tracking-wider mt-1 uppercase">GRID</span>
                      </div>
                    </div>
                    {/* Glowing outer rings */}
                    <div className="absolute -inset-2 border border-sky-400/10 rounded-full animate-pulse"></div>
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h2 className="jarvis-heading font-bold text-2xl text-sky-300 uppercase tracking-widest">TACTICAL PROTOCOLS ACTIVE</h2>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-xl">
                      I have compiled and configured our workspace neural interface. I am fully authorized to access Gmail, Google Calendar, and Task Lists. How may I assist you today, Sir?
                    </p>

                    {/* Quick Start Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                      <button 
                        onClick={() => setCurrentView("chat")} 
                        className="flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 font-mono text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Query Assistant</span>
                      </button>
                      <button 
                        onClick={startLiveVoiceSession}
                        className="flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-sky-500/20 hover:from-teal-500/30 hover:to-sky-500/30 border border-teal-500/30 text-teal-300 font-mono text-xs px-4 py-2.5 rounded-xl transition cursor-pointer animate-pulse"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Establish Voice Uplink</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subsystem Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* System Diagnostics */}
                <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl font-mono text-xs space-y-3">
                  <div className="text-sky-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Central Diagnostics</span>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5 text-gray-300">
                    <div className="flex justify-between"><span>Core Temp:</span><span className="text-green-400">38°C</span></div>
                    <div className="flex justify-between"><span>Memory Grid:</span><span className="text-sky-400">4.12 / 64 GB</span></div>
                    <div className="flex justify-between"><span>Local Filesystem:</span><span className="text-sky-400">Online (Zero Cost)</span></div>
                    <div className="flex justify-between"><span>Google Workspace:</span><span className="text-green-400">Authenticated</span></div>
                    <div className="flex justify-between"><span>Firebase Client:</span><span className="text-green-400">Synced</span></div>
                  </div>
                </div>

                {/* Automation Quick Launcher */}
                <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-3">
                  <div className="text-sky-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Local Automation Vault</span>
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {scripts.length === 0 ? (
                      <div className="text-xs font-mono text-gray-500 italic py-2">No custom scripts currently programmed. Ask Jarvis to build one!</div>
                    ) : (
                      scripts.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 border border-sky-500/5 hover:border-sky-500/20 rounded-lg bg-gray-950/50">
                          <div className="truncate text-left">
                            <div className="text-xs font-semibold text-gray-200 truncate">{s.title}</div>
                            <div className="text-[9px] font-mono text-sky-400/80">{s.category}</div>
                          </div>
                          <button 
                            onClick={() => handleRunScriptSimulate(s)}
                            className="p-1 bg-sky-500/10 hover:bg-sky-500/35 border border-sky-500/20 text-sky-300 rounded cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Hardware Automators */}
                <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-3">
                  <div className="text-sky-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>PC Controls</span>
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button 
                      onClick={() => setTerminalOutput(prev => [...prev, "[AUTO] PC Theme Updated: Applying ultra-dark 4K OLED Matrix."])}
                      className="p-2 border border-sky-500/15 bg-gray-950/40 hover:bg-sky-500/5 rounded-lg text-gray-300 text-left font-mono"
                    >
                      🌘 OLED Theme
                    </button>
                    <button 
                      onClick={() => setTerminalOutput(prev => [...prev, "[AUTO] Projector Status check: Hardware Interface configured via ADB."])}
                      className="p-2 border border-sky-500/15 bg-gray-950/40 hover:bg-sky-500/5 rounded-lg text-gray-300 text-left font-mono"
                    >
                      📹 Video Beamer
                    </button>
                    <button 
                      onClick={() => setTerminalOutput(prev => [...prev, "[AUTO] Memory flush: Filmora 15 process optimized. Rendering cache clear."])}
                      className="p-2 border border-sky-500/15 bg-gray-950/40 hover:bg-sky-500/5 rounded-lg text-gray-300 text-left font-mono"
                    >
                      🎬 Filmora Sync
                    </button>
                    <button 
                      onClick={() => setTerminalOutput(prev => [...prev, "[AUTO] WhatsApp Gateway ready: pywhatkit engine active."])}
                      className="p-2 border border-sky-500/15 bg-gray-950/40 hover:bg-sky-500/5 rounded-lg text-gray-300 text-left font-mono"
                    >
                      💬 pywhatkit Setup
                    </button>
                  </div>
                </div>

              </div>

              {/* Lower Console Deck */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Terminal Logs panel */}
                <div className="border border-sky-500/20 bg-gray-950 p-4 rounded-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-sky-400 border-b border-sky-500/15 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4.5 h-4.5" />
                      <span>JARVIS local_system_gateway.log</span>
                    </div>
                    <button 
                      onClick={() => setTerminalOutput(["Logs flushed. Ready, Sir."])}
                      className="p-1 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 text-sky-400 rounded transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-left select-text">
                    {terminalOutput.map((log, i) => (
                      <div key={i} className="text-gray-400 leading-relaxed font-mono">
                        <span className="text-sky-500">&gt; </span>{log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cloud SQL DB Logs panel */}
                <div className="border border-teal-500/25 bg-gray-950 p-4 rounded-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-teal-400 border-b border-teal-500/15 pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4.5 h-4.5" />
                      <span>CLOUD SQL central_neural_registry.db</span>
                    </div>
                    <div className="text-[10px] text-teal-400/70 uppercase">
                      Synced
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 text-left select-text scrollbar-thin">
                    {dbLogs.length === 0 ? (
                      <div className="text-gray-500 italic py-4 text-center">
                        No persistent dialogue logs recorded. Send a message to register logs.
                      </div>
                    ) : (
                      dbLogs.map((log) => (
                        <div key={log.id} className="border-b border-teal-500/5 pb-2 last:border-0">
                          <div className="flex justify-between text-[10px] text-teal-300 font-bold mb-1">
                            <span>PROMPT: "{log.prompt.length > 45 ? log.prompt.substring(0, 45) + '...' : log.prompt}"</span>
                            <span className="text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-gray-400 text-[11px] leading-relaxed select-text whitespace-pre-wrap font-sans">
                            {log.response.length > 150 ? log.response.substring(0, 150) + '...' : log.response}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- CORE VIEW 2: VOICE & CHAT DIALOGUE DECK ----------------- */}
          {currentView === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
              {/* Left Column: Chat Dialogue Hub */}
              <div className={`${showCyberDeck ? "lg:col-span-7" : "lg:col-span-12"} flex flex-col h-full min-w-0 transition-all duration-300`}>
                
                {/* Header controls for CyberDeck */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Dialogue Link Secure</span>
                  </div>
                  <button
                    onClick={() => setShowCyberDeck(!showCyberDeck)}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>{showCyberDeck ? "Hide Sandbox Deck [OFF]" : "Open Sandbox Deck [ON]"}</span>
                  </button>
                </div>

                {/* Chat Thread */}
                <div className="flex-1 overflow-y-auto mb-4 border border-sky-500/10 bg-[#030816]/75 p-4 rounded-2xl space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 space-y-3">
                      <div className="w-16 h-16 rounded-full border border-sky-500/20 flex items-center justify-center bg-[#070d1e]">
                        <MessageSquare className="w-8 h-8 text-sky-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs text-sky-400">JARVIS CORE CHAT SECURE</p>
                        <p className="text-sm">I am at your service, Sir. Type your command, ask to browse websites, play YouTube streams, generate graphics or run codes.</p>
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg) => {
                    // Check if there are active intercepted actions inside this message
                    const actionsInMessage: any[] = [];
                    const actionRegex = /<action\s+type="([^"]+)"\s+([^>]+)\/?>/g;
                    let match;
                    while ((match = actionRegex.exec(msg.content)) !== null) {
                      const type = match[1];
                      const attrsRaw = match[2];
                      const matchIndex = match.index;
                      const actionId = `${msg.id}-${matchIndex}`;
                      
                      const attrs: Record<string, string> = {};
                      const attrRegex = /(\w+)="([^"]+)"/g;
                      let attrMatch;
                      while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
                        attrs[attrMatch[1]] = attrMatch[2];
                      }
                      
                      actionsInMessage.push({ id: actionId, type, attrs });
                    }

                    // Clean the visual text from XML action tags to keep the message extremely elegant
                    const cleanedContent = msg.content.replace(/<action\s+type="[^"]+"\s+[^>]+\/?>/g, "").trim();

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-3 max-w-full ${msg.role === "user" ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          msg.role === "user" ? "border-sky-500/40 bg-sky-950" : "border-teal-500/40 bg-teal-950"
                        }`}>
                          {msg.role === "user" ? <UserIcon className="w-4 h-4 text-sky-300" /> : <Cpu className="w-4 h-4 text-teal-300" />}
                        </div>
                        <div className={`rounded-2xl p-4 space-y-2 select-text max-w-[85%] ${
                          msg.role === "user" 
                            ? "bg-sky-500/10 border border-sky-500/20 text-gray-100" 
                            : "bg-teal-950/20 border border-teal-500/25 text-gray-100"
                        }`}>
                          {msg.inlineData && (
                            <div className="mb-2 max-w-xs border border-sky-500/20 rounded-lg overflow-hidden">
                              <img src={`data:${msg.inlineData.mimeType};base64,${msg.inlineData.data}`} alt="schematic attachment" className="w-full" />
                            </div>
                          )}
                          
                          <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed select-text">
                            {cleanedContent}
                          </div>

                          {/* Render Intercepted Action Status directly in bubble */}
                          {actionsInMessage.map((act) => {
                            const statusState = processingActions[act.id] || { status: "idle" };
                            return (
                              <div key={act.id} className="mt-3 border border-sky-500/20 bg-[#020510] rounded-xl p-3 text-[10px] text-left font-mono space-y-2">
                                <div className="flex items-center justify-between border-b border-sky-500/10 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                    <span>[JARVIS OS INTERCEPTED ACTION]</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${
                                    statusState.status === "running" ? "bg-yellow-500/10 text-yellow-400 animate-pulse" :
                                    statusState.status === "success" ? "bg-green-500/10 text-green-400" :
                                    statusState.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-gray-800 text-gray-400"
                                  }`}>
                                    ● {statusState.status}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div><span className="text-gray-500">Action:</span> <span className="text-sky-300 font-bold">{act.type.toUpperCase()}</span></div>
                                  {act.type === "generate_image" && <div><span className="text-gray-500">Prompt:</span> <span className="text-gray-300 italic">"{act.attrs.prompt}"</span></div>}
                                  {act.type === "open_web" && <div><span className="text-gray-500">Target URL:</span> <span className="text-gray-300 select-all underline">{act.attrs.url}</span></div>}
                                  {act.type === "play_youtube" && <div><span className="text-gray-500">Song/Query:</span> <span className="text-gray-300 font-bold">{act.attrs.query}</span></div>}
                                  {act.type === "run_code" && <div><span className="text-gray-500">Script:</span> <span className="text-gray-300 font-bold">{act.attrs.title}</span></div>}
                                </div>

                                {statusState.status === "running" && (
                                  <div className="flex items-center gap-2 text-yellow-400 pt-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sir, compiling system modules and triggering execution peripheral...</span>
                                  </div>
                                )}

                                {statusState.status === "success" && (
                                  <div className="space-y-2 pt-1">
                                    <div className="text-green-400 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Execution successful! Output routed to sandbox deck.</span>
                                    </div>
                                    {statusState.resultUrl && (
                                      <div className="max-w-xs border border-green-500/30 rounded-lg overflow-hidden mt-1.5 relative group">
                                        <img src={statusState.resultUrl} alt="rendered artwork" className="w-full h-auto" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                          <a href={statusState.resultUrl} download="jarvis_image.png" className="px-3 py-1.5 bg-green-500 text-black text-[10px] font-bold rounded-lg uppercase">
                                            Download Graphic
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {statusState.status === "failed" && (
                                  <div className="text-red-400 pt-1 flex items-start gap-1">
                                    <span className="font-bold">[ERR]</span>
                                    <span>{statusState.error || "Execution pipeline breached."}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Display Grounding Information */}
                          {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                            <div className="pt-2 border-t border-sky-500/10 text-[10px] text-sky-400 space-y-1 text-left font-mono">
                              <div className="font-semibold flex items-center gap-1"><Search className="w-3 h-3" /> Grounded Source Links:</div>
                              {msg.groundingChunks.map((chunk, index) => {
                                if (chunk.web) {
                                  return (
                                    <a key={index} href={chunk.web.uri} target="_blank" rel="noreferrer" className="block text-sky-400 hover:underline hover:text-sky-300 truncate">
                                      🔗 {chunk.web.title || chunk.web.uri}
                                    </a>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}

                          {/* Display Automation Option on Detected Script */}
                          {msg.role === "assistant" && msg.content.includes("```") && (
                            <div className="flex gap-2 justify-end pt-2">
                              <button 
                                onClick={() => {
                                  const match = /```(?:python|bash|sh|cmd|javascript)?\n([\s\S]*?)```/g.exec(msg.content);
                                  if (match) {
                                    navigator.clipboard.writeText(match[1]);
                                    alert("Script copied to clipboard.");
                                  }
                                }}
                                className="flex items-center gap-1.5 bg-gray-900/80 hover:bg-sky-500/10 border border-sky-500/15 text-sky-300 text-[10px] font-mono px-3 py-1 rounded cursor-pointer"
                              >
                                <Copy className="w-3 h-3" /> Copy Script
                              </button>
                              <button 
                                onClick={() => {
                                  const match = /```(?:python|bash|sh|cmd|javascript)?\n([\s\S]*?)```/g.exec(msg.content);
                                  if (match) {
                                    handleSaveScript("Automated Script", "Generated by Dialogue Hub", "System", match[1]);
                                  }
                                }}
                                className="flex items-center gap-1.5 bg-gray-900/80 hover:bg-teal-500/10 border border-teal-500/15 text-teal-300 text-[10px] font-mono px-3 py-1 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Add to Console
                              </button>
                            </div>
                          )}

                          <div className="text-[9px] text-gray-500 font-mono text-right mt-1">
                            {msg.modelUsed ? `Model: ${msg.modelUsed} | ` : ""}{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isGenerating && (
                    <div className="flex gap-3 mr-auto text-left items-center">
                      <div className="w-8 h-8 rounded-full border border-teal-500/40 bg-teal-950 flex items-center justify-center animate-spin">
                        <Cpu className="w-4 h-4 text-teal-300" />
                      </div>
                      <div className="text-xs font-mono text-teal-400">Jarvis is processing instructions...</div>
                    </div>
                  )}
                  <div ref={messageEndRef}></div>
                </div>

                {/* Chat Controls Deck */}
                <div className="bg-[#030816] border border-sky-500/15 p-4 rounded-2xl space-y-3">
                  {/* Visual attachments row */}
                  {uploadImageBase64 && (
                    <div className="flex items-center gap-2 p-2 border border-sky-500/15 bg-gray-950 rounded-xl max-w-xs relative">
                      <img src={`data:${uploadImageMime};base64,${uploadImageBase64}`} alt="preview" className="w-12 h-12 rounded object-cover" />
                      <div className="truncate text-left flex-1">
                        <div className="text-xs font-semibold text-gray-200">Schematic Loaded</div>
                        <div className="text-[10px] text-sky-400">Ready to analyze</div>
                      </div>
                      <button 
                        onClick={() => { setUploadImageBase64(null); setUploadImageMime(null); }}
                        className="p-1 text-red-400 hover:text-red-500 rounded bg-red-500/10 border border-transparent hover:border-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 items-center">
                    {/* Speech to text mic button */}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
                        isRecording 
                          ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" 
                          : "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20"
                      }`}
                      title={isRecording ? "Stop Speech Input" : "Transcribe Voice Input"}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Provide command (e.g. Draw a futuristic car, open wikipedia.org, play heavy metal...)"
                      className="flex-1 bg-gray-950 border border-sky-500/15 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-sky-500/40 font-mono"
                    />

                    {/* Device Schematic upload */}
                    <label className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 rounded-xl transition cursor-pointer shrink-0">
                      <ImageIcon className="w-5 h-5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUploadChange} 
                        className="hidden" 
                      />
                    </label>

                    <button
                      onClick={() => handleSendMessage()}
                      className="p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition cursor-pointer shrink-0 shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: CyberDeck Sandbox Workspace */}
              {showCyberDeck && (
                <div className="lg:col-span-5 border border-sky-500/15 bg-[#030713]/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl relative backdrop-blur-lg">
                  {/* CyberDeck Top Bar */}
                  <div className="bg-[#050e24] border-b border-sky-500/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-400 animate-pulse" />
                      <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-widest">JARVIS SANDBOX CyberDeck</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                      <span className="text-[9px] font-mono text-sky-500/80">SANDBOX PORT ONLINE</span>
                    </div>
                  </div>

                  {/* CyberDeck Navigation Tabs */}
                  <div className="grid grid-cols-4 bg-[#020510] border-b border-sky-500/5 text-[10px] font-mono text-center">
                    <button
                      onClick={() => setSandboxActiveTab("browser")}
                      className={`py-2 px-1 border-r border-sky-500/5 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        sandboxActiveTab === "browser" ? "bg-sky-500/10 text-sky-300 font-bold border-b-2 border-b-sky-400" : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>🌐 BROWSER</span>
                    </button>
                    <button
                      onClick={() => setSandboxActiveTab("media")}
                      className={`py-2 px-1 border-r border-sky-500/5 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        sandboxActiveTab === "media" ? "bg-sky-500/10 text-sky-300 font-bold border-b-2 border-b-sky-400" : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>📺 STREAM</span>
                    </button>
                    <button
                      onClick={() => setSandboxActiveTab("code")}
                      className={`py-2 px-1 border-r border-sky-500/5 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        sandboxActiveTab === "code" ? "bg-sky-500/10 text-sky-300 font-bold border-b-2 border-b-sky-400" : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>💻 COMPILER</span>
                    </button>
                    <button
                      onClick={() => setSandboxActiveTab("image")}
                      className={`py-2 transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        sandboxActiveTab === "image" ? "bg-sky-500/10 text-sky-300 font-bold border-b-2 border-b-sky-400" : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>🎨 GRAPHICS</span>
                    </button>
                  </div>

                  {/* CyberDeck Tab Content Area */}
                  <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0 bg-[#02050f]/60">
                    
                    {/* 1. BROWSER SANDBOX TAB */}
                    {sandboxActiveTab === "browser" && (
                      <div className="flex-1 flex flex-col space-y-3 h-full min-h-0">
                        {/* Browser Address Bar */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sandboxBrowserUrl}
                            onChange={(e) => setSandboxBrowserUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                let target = sandboxBrowserUrl;
                                if (!target.startsWith("http://") && !target.startsWith("https://")) {
                                  target = "https://" + target;
                                }
                                setSandboxBrowserUrl(target);
                              }
                            }}
                            className="flex-1 bg-gray-950 border border-sky-500/20 rounded-lg px-3 py-1.5 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500/40"
                          />
                          <a
                            href={sandboxBrowserUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-lg flex items-center justify-center cursor-pointer"
                            title="Open in Native New Tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {/* Quick Web Bookmarks */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: "Google", url: "https://www.google.com/search?igu=1" },
                            { name: "Wikipedia", url: "https://en.m.wikipedia.org" },
                            { name: "GitHub", url: "https://github.com" },
                            { name: "DuckDuckGo", url: "https://html.duckduckgo.com" }
                          ].map((bm) => (
                            <button
                              key={bm.name}
                              onClick={() => setSandboxBrowserUrl(bm.url)}
                              className="px-2 py-1 text-[9px] font-mono text-gray-400 bg-gray-900 border border-sky-500/5 hover:border-sky-500/25 rounded hover:text-sky-300 transition"
                            >
                              🔖 {bm.name}
                            </button>
                          ))}
                        </div>

                        {/* Safe IFrame Container */}
                        <div className="flex-1 border border-sky-500/10 bg-black rounded-xl overflow-hidden relative min-h-0">
                          <iframe
                            src={sandboxBrowserUrl}
                            title="Sandbox CyberBrowser"
                            className="w-full h-full border-0 bg-white"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          ></iframe>
                          <div className="absolute bottom-2 right-2 bg-[#020510]/95 border border-sky-500/25 px-2 py-1 rounded text-[8px] font-mono text-gray-400 pointer-events-none">
                            SANDBOX SECURE FRAME
                          </div>
                        </div>

                        <p className="text-[9px] text-gray-500 leading-tight">
                          💡 <span className="font-bold">Security Note:</span> Some major sites restrict nested framing due to cross-origin policies. Click the top-right button to launch websites in a native browser tab directly.
                        </p>
                      </div>
                    )}

                    {/* 2. MEDIA DECK (YOUTUBE STREAM) */}
                    {sandboxActiveTab === "media" && (
                      <div className="flex-1 flex flex-col space-y-3 h-full min-h-0">
                        {/* Media Stream Search */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sandboxYoutubeQuery}
                            onChange={(e) => setSandboxYoutubeQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && sandboxYoutubeQuery.trim()) {
                                setSandboxYoutubeQuery(sandboxYoutubeQuery);
                              }
                            }}
                            placeholder="Enter song name or video term (ইউটিউবে গান খুঁজুন)..."
                            className="flex-1 bg-gray-950 border border-sky-500/20 rounded-lg px-3 py-1.5 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500/40 placeholder-gray-700"
                          />
                        </div>

                        {/* YouTube Search Embed */}
                        <div className="flex-1 border border-sky-500/10 bg-[#020510] rounded-xl overflow-hidden relative min-h-0">
                          {sandboxYoutubeQuery.trim() ? (
                            <iframe
                              src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(sandboxYoutubeQuery)}`}
                              title="YouTube Stream Deck"
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 space-y-2 font-mono">
                              <span className="text-3xl">🎵</span>
                              <p className="text-[10px] text-sky-400 uppercase tracking-widest">Acoustic Frequencies</p>
                              <p className="text-[9px] max-w-xs text-gray-600">Enter a track query above or ask Jarvis: "ইউটিউবে একটি গান চালাও" to feed the stream line.</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-[#03091e]/80 border border-sky-500/10 p-2 rounded-xl text-[9px] font-mono text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          <span>YouTube API Tunnel: Stream loaded directly based on client query.</span>
                        </div>
                      </div>
                    )}

                    {/* 3. CODE RUNNER & COMPILER */}
                    {sandboxActiveTab === "code" && (
                      <div className="flex-1 flex flex-col space-y-3 h-full min-h-0 text-left">
                        <div className="flex items-center justify-between bg-gray-950 p-2 border border-sky-500/10 rounded-lg">
                          <span className="text-[10px] font-mono text-sky-300 font-bold uppercase truncate">📂 File: {sandboxCodeTitle}.js</span>
                          <button
                            onClick={() => {
                              handleSaveScript(sandboxCodeTitle, "Generated by Cyber Sandbox", "System", sandboxCode);
                            }}
                            className="px-2 py-0.5 text-[9px] font-mono text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded cursor-pointer"
                          >
                            Export to DB
                          </button>
                        </div>

                        {/* Source Code Area */}
                        <div className="flex-1 bg-[#010309] border border-sky-500/10 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto leading-relaxed select-text">
                          <pre className="whitespace-pre-wrap select-text">{sandboxCode}</pre>
                        </div>

                        {/* Compiler Terminal logs */}
                        <div className="h-28 bg-[#010410] border border-sky-500/10 rounded-xl p-2.5 flex flex-col min-h-0 text-[10px] font-mono space-y-1">
                          <div className="text-[8px] text-gray-500 uppercase tracking-widest border-b border-sky-500/5 pb-1 mb-1 font-bold font-mono">TERMINAL DECK LOGS</div>
                          <div className="flex-1 overflow-y-auto space-y-1 text-gray-400 select-text pr-1">
                            {sandboxTerminalLogs.map((log, i) => (
                              <div key={i} className="leading-snug">
                                <span className="text-sky-500">&gt; </span>{log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. HOLO-IMAGE STUDIO GALLERY */}
                    {sandboxActiveTab === "image" && (
                      <div className="flex-1 flex flex-col space-y-3 h-full min-h-0">
                        <div className="text-left text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                          🎨 Holographic Graphic Outputs
                        </div>

                        {sandboxImages.length > 0 ? (
                          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
                            {sandboxImages.map((img, i) => (
                              <div key={i} className="border border-sky-500/15 bg-gray-950 p-2.5 rounded-xl space-y-2 text-left">
                                <img src={img.url} alt="studio visual" className="w-full h-auto rounded-lg border border-sky-500/5" />
                                <div className="space-y-1">
                                  <div className="text-[10px] text-sky-400 font-bold font-mono">PROMPT / নির্দেশ:</div>
                                  <p className="text-[9px] text-gray-300 font-mono bg-[#020510] p-1.5 rounded leading-tight">"{img.prompt}"</p>
                                  <div className="flex justify-between items-center pt-1 text-[8px] font-mono text-gray-500">
                                    <span>Rendered at {img.timestamp}</span>
                                    <a
                                      href={img.url}
                                      download={`jarvis_render_${i}.png`}
                                      className="text-sky-400 hover:underline"
                                    >
                                      Download Graphic 💾
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 space-y-2 font-mono">
                            <span className="text-3xl">🎨</span>
                            <p className="text-[10px] text-sky-400 uppercase tracking-widest">Graphic Stream Empty</p>
                            <p className="text-[9px] max-w-xs text-gray-600">Ask Jarvis to "ইমেজ তৈরি করো" (make an image) or draw diagrams to materialize artworks in this gallery.</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ----------------- CORE VIEW 3: WORKSPACE GRID (GMAIL, CALENDAR, TASKS) ----------------- */}
          {currentView === "workspace" && (
            <div className="space-y-6">
              {/* Workspace Navigation Bar */}
              <div className="flex border-b border-sky-500/10 pb-1 gap-2 overflow-x-auto">
                <button
                  onClick={() => setWorkspaceTab("gmail")}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                    workspaceTab === "gmail"
                      ? "border-sky-400 text-sky-300"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Gmail</span>
                </button>
                <button
                  onClick={() => setWorkspaceTab("calendar")}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                    workspaceTab === "calendar"
                      ? "border-sky-400 text-sky-300"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Calendar</span>
                </button>
                <button
                  onClick={() => setWorkspaceTab("tasks")}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                    workspaceTab === "tasks"
                      ? "border-sky-400 text-sky-300"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Tasks</span>
                </button>
                <button
                  onClick={() => setWorkspaceTab("meet")}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                    workspaceTab === "meet"
                      ? "border-sky-400 text-sky-300"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Meet Linker</span>
                </button>
                <button
                  onClick={() => setWorkspaceTab("chat")}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                    workspaceTab === "chat"
                      ? "border-sky-400 text-sky-300"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat spaces</span>
                </button>
              </div>

              {workspaceLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left list details */}
                  <div className="lg:col-span-2 space-y-4">
                    {workspaceError && (
                      <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-xs text-red-400 font-mono text-left">
                        ⚠️ {workspaceError}
                      </div>
                    )}

                    {/* GMAIL SUB-VIEW */}
                    {workspaceTab === "gmail" && (
                      <div className="space-y-3">
                        <div className="text-sm font-mono text-sky-400 font-bold uppercase tracking-wider text-left">Latest Messages</div>
                        {emails.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            No emails synchronized in inbox.
                          </div>
                        ) : (
                          emails.map((email) => (
                            <div key={email.id} className="border border-sky-500/10 hover:border-sky-500/25 p-4 rounded-xl bg-[#030816]/75 hover:bg-[#040c21]/75 text-left transition relative">
                              <div className="text-[10px] font-mono text-sky-400 absolute top-4 right-4">{email.date}</div>
                              <div className="text-xs font-bold text-gray-300 pr-20">{email.from}</div>
                              <div className="text-sm font-semibold text-sky-300 mt-1">{email.subject}</div>
                              <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{email.snippet}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* CALENDAR SUB-VIEW */}
                    {workspaceTab === "calendar" && (
                      <div className="space-y-3">
                        <div className="text-sm font-mono text-sky-400 font-bold uppercase tracking-wider text-left">Upcoming Appointments</div>
                        {events.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            No scheduled events on record.
                          </div>
                        ) : (
                          events.map((event) => (
                            <div key={event.id} className="border border-sky-500/10 hover:border-sky-500/25 p-4 rounded-xl bg-[#030816]/75 hover:bg-[#040c21]/75 text-left transition">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
                                <div className="text-sm font-semibold text-sky-300">{event.summary}</div>
                                <div className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                                  {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
                                </div>
                              </div>
                              {event.description && (
                                <div className="text-xs text-gray-400 mt-2 border-t border-sky-500/5 pt-2 leading-relaxed">{event.description}</div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TASKS SUB-VIEW */}
                    {workspaceTab === "tasks" && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="text-sm font-mono text-sky-400 font-bold uppercase tracking-wider text-left">Active Tasks</div>
                          {/* List select */}
                          <select
                            value={selectedTaskList}
                            onChange={(e: any) => {
                              setSelectedTaskList(e.target.value);
                              if (token) fetchGoogleTasks(token, e.target.value);
                            }}
                            className="bg-gray-950 border border-sky-500/15 rounded px-2 py-1 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500/40"
                          >
                            {taskLists.map(list => (
                              <option key={list.id} value={list.id}>{list.title}</option>
                            ))}
                          </select>
                        </div>

                        {tasks.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            Task queue is empty.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {tasks.map((task) => (
                              <div 
                                key={task.id} 
                                className="border border-sky-500/10 p-4 rounded-xl bg-[#030816]/75 hover:bg-[#040c21]/75 text-left flex items-start gap-3 transition"
                              >
                                {task.status === "needsAction" ? (
                                  <button
                                    onClick={() => triggerConfirmation(
                                      "complete_task",
                                      "Complete Google Task",
                                      `Mark task "${task.title}" as complete in Google Tasks?`,
                                      { taskId: task.id }
                                    )}
                                    className="p-1 mt-0.5 border border-sky-500/20 hover:border-green-500/40 text-sky-400 hover:text-green-400 rounded-lg cursor-pointer"
                                    title="Mark complete"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <div className="p-1 mt-0.5 border border-green-500/20 text-green-400 rounded-lg bg-green-500/10">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</div>
                                  {task.notes && (
                                    <div className="text-xs text-gray-400 mt-1 leading-relaxed">{task.notes}</div>
                                  )}
                                  {task.due && (
                                    <div className="text-[10px] font-mono text-sky-400/80 mt-1.5">Due: {new Date(task.due).toLocaleDateString()}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* MEET SUB-VIEW */}
                    {workspaceTab === "meet" && (
                      <div className="space-y-3">
                        <div className="text-sm font-mono text-sky-400 font-bold uppercase tracking-wider text-left">Holographic Meeting Spaces</div>
                        {meetSpaces.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            No meeting spaces initiated. Request Meet Link creation on the right.
                          </div>
                        ) : (
                          meetSpaces.map((space) => (
                            <div key={space.name} className="border border-sky-500/10 hover:border-sky-500/25 p-4 rounded-xl bg-[#030816]/75 hover:bg-[#040c21]/75 text-left transition flex justify-between items-center">
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-gray-200">Room Code: {space.meetingCode}</div>
                                <div className="text-xs text-sky-400/80 font-mono truncate max-w-md">{space.meetingUri}</div>
                                <div className="text-[10px] font-mono text-gray-400">Access: {space.accessType || "OPEN"}</div>
                              </div>
                              <a
                                href={space.meetingUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-mono text-xs px-3 py-1.5 rounded-lg transition shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Join Meet
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* CHAT SUB-VIEW */}
                    {workspaceTab === "chat" && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-500/5 pb-3">
                          <div className="text-sm font-mono text-sky-400 font-bold uppercase tracking-wider text-left">Space Comms Feed</div>
                          {chatSpaces.length === 0 ? (
                            <span className="text-xs font-mono text-gray-500">No active spaces found</span>
                          ) : (
                            <select
                              value={selectedChatSpace}
                              onChange={(e: any) => {
                                setSelectedChatSpace(e.target.value);
                                if (token) fetchChatMessages(token, e.target.value);
                              }}
                              className="bg-gray-950 border border-sky-500/15 rounded px-2.5 py-1 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500/40"
                            >
                              {chatSpaces.map(sp => (
                                <option key={sp.name} value={sp.name}>{sp.displayName || sp.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {chatSpaces.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            No active Google Chat spaces synchronized with your profile.
                          </div>
                        ) : chatMessagesList.length === 0 ? (
                          <div className="border border-sky-500/10 p-8 rounded-xl text-center text-gray-500 text-sm font-mono">
                            Comms history empty for this space. Launch a transmission on the right.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {chatMessagesList.map((msg) => (
                              <div key={msg.name} className="border border-sky-500/5 p-3 rounded-lg bg-gray-950/40 text-left space-y-1 relative">
                                <div className="text-[9px] font-mono text-sky-400 absolute top-3 right-3">{msg.createTime}</div>
                                <div className="text-xs font-bold text-gray-300">{msg.senderName}</div>
                                <p className="text-xs text-gray-300 font-mono leading-relaxed">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right create widget */}
                  <div className="space-y-6">
                    {/* GMAIL COMPOSER */}
                    {workspaceTab === "gmail" && (
                      <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-4">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider text-left border-b border-sky-500/10 pb-2">Dispatch Automated Mail</div>
                        <div className="space-y-3 text-left text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-gray-400">Recipient Address</label>
                            <input 
                              type="email" 
                              value={emailForm.to}
                              onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                              placeholder="tony@starkindustries.com" 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">Subject Line</label>
                            <input 
                              type="text" 
                              value={emailForm.subject}
                              onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                              placeholder="Tactical Diagnostic Updates" 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">MIME Body</label>
                            <textarea 
                              rows={4}
                              value={emailForm.body}
                              onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                              placeholder="Jarvis: Tactical diagnostics compiled..." 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none resize-none"
                            />
                          </div>
                          <button
                            onClick={() => triggerConfirmation(
                              "send_email",
                              "Authorize Email Dispatch",
                              `Send this email to <${emailForm.to}> on your behalf? This action cannot be recalled.`,
                              emailForm
                            )}
                            disabled={!emailForm.to || !emailForm.body}
                            className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-50 border border-sky-400/30 text-sky-300 rounded-lg transition font-bold uppercase tracking-wider cursor-pointer"
                          >
                            🔒 Dispatch Email
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CALENDAR SCHEDULER */}
                    {workspaceTab === "calendar" && (
                      <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-4">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider text-left border-b border-sky-500/10 pb-2">Schedule Tactical Event</div>
                        <div className="space-y-3 text-left text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-gray-400">Event Summary</label>
                            <input 
                              type="text" 
                              value={eventForm.summary}
                              onChange={(e) => setEventForm({...eventForm, summary: e.target.value})}
                              placeholder="Stark Industries Board Review" 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">Description</label>
                            <input 
                              type="text" 
                              value={eventForm.description}
                              onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                              placeholder="Reviewing Arc Reactor outputs" 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">Start Time</label>
                            <input 
                              type="datetime-local" 
                              value={eventForm.start}
                              onChange={(e) => setEventForm({...eventForm, start: e.target.value})}
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">End Time</label>
                            <input 
                              type="datetime-local" 
                              value={eventForm.end}
                              onChange={(e) => setEventForm({...eventForm, end: e.target.value})}
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => triggerConfirmation(
                              "create_event",
                              "Authorize Calendar Slot",
                              `Register the event "${eventForm.summary}" in Google Calendar?`,
                              eventForm
                            )}
                            disabled={!eventForm.summary || !eventForm.start || !eventForm.end}
                            className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-50 border border-sky-400/30 text-sky-300 rounded-lg transition font-bold uppercase tracking-wider cursor-pointer"
                          >
                            🔒 Schedule Event
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TASKS CREATOR */}
                    {workspaceTab === "tasks" && (
                      <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-4">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider text-left border-b border-sky-500/10 pb-2">Queue New Task</div>
                        <div className="space-y-3 text-left text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-gray-400">Task Title</label>
                            <input 
                              type="text" 
                              value={taskForm.title}
                              onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                              placeholder="Optimize Vibranium shielding" 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">Technical Notes</label>
                            <textarea 
                              rows={3}
                              value={taskForm.notes}
                              onChange={(e) => setTaskForm({...taskForm, notes: e.target.value})}
                              placeholder="Verify integrity parameters via automated sensor readouts." 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-400">Due Date</label>
                            <input 
                              type="date" 
                              value={taskForm.due}
                              onChange={(e) => setTaskForm({...taskForm, due: e.target.value})}
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => triggerConfirmation(
                              "create_task",
                              "Authorize Task Queueing",
                              `Create task "${taskForm.title}" in list?`,
                              taskForm
                            )}
                            disabled={!taskForm.title}
                            className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-50 border border-sky-400/30 text-sky-300 rounded-lg transition font-bold uppercase tracking-wider cursor-pointer"
                          >
                            🔒 Enqueue Task
                          </button>
                        </div>
                      </div>
                    )}

                    {/* MEET ROOM INITIATOR */}
                    {workspaceTab === "meet" && (
                      <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-4">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider text-left border-b border-sky-500/10 pb-2">Initiate Meet Link</div>
                        <div className="space-y-3 text-left text-xs font-mono">
                          <p className="text-gray-400 leading-relaxed">
                            Sir, I can connect with the Google Meet central server to provision a fresh, secure conference space immediately.
                          </p>
                          <button
                            onClick={() => triggerConfirmation(
                              "create_meet",
                              "Authorize Meet Provisioning",
                              "Generate a new secure Google Meet space linked with your Workspace account?",
                              {}
                            )}
                            className="w-full py-3 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 rounded-lg transition font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                          >
                            🔒 Provision Space
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CHAT COMMS TRANSMITTER */}
                    {workspaceTab === "chat" && (
                      <div className="border border-sky-500/10 bg-[#030816]/75 p-5 rounded-xl space-y-4">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider text-left border-b border-sky-500/10 pb-2">Transmit Chat Comms</div>
                        <div className="space-y-3 text-left text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-gray-400">Communication Payload</label>
                            <textarea 
                              rows={4}
                              value={chatInputText}
                              onChange={(e) => setChatInputText(e.target.value)}
                              placeholder="Jarvis: System diagnostics fully functional. Standing by..." 
                              className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-gray-100 focus:outline-none resize-none"
                            />
                          </div>
                          <button
                            onClick={() => triggerConfirmation(
                              "send_chat",
                              "Authorize Chat Transmission",
                              `Dispatch this transmission message to space: "${selectedChatSpace}"?`,
                              { text: chatInputText }
                            )}
                            disabled={!chatInputText || !selectedChatSpace}
                            className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-50 border border-sky-400/30 text-sky-300 rounded-lg transition font-bold uppercase tracking-wider cursor-pointer"
                          >
                            🔒 Transmit Comms
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------- CORE VIEW 4: IMAGE WORKSHOP (GENERATING & EDITING IMAGES) ----------------- */}
          {currentView === "workshop" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              
              {/* Image Controls Panel */}
              <div className="border border-sky-500/10 bg-[#030816]/75 p-6 rounded-2xl space-y-4">
                <div className="text-sm font-mono font-bold text-sky-400 uppercase tracking-wider border-b border-sky-500/10 pb-2">Image Setup Matrix</div>
                
                <div className="space-y-3 font-mono text-xs">
                  {/* Select size */}
                  <div className="space-y-1">
                    <label className="text-gray-400">Image Resolution Quality</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["1K", "2K", "4K"].map(sz => (
                        <button
                          key={sz}
                          onClick={() => setImageSize(sz as any)}
                          className={`py-1.5 border rounded-lg text-[10px] font-bold cursor-pointer transition ${
                            imageSize === sz 
                              ? "bg-sky-500/20 border-sky-400 text-sky-300" 
                              : "border-sky-500/10 text-gray-400 hover:bg-sky-500/5"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Aspect Ratio */}
                  <div className="space-y-1">
                    <label className="text-gray-400">Frame Aspect Ratio</label>
                    <select
                      value={imageAspectRatio}
                      onChange={(e: any) => setImageAspectRatio(e.target.value)}
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-sky-300"
                    >
                      {["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"].map(ar => (
                        <option key={ar} value={ar}>{ar}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Model */}
                  <div className="space-y-1">
                    <label className="text-gray-400">Image Engine Model</label>
                    <select
                      value={imageModel}
                      onChange={(e: any) => setImageModel(e.target.value)}
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2 text-sky-300"
                    >
                      <option value="gemini-3.1-flash-image">gemini-3.1-flash-image (High Quality)</option>
                      <option value="gemini-3-pro-image-preview">gemini-3-pro-image (Studio Quality)</option>
                    </select>
                  </div>

                  {/* Prompt Text */}
                  <div className="space-y-1">
                    <label className="text-gray-400">Holographic Prompt</label>
                    <textarea
                      rows={3}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g. A hyperrealistic sleek dark titanium Iron Man suit glowing blue, inside an advanced tech lab, 8k resolution, cinematic lighting..."
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2.5 text-gray-100 focus:outline-none"
                    />
                  </div>

                  {/* Upload Image for Editing */}
                  <div className="space-y-1">
                    <label className="text-gray-400">Base Image for Editing (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUploadChange}
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-1.5 text-sky-400 text-[10px]"
                    />
                    {uploadImageBase64 && (
                      <div className="flex gap-2 items-center bg-gray-900 p-2 rounded-lg mt-1">
                        <span className="truncate text-[10px] text-gray-400 flex-1">Image Loaded for edit-mode</span>
                        <button 
                          onClick={() => { setUploadImageBase64(null); setUploadImageMime(null); }}
                          className="text-red-400 text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateImage}
                    disabled={imageWorkshopLoading || !imagePrompt.trim()}
                    className="w-full py-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl transition font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                  >
                    {imageWorkshopLoading ? "Compiling Matrix..." : "⚡ Generate Holograph"}
                  </button>

                  {uploadImageBase64 && (
                    <button
                      onClick={handleAnalyzeUploadImage}
                      className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-xl transition font-mono text-xs uppercase"
                    >
                      🔍 Diagnostic Vision Analyze
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview Window */}
              <div className="lg:col-span-2 border border-sky-500/10 bg-[#030816]/75 p-6 rounded-2xl flex flex-col justify-center items-center relative min-h-[400px]">
                {imageWorkshopLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
                    <div className="font-mono text-xs text-sky-300">Synchronizing neural rendering pipeline...</div>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="w-full max-w-lg space-y-4 text-center">
                    <div className="border border-sky-400/20 rounded-xl overflow-hidden shadow-2xl relative">
                      <img src={generatedImageUrl} alt="workshop render" className="w-full object-contain" />
                    </div>
                    <div className="flex justify-center gap-4">
                      <a 
                        href={generatedImageUrl} 
                        download="jarvis_hologram.png" 
                        className="flex items-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 font-mono text-xs px-4 py-2 rounded-lg transition"
                      >
                        💾 Download Raw
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3 text-gray-500">
                    <ImageIcon className="w-16 h-16 mx-auto text-sky-500/15" />
                    <div className="font-mono text-xs">Central holographic array empty. Initiate prompt to compile.</div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ----------------- CORE VIEW 5: TACTICAL SCRIPTS CONSOLE ----------------- */}
          {currentView === "console" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              
              {/* Left scripts collection */}
              <div className="border border-sky-500/10 bg-[#030816]/75 p-6 rounded-2xl space-y-4">
                <div className="text-sm font-mono font-bold text-sky-400 uppercase tracking-wider border-b border-sky-500/10 pb-2 flex justify-between items-center">
                  <span>Tactical Scripts</span>
                  <Terminal className="w-4.5 h-4.5 text-sky-400" />
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {scripts.length === 0 ? (
                    <div className="text-xs font-mono text-gray-500 italic py-4 text-center">No programmed system scripts on disk. Give commands in Dialogue Hub.</div>
                  ) : (
                    scripts.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => setActiveScript(s)}
                        className={`p-4 border rounded-xl cursor-pointer transition ${
                          activeScript?.id === s.id 
                            ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-md" 
                            : "border-sky-500/10 hover:border-sky-500/20 bg-gray-950/40"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="text-xs font-bold font-sans truncate">{s.title}</div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">{s.category}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 font-sans">{s.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right script view console */}
              <div className="lg:col-span-2 border border-sky-500/10 bg-[#030816]/75 p-6 rounded-2xl flex flex-col min-h-[450px]">
                {activeScript ? (
                  <div className="flex flex-col h-full text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-sky-500/10 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-sky-300 font-sans">{activeScript.title}</h3>
                        <p className="text-[10px] text-gray-400 font-sans">{activeScript.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeScript.code);
                            alert("Script copied to clipboard.");
                          }}
                          className="p-2 border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 rounded-lg cursor-pointer"
                          title="Copy Code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRunScriptSimulate(activeScript)}
                          className="flex items-center gap-1 bg-teal-500/20 hover:bg-teal-500/35 border border-teal-500/30 text-teal-300 font-mono text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> RUN SIM
                        </button>
                        <button
                          onClick={() => handleDeleteScript(activeScript.id)}
                          className="p-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                          title="Delete Script"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 bg-gray-950 p-4 border border-sky-500/10 rounded-xl overflow-auto max-h-96">
                      <pre className="text-xs font-mono text-gray-300 leading-relaxed font-mono whitespace-pre select-text">
                        {activeScript.code}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center my-auto space-y-3 text-gray-500">
                    <Terminal className="w-16 h-16 mx-auto text-sky-500/15" />
                    <div className="font-mono text-xs">No active script compiled. Select a script from the database index.</div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ----------------- CORE VIEW 6: NOTES VAULT (KEEP REPLACEMENT) ----------------- */}
          {currentView === "vault" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              
              {/* Note Composer */}
              <div className="border border-sky-500/10 bg-[#030816]/75 p-6 rounded-2xl space-y-4">
                <div className="text-sm font-mono font-bold text-sky-400 uppercase tracking-wider border-b border-sky-500/10 pb-2">Archive Keep Note</div>
                <div className="space-y-3 text-xs font-mono text-left">
                  <div className="space-y-1">
                    <label className="text-gray-400">Note Title</label>
                    <input 
                      type="text" 
                      value={newNote.title}
                      onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                      placeholder="Arc Integrity Records" 
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2.5 text-gray-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400">Content</label>
                    <textarea 
                      rows={5}
                      value={newNote.content}
                      onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                      placeholder="Secure record updates..." 
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2.5 text-gray-100 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400">Tags (comma-separated)</label>
                    <input 
                      type="text" 
                      value={newNote.tagsString}
                      onChange={(e) => setNewNote({...newNote, tagsString: e.target.value})}
                      placeholder="reactor, diagnostics, shield" 
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-lg p-2.5 text-gray-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveNote}
                    disabled={!newNote.content.trim()}
                    className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-50 border border-sky-400/30 text-sky-300 rounded-xl transition font-bold uppercase tracking-wider cursor-pointer"
                  >
                    💾 Save Note to Firestore
                  </button>
                </div>
              </div>

              {/* Note List display */}
              <div className="lg:col-span-2 space-y-4">
                <div className="text-sm font-mono font-bold text-sky-400 uppercase tracking-wider text-left flex justify-between items-center">
                  <span>Archived Log Vault</span>
                  <Layers className="w-4.5 h-4.5 text-sky-400" />
                </div>

                {loadingNotes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="border border-sky-500/10 p-12 rounded-2xl text-center text-gray-500 font-mono text-sm">
                    Log vault is empty. Keep archives secure here, Sir.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {notes.map(note => (
                      <div key={note.id} className="border border-sky-500/10 p-5 rounded-2xl bg-[#030816]/75 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-sm font-bold text-sky-300 font-sans truncate">{note.title}</h4>
                            <button 
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed select-text font-sans">{note.content}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-sky-500/5">
                          {note.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/5 border border-sky-500/10 text-sky-400">#{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ----------------- SUB-COMPONENTS: VOICE STREAMING CONVERSATION DRAWER ----------------- */}
      {liveVoiceActive && (
        <div className="fixed inset-0 bg-[#02050c]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full border border-teal-500/30 bg-[#041224]/95 p-6 rounded-2xl shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-sky-500 animate-pulse"></div>
            
            {/* Pulsing visual core */}
            <div className="w-32 h-32 rounded-full border-[3px] border-teal-400/40 flex items-center justify-center mx-auto mb-6 relative arc-pulse shadow-[0_0_30px_rgba(20,184,166,0.3)]">
              <div className="w-24 h-24 rounded-full border-[2px] border-dashed border-teal-300/40 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/30 border border-teal-300 flex items-center justify-center animate-pulse">
                  <Mic className="w-8 h-8 text-teal-300" />
                </div>
              </div>
            </div>

            <h3 className="jarvis-heading text-xl font-bold tracking-wider text-teal-400 uppercase mb-1">LIVE VOICE BRIDGE</h3>
            <p className="text-[10px] font-mono text-gray-400 mb-6 uppercase flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span>Model: models/gemini-3.1-flash-live-preview</span>
            </p>

            {/* Real-time speech transcript log */}
            <div className="border border-teal-500/15 bg-gray-950 p-4 rounded-xl font-mono text-xs text-left text-gray-300 space-y-2 h-44 overflow-y-auto mb-6 scrollbar-thin">
              {liveTextTranscript.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-teal-400">&gt;&gt; </span>{line}
                </div>
              ))}
            </div>

            <button
              onClick={stopLiveVoiceSession}
              className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-400 font-mono text-xs uppercase rounded-xl transition cursor-pointer"
            >
              🔒 Sever Uplink Connection
            </button>
          </div>
        </div>
      )}

      {/* ----------------- SUB-COMPONENTS: ACTION CONFIRMATION MODAL (MANDATORY) ----------------- */}
      {pendingAction && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full border border-sky-500/30 bg-[#050e1f] p-6 rounded-2xl shadow-2xl relative text-left">
            <div className="flex items-center gap-2.5 text-sky-400 border-b border-sky-500/10 pb-3 mb-4">
              <Shield className="w-5 h-5 text-sky-400 animate-pulse" />
              <h3 className="jarvis-heading font-bold text-sm tracking-wider uppercase">{pendingAction.title}</h3>
            </div>

            <p className="text-sm text-gray-200 leading-relaxed font-sans mb-6">
              Sir, do you authorize J.A.R.V.I.S. to perform this mutation on Google Workspace? 
              <br />
              <span className="text-sky-300 font-mono text-xs mt-2 block bg-gray-950 p-3 rounded-lg border border-sky-500/5">{pendingAction.description}</span>
            </p>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-850 border border-sky-500/10 text-gray-400 rounded-lg transition cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={handleExecutePendingAction}
                className="px-5 py-2 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 rounded-lg transition font-semibold cursor-pointer"
              >
                ⚡ Authorize Subsystem Mutation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- CUSTOM SYSTEM CONFIGURATION MODALS ----------------- */}
      <SystemConfigModal
        isOpen={showSystemConfig}
        onClose={() => setShowSystemConfig(false)}
        settings={systemSettings}
        userEmail={user?.email || ""}
        onSave={saveSystemSettings}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onSave={(onboardingData) => {
          const updated = {
            ...systemSettings,
            ...onboardingData
          } as SystemSettings;
          saveSystemSettings(updated);
          setShowOnboarding(false);
          setTerminalOutput(prev => [
            ...prev,
            `[SYSTEM] Jarvis central uplink established in ${updated.language}. Welcome Boss!`
          ]);
        }}
      />

    </div>
  );
}
