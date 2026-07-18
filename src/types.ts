export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  modelUsed?: string;
  thinkingProcess?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
  groundingChunks?: any[];
  activeVideoId?: string;
  youtubeResults?: any[];
  playQuery?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: any;
  updatedAt: any;
}

export interface AutomationScript {
  id: string;
  title: string;
  description: string;
  category: "System" | "Hardware" | "WhatsApp" | "Remote" | "Web" | "Dev";
  code: string;
  createdAt: any;
}

export interface WorkspaceEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface WorkspaceEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
}

export interface WorkspaceTaskList {
  id: string;
  title: string;
}

export interface WorkspaceMeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
  accessType?: string;
}

export interface WorkspaceKeepNote {
  name: string;
  title?: string;
  bodyText?: string;
}

export interface WorkspaceChatSpace {
  name: string;
  displayName?: string;
  spaceType?: string;
}

export interface WorkspaceChatMessage {
  name: string;
  text?: string;
  senderName?: string;
  createTime?: string;
}

export interface ExternalApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  authHeaderName: string;
  authHeaderValue: string;
  description: string;
}

export interface WebhookEvent {
  id: string;
  connectionId: string;
  data: any;
  timestamp: string;
}

export interface SystemSettings {
  language: string;
  geminiLiveApiKey: string;
  voicePersona: "Charon" | "Despina";
  wakeWordDetection: boolean;
  subAgentModelConfig: boolean;
  aiProvider: "openrouter" | "gemini" | "openai";
  openrouterApiKey: string;
  modelId: string;
  userName: string;
  userLocationName: string;
  userProfession: string;
  userBio: string;
  whatsAppLinkStatus: "connected" | "disconnected";
  personalityTemplate: string;
  personalityPrompt: string;
  memories?: Array<{ id: string; content: string; createdAt: string }>;
  customTemplates?: Record<string, string>;
  apiConnections?: ExternalApiConnection[];
}

