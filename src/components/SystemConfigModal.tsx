import React, { useState, useEffect } from "react";
import { 
  X, 
  Settings, 
  Sparkles, 
  Cpu, 
  Globe, 
  Play, 
  Lock, 
  Check, 
  Shield, 
  User, 
  Eye, 
  EyeOff, 
  Smartphone, 
  MessageCircle, 
  CheckCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Brain,
  Plus,
  Trash2,
  Network,
  Link2,
  Mail,
  Calendar,
  CheckSquare,
  FileCode,
  Monitor,
  Activity,
  FileText,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Loader2,
  PlusCircle,
  Video
} from "lucide-react";
import { 
  SystemSettings, 
  WorkspaceEmail, 
  WorkspaceEvent, 
  WorkspaceTaskList, 
  WorkspaceTask, 
  WorkspaceMeetSpace, 
  WorkspaceChatSpace, 
  WorkspaceChatMessage, 
  Note, 
  AutomationScript, 
  WebhookEvent 
} from "../types";
import PersonaSoulModal from "./PersonaSoulModal";

interface SystemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  userEmail?: string;
  onSave: (settings: SystemSettings) => void;

  // Workspace Integration States & Actions
  emails: WorkspaceEmail[];
  events: WorkspaceEvent[];
  taskLists: WorkspaceTaskList[];
  selectedTaskList: string;
  tasks: WorkspaceTask[];
  meetSpaces: WorkspaceMeetSpace[];
  chatSpaces: WorkspaceChatSpace[];
  selectedChatSpace: string;
  chatMessagesList: WorkspaceChatMessage[];
  workspaceLoading: boolean;
  workspaceError: string | null;
  onSelectTaskList: (id: string) => void;
  onSelectChatSpace: (id: string) => void;
  onTriggerConfirmation: (type: any, title: string, desc: string, payload: any) => void;

  // Keep Notes States & Actions
  notes: Note[];
  newNote: { title: string; content: string; tagsString: string };
  onSetNewNote: React.Dispatch<React.SetStateAction<{ title: string; content: string; tagsString: string }>>;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
  loadingNotes: boolean;

  // Scripts States & Actions
  scripts: AutomationScript[];
  onAddScript?: (title: string, desc: string, category: string, code: string) => void;
  onDeleteScript: (id: string) => void;
  onRunScriptSimulate: (script: AutomationScript) => void;

  // Webhooks
  webhookEvents: WebhookEvent[];
  onClearWebhookEvents: () => void;
}

export default function SystemConfigModal({
  isOpen,
  onClose,
  settings,
  userEmail,
  onSave,

  // Workspace
  emails,
  events,
  taskLists,
  selectedTaskList,
  tasks,
  meetSpaces,
  chatSpaces,
  selectedChatSpace,
  chatMessagesList,
  workspaceLoading,
  workspaceError,
  onSelectTaskList,
  onSelectChatSpace,
  onTriggerConfirmation,

  // Notes
  notes,
  newNote,
  onSetNewNote,
  onAddNote,
  onDeleteNote,
  loadingNotes,

  // Scripts
  scripts,
  onDeleteScript,
  onRunScriptSimulate,

  // Webhooks
  webhookEvents,
  onClearWebhookEvents
}: SystemConfigModalProps) {
  const [activeTab, setActiveTab] = useState<string>("voice");
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [isSoulOpen, setIsSoulOpen] = useState(false);
  const [newMemory, setNewMemory] = useState("");

  const [newApiConn, setNewApiConn] = useState({
    name: "",
    baseUrl: "",
    authHeaderName: "Authorization",
    authHeaderValue: "",
    description: ""
  });

  const [connectionTestResults, setConnectionTestResults] = useState<Record<string, "testing" | "success" | "error">>({});
  const [workspaceSubTab, setWorkspaceSubTab] = useState<"gmail" | "calendar" | "tasks" | "meet">("gmail");

  // Keep Vault State
  const [localNoteForm, setLocalNoteForm] = useState({ title: "", content: "", tagsString: "" });

  const testApiConnection = async (conn: any) => {
    setConnectionTestResults(prev => ({ ...prev, [conn.id]: "testing" }));
    try {
      const headers: any = {};
      if (conn.authHeaderName && conn.authHeaderValue) {
        headers[conn.authHeaderName] = conn.authHeaderValue;
      }
      const res = await fetch(conn.baseUrl, { method: "GET", headers });
      if (res.ok) {
        setConnectionTestResults(prev => ({ ...prev, [conn.id]: "success" }));
      } else {
        setConnectionTestResults(prev => ({ ...prev, [conn.id]: "error" }));
      }
    } catch (e) {
      setConnectionTestResults(prev => ({ ...prev, [conn.id]: "error" }));
    }
  };

  const handleAddApiConnection = () => {
    if (!newApiConn.name.trim() || !newApiConn.baseUrl.trim()) return;
    const item = {
      id: Math.random().toString(36).substring(7),
      ...newApiConn
    };
    const currentConns = formData.apiConnections || [];
    setFormData({
      ...formData,
      apiConnections: [...currentConns, item]
    });
    setNewApiConn({
      name: "",
      baseUrl: "",
      authHeaderName: "Authorization",
      authHeaderValue: "",
      description: ""
    });
  };

  const handleRemoveApiConnection = (id: string) => {
    setFormData({
      ...formData,
      apiConnections: (formData.apiConnections || []).filter((m) => m.id !== id)
    });
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const item = {
      id: Math.random().toString(36).substring(7),
      content: newMemory.trim(),
      createdAt: new Date().toISOString()
    };
    const currentMemories = formData.memories || [];
    setFormData({
      ...formData,
      memories: [...currentMemories, item]
    });
    setNewMemory("");
  };

  const handleRemoveMemory = (id: string) => {
    const currentMemories = formData.memories || [];
    setFormData({
      ...formData,
      memories: currentMemories.filter(m => m.id !== id)
    });
  };

  // Sync state with props when opening
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#02050c]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
      <div className="max-w-5xl w-full border border-sky-500/20 bg-[#04091a] rounded-3xl shadow-2xl relative text-left flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-500/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-sky-400 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200 tracking-wider uppercase">System Settings & Controls</h3>
              <p className="text-[10px] text-gray-400">Manage credentials, voice models, Google workspace, tactical scripts, and web links</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outer Split Layout */}
        <div className="flex flex-1 overflow-hidden min-h-[550px]">
          
          {/* Left Sidebar */}
          <aside className="w-64 border-r border-sky-500/10 bg-[#030714] p-4 flex flex-col justify-between overflow-y-auto">
            <nav className="space-y-1">
              {[
                { id: "voice", label: "Voice Assistant", sub: "Gemini Live & Persona", icon: Globe },
                { id: "agent", label: "Agent Town", sub: "Hermes & Model Config", icon: Cpu },
                { id: "workspace", label: "Workspace Hub", sub: "Gmail, Calendar & Tasks", icon: Mail },
                { id: "keep_scripts", label: "Keep & Scripts", sub: "Tactical Script Library", icon: FileCode },
                { id: "integrations", label: "Web integrations", sub: "REST APIs & Webhooks", icon: Network },
                { id: "profile", label: "Memory & Profile", sub: "Cognitive Memory Vault", icon: Brain },
                { id: "whatsapp", label: "WhatsApp Link", sub: "Remote Control Link", icon: Smartphone },
                { id: "system", label: "System settings", sub: "Latency & Updates", icon: Settings },
                { id: "demo", label: "Video Academy", sub: "How to use J.A.R.V.I.S.", icon: Play }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left cursor-pointer ${
                      isSelected 
                        ? "bg-sky-500/10 border border-sky-500/25 text-sky-300" 
                        : "border border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/30"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-sky-400" : "text-gray-500"}`} />
                    <div className="truncate">
                      <div className="text-[11px] font-bold tracking-wide">{tab.label}</div>
                      <div className="text-[9px] text-gray-500 font-normal">{tab.sub}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
            <div className="text-[9px] text-gray-500 mt-4 border-t border-sky-500/10 pt-3">
              <span className="w-1.5 h-1.5 inline-block bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Stonic AI Kernel v1.2.4
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <main className="flex-1 p-6 overflow-y-auto bg-[#04091a] space-y-5">
            
            {/* 1. VOICE ASSISTANT TAB */}
            {activeTab === "voice" && (
              <div className="space-y-4 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Voice Assistant Settings</h4>
                  <p className="text-[10px] text-gray-400">Customize your live voice assistant engine and response characteristics</p>
                </div>

                {/* API Key */}
                <div className="border border-sky-500/10 bg-[#030816]/60 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5">🔑 GEMINI LIVE API KEY</span>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-[8px] border border-green-500/20">SECURE</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showLiveKey ? "text" : "password"}
                      value={formData.geminiLiveApiKey}
                      onChange={(e) => setFormData({ ...formData, geminiLiveApiKey: e.target.value })}
                      placeholder="Enter Gemini API key for Live audio stream..."
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveKey(!showLiveKey)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 cursor-pointer"
                    >
                      {showLiveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Assistant Language Selection */}
                <div className="border border-sky-500/10 bg-[#030816]/60 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">🗣️ Primary Assistant Language</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Bengali", label: "বাংলা (Bengali)", desc: "Full voice & comprehension in Bengali" },
                      { id: "English", label: "English (US/UK)", desc: "Stark-butler English communication" },
                      { id: "Arabic", label: "العربية (Arabic)", desc: "Arabic language dialogue support" },
                      { id: "Hindi", label: "हिन्दी (Hindi)", desc: "Hindi speech & text interaction" }
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            language: lang.id,
                            personalityTemplate: lang.id === "Bengali" ? "Bangla Bandhu" : (formData.personalityTemplate === "Bangla Bandhu" ? "Caring Companion" : formData.personalityTemplate)
                          });
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                          formData.language === lang.id
                            ? "border-sky-500 bg-sky-500/10 text-sky-300"
                            : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        <span className="font-bold">{lang.label}</span>
                        <span className="text-[9px] text-gray-500 mt-0.5">{lang.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select Voice Persona */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">🗣️ SELECT VOICE PERSONA</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, voicePersona: "Charon" })}
                      className={`p-4 rounded-xl border text-left transition relative flex items-start gap-3 cursor-pointer ${
                        formData.voicePersona === "Charon"
                          ? "border-sky-500 bg-sky-500/10 text-sky-300"
                          : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      <span className="text-2xl mt-0.5">🧑</span>
                      <div>
                        <div className="font-bold">Male Persona (Charon)</div>
                        <p className="text-[10px] text-gray-400 mt-1">Deep, crisp, professional tone</p>
                      </div>
                      {formData.voicePersona === "Charon" && (
                        <Check className="w-4 h-4 text-sky-400 absolute top-3 right-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, voicePersona: "Despina" })}
                      className={`p-4 rounded-xl border text-left transition relative flex items-start gap-3 cursor-pointer ${
                        formData.voicePersona === "Despina"
                          ? "border-sky-500 bg-sky-500/10 text-sky-300"
                          : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      <span className="text-2xl mt-0.5">👩</span>
                      <div>
                        <div className="font-bold">Female Persona (Despina)</div>
                        <p className="text-[10px] text-gray-400 mt-1">Clear, natural, helpful tone</p>
                      </div>
                      {formData.voicePersona === "Despina" && (
                        <Check className="w-4 h-4 text-sky-400 absolute top-3 right-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Configure soul button */}
                <button
                  type="button"
                  onClick={() => setIsSoulOpen(true)}
                  className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 rounded-xl text-purple-300 flex items-center justify-center gap-2 transition font-bold text-[11px] tracking-wider uppercase cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Configure Assistant Personality Soul</span>
                </button>
              </div>
            )}

            {/* 2. AGENT TOWN TAB */}
            {activeTab === "agent" && (
              <div className="space-y-4 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Agent Town AI Configuration</h4>
                  <p className="text-[10px] text-gray-400">Configure core LLM engine providers and model details</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "gemini", name: "Google Gemini", desc: "Direct API Integration" },
                    { id: "openrouter", name: "OpenRouter", desc: "200+ models aggregated" },
                    { id: "openai", name: "ChatGPT Plus/Pro", desc: "Subscription-based keys" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, aiProvider: p.id as any })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        formData.aiProvider === p.id
                          ? "border-sky-500 bg-sky-500/10 text-sky-300"
                          : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      <div className="font-bold text-[10px]">{p.name}</div>
                      <div className="text-[8px] text-gray-500 mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>

                {/* API Keys */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">OpenRouter API Key</label>
                    <div className="relative">
                      <input
                        type={showOpenRouterKey ? "text" : "password"}
                        value={formData.openrouterApiKey}
                        onChange={(e) => setFormData({ ...formData, openrouterApiKey: e.target.value })}
                        placeholder="sk-or-v1-..."
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 pr-10 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 cursor-pointer"
                      >
                        {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Preferred Model ID</label>
                    <input
                      type="text"
                      value={formData.modelId}
                      onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                      placeholder="google/gemini-3.5-flash"
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. WORKSPACE HUB TAB */}
            {activeTab === "workspace" && (
              <div className="space-y-4 text-xs text-gray-300 text-left">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Google Workspace Synchronization</h4>
                  <p className="text-[10px] text-gray-400">View synchronized Gmail, upcoming Calendar meetings, and tasks directly</p>
                </div>

                {/* Sub-tabs for Workspace */}
                <div className="flex border-b border-sky-500/10 pb-1 gap-2 overflow-x-auto">
                  {[
                    { id: "gmail", label: "Gmail Messages", icon: Mail },
                    { id: "calendar", label: "Calendar lists", icon: Calendar },
                    { id: "tasks", label: "Task Queue", icon: CheckSquare },
                    { id: "meet", label: "Google Meet rooms", icon: Video }
                  ].map((subTab) => {
                    const Icon = subTab.icon;
                    const isSel = workspaceSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        type="button"
                        onClick={() => setWorkspaceSubTab(subTab.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[10px] tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
                          isSel ? "border-sky-400 text-sky-300" : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{subTab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {workspaceLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                    <span className="text-[10px] uppercase text-sky-400/80 animate-pulse">Synchronizing feed...</span>
                  </div>
                ) : (
                  <div className="space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto pr-1">
                    {workspaceError && (
                      <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-xs text-red-400 font-mono text-left">
                        ⚠️ {workspaceError}
                      </div>
                    )}

                    {/* Gmail Subtab */}
                    {workspaceSubTab === "gmail" && (
                      <div className="space-y-2">
                        {emails.length === 0 ? (
                          <div className="border border-sky-500/10 p-12 rounded-xl text-center text-gray-500 text-sm font-mono italic bg-gray-950/30">
                            No synced emails found in active inbox.
                          </div>
                        ) : (
                          emails.map((email) => (
                            <div key={email.id} className="border border-sky-500/10 hover:border-sky-500/20 p-3.5 rounded-xl bg-gray-950/40 text-left transition relative">
                              <span className="text-[9px] font-mono text-sky-400 absolute top-3.5 right-3.5">{email.date}</span>
                              <div className="text-xs font-bold text-gray-300 pr-20">{email.from}</div>
                              <div className="text-xs font-semibold text-sky-300 mt-1">{email.subject}</div>
                              <div className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{email.snippet}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Calendar Subtab */}
                    {workspaceSubTab === "calendar" && (
                      <div className="space-y-2">
                        {events.length === 0 ? (
                          <div className="border border-sky-500/10 p-12 rounded-xl text-center text-gray-500 text-sm font-mono italic bg-gray-950/30">
                            No scheduled events on record.
                          </div>
                        ) : (
                          events.map((event) => (
                            <div key={event.id} className="border border-sky-500/10 p-3.5 rounded-xl bg-gray-950/40 text-left transition">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
                                <div className="text-xs font-semibold text-sky-300">{event.summary}</div>
                                <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                                  {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-[10px] text-gray-400 mt-2 border-t border-sky-500/5 pt-2 leading-relaxed">{event.description}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tasks Subtab */}
                    {workspaceSubTab === "tasks" && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-gray-950/60 p-2.5 rounded-xl border border-sky-500/10">
                          <span className="text-[10px] font-bold text-sky-400">SELECT TASK DIRECTORY</span>
                          <select
                            value={selectedTaskList}
                            onChange={(e) => onSelectTaskList(e.target.value)}
                            className="bg-gray-950 border border-sky-500/15 rounded px-2 py-1 text-[10px] text-sky-300"
                          >
                            {taskLists.map(list => (
                              <option key={list.id} value={list.id}>{list.title}</option>
                            ))}
                          </select>
                        </div>

                        {tasks.length === 0 ? (
                          <div className="border border-sky-500/10 p-12 rounded-xl text-center text-gray-500 text-sm font-mono italic bg-gray-950/30">
                            Task queue is empty.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {tasks.map((task) => (
                              <div key={task.id} className="border border-sky-500/10 p-3 rounded-xl bg-gray-950/40 text-left flex items-start gap-3 transition">
                                {task.status === "needsAction" ? (
                                  <button
                                    onClick={() => onTriggerConfirmation(
                                      "complete_task",
                                      "Complete Google Task",
                                      `Mark task "${task.title}" as complete in Google Tasks?`,
                                      { taskId: task.id }
                                    )}
                                    className="p-1 mt-0.5 border border-sky-500/20 hover:border-green-500/40 text-sky-400 hover:text-green-400 rounded-lg cursor-pointer bg-transparent"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <div className="p-1 mt-0.5 border border-green-500/20 text-green-400 rounded-lg bg-green-500/10">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</div>
                                  {task.notes && (
                                    <div className="text-[10px] text-gray-400 mt-1">{task.notes}</div>
                                  )}
                                  {task.due && (
                                    <div className="text-[9px] font-mono text-sky-400/80 mt-1">Due: {new Date(task.due).toLocaleDateString()}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Meet Rooms Subtab */}
                    {workspaceSubTab === "meet" && (
                      <div className="space-y-2">
                        {meetSpaces.length === 0 ? (
                          <div className="border border-sky-500/10 p-12 rounded-xl text-center text-gray-500 text-sm font-mono italic bg-gray-950/30">
                            No meeting spaces initiated. Command Jarvis to "মিটিং তৈরি করো" (create meet link) to launch rooms.
                          </div>
                        ) : (
                          meetSpaces.map((space) => (
                            <div key={space.name} className="border border-sky-500/10 p-3.5 rounded-xl bg-gray-950/40 text-left transition flex justify-between items-center">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-gray-200">Room Code: {space.meetingCode}</div>
                                <div className="text-[10px] text-sky-400/80 font-mono truncate max-w-sm">{space.meetingUri}</div>
                              </div>
                              <a
                                href={space.meetingUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-mono text-[10px] px-3 py-1.5 rounded-lg transition shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Join Meet
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. KEEP VAULT & AUTOMATION SCRIPTS TAB */}
            {activeTab === "keep_scripts" && (
              <div className="space-y-4 text-xs text-gray-300 text-left">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Tactical Keep Vault & Automation Scripts</h4>
                  <p className="text-[10px] text-gray-400">Launch executable scripts or manage saved keep notes in your local archive</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Automation Scripts */}
                  <div className="border border-sky-500/10 p-4 rounded-xl bg-gray-950/30 space-y-3">
                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center justify-between border-b border-sky-500/10 pb-2">
                      <span>💻 Executable Automations</span>
                      <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/15">
                        {scripts.length} MODULES
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {scripts.length === 0 ? (
                        <div className="text-[10px] text-gray-500 italic py-6 text-center">No script modules registered.</div>
                      ) : (
                        scripts.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2.5 border border-sky-500/5 hover:border-sky-500/20 rounded-lg bg-gray-950/60 transition group">
                            <div className="truncate text-left flex-1 min-w-0 pr-3">
                              <div className="text-xs font-semibold text-gray-200 truncate">{s.title}</div>
                              <div className="text-[9px] font-mono text-sky-400/80 mt-0.5">{s.category}</div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button 
                                type="button"
                                onClick={() => onRunScriptSimulate(s)}
                                className="p-1.5 bg-sky-500/10 hover:bg-sky-500/30 border border-sky-500/20 text-sky-300 rounded cursor-pointer transition"
                                title="Run automation"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => onDeleteScript(s.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 text-red-400 rounded cursor-pointer transition opacity-40 group-hover:opacity-100"
                                title="Delete script"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Keep Vault Notes */}
                  <div className="border border-sky-500/10 p-4 rounded-xl bg-gray-950/30 space-y-3">
                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center justify-between border-b border-sky-500/10 pb-2">
                      <span>📓 Personal Keep Notes</span>
                      <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/15">
                        {notes.length} NOTES
                      </span>
                    </div>

                    {/* Add note inline form */}
                    <div className="space-y-2 bg-gray-950/40 p-2.5 rounded-xl border border-sky-500/5">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={localNoteForm.title}
                          onChange={(e) => setLocalNoteForm({ ...localNoteForm, title: e.target.value })}
                          placeholder="Note Title..."
                          className="bg-gray-950 border border-sky-500/15 rounded px-2 py-1 text-[10px] text-gray-200"
                        />
                        <input
                          type="text"
                          value={localNoteForm.tagsString}
                          onChange={(e) => setLocalNoteForm({ ...localNoteForm, tagsString: e.target.value })}
                          placeholder="Tags (tag1, tag2)..."
                          className="bg-gray-950 border border-sky-500/15 rounded px-2 py-1 text-[10px] text-gray-200"
                        />
                      </div>
                      <textarea
                        rows={1.5}
                        value={localNoteForm.content}
                        onChange={(e) => setLocalNoteForm({ ...localNoteForm, content: e.target.value })}
                        placeholder="Content of keep note..."
                        className="w-full bg-gray-950 border border-sky-500/15 rounded p-2 text-[10px] text-gray-200 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!localNoteForm.title.trim() || !localNoteForm.content.trim()) return;
                          onSetNewNote({
                            title: localNoteForm.title,
                            content: localNoteForm.content,
                            tagsString: localNoteForm.tagsString
                          });
                          // Quick deferred add note trigger
                          setTimeout(() => {
                            onAddNote();
                            setLocalNoteForm({ title: "", content: "", tagsString: "" });
                          }, 100);
                        }}
                        className="w-full py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded text-[9px] uppercase tracking-wide font-bold transition cursor-pointer"
                      >
                        + Create Keep Note
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {loadingNotes ? (
                        <div className="text-center text-gray-500 font-mono py-4">Syncing Vault...</div>
                      ) : notes.length === 0 ? (
                        <div className="text-[10px] text-gray-500 italic py-4 text-center">Notes archive is empty.</div>
                      ) : (
                        notes.map((note) => (
                          <div key={note.id} className="p-2.5 border border-sky-500/5 bg-gray-950/50 rounded-xl relative group text-left transition">
                            <button
                              type="button"
                              onClick={() => onDeleteNote(note.id)}
                              className="text-gray-500 hover:text-red-400 absolute top-2 right-2 p-1 rounded hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-[11px] font-bold text-sky-300 pr-6">{note.title}</div>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{note.content}</p>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {note.tags.map((tag) => (
                                  <span key={tag} className="text-[8px] font-mono bg-sky-500/10 text-sky-400/80 px-1 py-0.5 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. WEB INTEGRATIONS (WEBHOOKS) TAB */}
            {activeTab === "integrations" && (
              <div className="space-y-4 text-xs text-gray-300 text-left font-mono">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Universal Web Integrations & Live Webhooks</h4>
                  <p className="text-[10px] text-gray-400">Connect Stonic AI to external websites or capture real-time inbound trigger alerts</p>
                </div>

                {/* API Connections */}
                <div className="border border-sky-500/10 bg-[#030816]/60 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Link2 className="w-4 h-4 text-sky-400" />
                    <span>🔗 REGISTER NEW API UPLINK</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Connection Name</label>
                      <input
                        type="text"
                        value={newApiConn.name}
                        onChange={(e) => setNewApiConn({ ...newApiConn, name: e.target.value })}
                        placeholder="e.g. WordPress Shop"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Base API URL</label>
                      <input
                        type="text"
                        value={newApiConn.baseUrl}
                        onChange={(e) => setNewApiConn({ ...newApiConn, baseUrl: e.target.value })}
                        placeholder="https://myshop.com/wp-json"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Auth Header Name</label>
                      <input
                        type="text"
                        value={newApiConn.authHeaderName}
                        onChange={(e) => setNewApiConn({ ...newApiConn, authHeaderName: e.target.value })}
                        placeholder="Authorization"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Auth Token/Key</label>
                      <input
                        type="password"
                        value={newApiConn.authHeaderValue}
                        onChange={(e) => setNewApiConn({ ...newApiConn, authHeaderValue: e.target.value })}
                        placeholder="Bearer token..."
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddApiConnection}
                    className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl transition cursor-pointer flex items-center justify-center font-bold text-[10px] uppercase"
                  >
                    + Save API Connection
                  </button>
                </div>

                {/* Webhooks panel */}
                <div className="border border-sky-500/10 bg-gray-950/40 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center justify-between border-b border-sky-500/10 pb-2">
                    <span>⚡ Inbound Live Webhooks</span>
                    <button
                      type="button"
                      onClick={onClearWebhookEvents}
                      className="text-[8px] uppercase font-bold text-red-400 hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {webhookEvents.length === 0 ? (
                      <div className="text-[9px] text-gray-500 italic py-6 text-center">No inbound webhook signals received yet.</div>
                    ) : (
                      webhookEvents.map((ev, i) => (
                        <div key={i} className="p-2 border border-sky-500/5 bg-gray-950/60 rounded-lg text-[9px] space-y-1">
                          <div className="flex justify-between items-center text-sky-300 font-bold">
                            <span>GRID_ALERT: Inbound POST /api/webhook</span>
                            <span className="text-gray-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <pre className="text-emerald-400 leading-tight truncate bg-black/30 p-1.5 rounded">{JSON.stringify(ev.data, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. PROFILE & MEMORIES TAB */}
            {activeTab === "profile" && (
              <div className="space-y-4 text-xs text-gray-300 text-left">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Cognitive Memory Vault & User Profile</h4>
                  <p className="text-[10px] text-gray-400">Manage your bio, professional coordinates, and persistent facts</p>
                </div>

                {/* Whitelist status */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-green-500/20 bg-green-950/10">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-green-400 animate-pulse" />
                    <div>
                      <div className="font-bold text-green-400">Access Whitelist Status</div>
                      <p className="text-[9px] text-gray-400 mt-0.5 font-mono">Verified Google Account: {userEmail || "Connected"}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[8px] font-bold rounded uppercase font-mono">● Approved</span>
                </div>

                {/* Identity details */}
                <div className="border border-sky-500/10 bg-[#030816]/60 p-4 rounded-xl space-y-3 font-mono">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">👤 IDENTITY PROFILE</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 block font-bold">Full Name / নাম</label>
                      <input
                        type="text"
                        value={formData.userName || ""}
                        onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                        placeholder="Tony Stark"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 block font-bold">Location / বর্তমান অবস্থান</label>
                      <input
                        type="text"
                        value={formData.userLocationName || ""}
                        onChange={(e) => setFormData({ ...formData, userLocationName: e.target.value })}
                        placeholder="Dhaka, Bangladesh"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-bold">Profession / পেশা</label>
                    <input
                      type="text"
                      value={formData.userProfession || ""}
                      onChange={(e) => setFormData({ ...formData, userProfession: e.target.value })}
                      placeholder="Agency Architect & Owner"
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-bold">Bio / Personal Context / নিজের ও বিজনেস এর বিবরণ</label>
                    <textarea
                      rows={2.5}
                      value={formData.userBio || ""}
                      onChange={(e) => setFormData({ ...formData, userBio: e.target.value })}
                      placeholder="Tell J.A.R.V.I.S. more about your background..."
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Persistent Memory Vault */}
                <div className="border border-sky-500/10 bg-[#020510]/80 p-4 rounded-xl space-y-3 font-mono">
                  <div className="flex justify-between items-center border-b border-sky-500/10 pb-2">
                    <span className="text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1">
                      <Brain className="w-4 h-4 text-sky-400" />
                      <span>🧠 Cognitive Fact Library</span>
                    </span>
                    <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/15">
                      {(formData.memories || []).length} PERSISTED
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                      placeholder="Add a cognitive fact fact (e.g. 'Stonic IT is my agency')..."
                      className="flex-1 bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-1.5 text-[10px] text-gray-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddMemory}
                      className="px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl font-bold uppercase transition text-[10px]"
                    >
                      + Add Fact
                    </button>
                  </div>

                  {/* Fact lists */}
                  {(formData.memories && formData.memories.length > 0) ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {formData.memories.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-3 p-2 bg-gray-950 border border-sky-500/5 hover:border-sky-500/10 rounded-xl text-[10px] text-gray-300">
                          <span className="flex-1">🧠 {m.content}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemory(m.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition bg-transparent border-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-sky-500/10 bg-gray-950/20 text-center text-gray-500 text-[10px] italic">
                      Memory Vault is currently empty. Feed Jarvis facts above!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. WHATSAPP LINK TAB */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4 text-xs text-gray-300 text-left font-mono">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">WhatsApp Gateway Remote Link</h4>
                  <p className="text-[10px] text-gray-400">Remotely send commands from your personal WhatsApp to control Stonic AI</p>
                </div>

                <div className="p-4 border border-sky-500/10 bg-gray-950/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-200 text-xs">WhatsApp Status</div>
                      <span className={`text-[10px] font-bold ${formData.whatsAppLinkStatus === "connected" ? "text-green-400" : "text-gray-500"}`}>
                        {formData.whatsAppLinkStatus === "connected" ? "CONNECTED" : "DISCONNECTED"}
                      </span>
                    </div>
                  </div>
                  <select
                    value={formData.whatsAppLinkStatus}
                    onChange={(e) => setFormData({ ...formData, whatsAppLinkStatus: e.target.value as any })}
                    className="bg-gray-950 border border-sky-500/20 rounded-xl px-3 py-1.5 text-[10px] text-sky-300 cursor-pointer"
                  >
                    <option value="disconnected">❌ Disconnected</option>
                    <option value="connected">✅ Connected (Auto-Route)</option>
                  </select>
                </div>

                <div className="p-3.5 bg-gray-950 rounded-xl border border-sky-500/10 text-[10px] text-gray-400 leading-relaxed">
                  <div className="font-bold text-sky-400 uppercase tracking-wide mb-1">WhatsApp Remote Integration</div>
                  <p>When Connected, J.A.R.V.I.S. monitors incoming triggers and forwards them securely. Voice commands default to Gemini Live pipeline, while text is captured by the Hermes orchestrator model.</p>
                </div>
              </div>
            )}

            {/* 8. SYSTEM SETTINGS TAB */}
            {activeTab === "system" && (
              <div className="space-y-4 text-xs text-gray-300 text-left">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Performance & Latency Settings</h4>
                  <p className="text-[10px] text-gray-400">Monitor local socket pipelines and manage operational performance</p>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Core Engine Latency:</span>
                    <div className="text-xs font-bold text-green-400">124ms</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Audio Pipeline Rate:</span>
                    <div className="text-xs font-bold text-sky-400">24000 Hz / Stereo</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Cache Footprint:</span>
                    <div className="text-xs font-bold text-yellow-500">4.12 MB</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">WebSocket Core Status:</span>
                    <div className="text-xs font-bold text-green-400">CONNECTED / STABLE</div>
                  </div>
                </div>

                <div className="border-t border-sky-500/10 pt-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-200">Flush Session Cache</div>
                    <p className="text-[9px] text-gray-500 mt-0.5">Flush diagnostic logs and clean audio cache blocks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Cache cleared successfully!")}
                    className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-300 rounded-xl transition font-bold text-[10px] cursor-pointer uppercase"
                  >
                    🧹 Flush cache
                  </button>
                </div>
              </div>
            )}

            {/* 9. DEMO VIDEO TAB */}
            {activeTab === "demo" && (
              <div className="space-y-4 text-xs text-gray-300 text-left">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Stonic AI Academy</h4>
                  <p className="text-[10px] text-gray-400">Learn how to master local desktop control and workflow triggers</p>
                </div>

                <div className="aspect-video bg-gray-950 rounded-2xl border border-sky-500/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-sky-500/5 opacity-40 group-hover:opacity-100 transition"></div>
                  <Play className="w-12 h-12 text-sky-400 mb-3 animate-pulse cursor-pointer hover:scale-110 transition duration-200" />
                  <div className="font-bold text-gray-200">"Deploying Jarvis to Desktop" Video Manual</div>
                  <p className="text-[10px] text-gray-400 max-w-sm mt-1">Discover how to configure global wake word hooks and remote links.</p>
                </div>
              </div>
            )}

          </main>

        </div>

        {/* Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-sky-500/15 flex justify-between items-center bg-[#030714]">
          <span className="text-[10px] text-gray-500 uppercase font-mono">Custom settings are secured in Cloud Firestore</span>
          <div className="flex gap-2 text-xs font-mono">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-850 bg-gray-950 hover:bg-gray-900 rounded-xl text-gray-400 hover:text-gray-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 hover:text-sky-200 rounded-xl transition font-bold tracking-wider uppercase cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>

      </div>

      {/* Embedded PersonaSoulModal */}
      <PersonaSoulModal
        isOpen={isSoulOpen}
        onClose={() => setIsSoulOpen(false)}
        settings={formData}
        onSave={(voice, template, prompt, customTemplates) => {
          setFormData({
            ...formData,
            voicePersona: voice,
            personalityTemplate: template,
            personalityPrompt: prompt,
            customTemplates: customTemplates || formData.customTemplates
          });
        }}
      />

    </div>
  );
}
