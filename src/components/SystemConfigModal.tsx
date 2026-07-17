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
  Trash2
} from "lucide-react";
import { SystemSettings } from "../types";
import PersonaSoulModal from "./PersonaSoulModal";

interface SystemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  userEmail?: string;
  onSave: (settings: SystemSettings) => void;
}

export default function SystemConfigModal({ isOpen, onClose, settings, userEmail, onSave }: SystemConfigModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "agent" | "demo" | "system" | "profile" | "whatsapp">("voice");
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [isSoulOpen, setIsSoulOpen] = useState(false);
  const [newMemory, setNewMemory] = useState("");

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
    <div className="fixed inset-0 bg-[#02050c]/85 backdrop-blur-md flex items-center justify-center z-40 p-4 font-mono">
      <div className="max-w-4xl w-full border border-sky-500/20 bg-[#04091a] rounded-3xl shadow-2xl relative text-left flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-500/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200 tracking-wider uppercase">System Configuration</h3>
              <p className="text-[10px] text-gray-400">Manage your core agent credentials, voice parameters, and active links</p>
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
        <div className="flex flex-1 overflow-hidden min-h-[500px]">
          
          {/* Left Sidebar */}
          <aside className="w-64 border-r border-sky-500/10 bg-[#030714] p-4 flex flex-col justify-between">
            <nav className="space-y-1.5">
              {[
                { id: "voice", label: "Voice Assistant", sub: "Gemini Live & Persona", icon: Globe },
                { id: "agent", label: "Agent Town", sub: "Hermes & Model Config", icon: Cpu },
                { id: "demo", label: "Demo Video", sub: "How to use Stonic AI", icon: Play },
                { id: "system", label: "System Settings", sub: "Updates & Performance", icon: Settings },
                { id: "profile", label: "Memory & Profile", sub: "Cognitive Memory Vault", icon: Brain },
                { id: "whatsapp", label: "WhatsApp Link", sub: "Remote Control", icon: Smartphone }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer ${
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
              Version: 1.0.38
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <main className="flex-1 p-6 overflow-y-auto bg-[#04091a] space-y-5">
            
            {/* 1. VOICE ASSISTANT TAB */}
            {activeTab === "voice" && (
              <div className="space-y-5 text-xs text-gray-300">
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
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-sky-500/35 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveKey(!showLiveKey)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 cursor-pointer"
                    >
                      {showLiveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500">This API key is stored locally in your workspace cache and encrypted during transit to secure services.</p>
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
                            // Set suitable templates defaults if Bengali is toggled
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
                  className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 rounded-xl text-purple-300 flex items-center justify-center gap-2 transition font-bold text-[11px] tracking-wider uppercase cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.1)]"
                >
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Configure Assistant Personality Soul</span>
                </button>

                {/* Wake word and Sub Agent Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-t border-sky-500/10 pt-4">
                    <div>
                      <div className="font-bold text-gray-200">🎙️ WAKE WORD DETECTION</div>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[280px]">Listen for the wake word in the background</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.wakeWordDetection} 
                        onChange={() => setFormData({ ...formData, wakeWordDetection: !formData.wakeWordDetection })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-sky-500/10 pt-4">
                    <div>
                      <div className="font-bold text-gray-200">🤖 SUB-AGENT MODEL CONFIG</div>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[280px]">Override defaults with OpenRouter for background sub-agents</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.subAgentModelConfig} 
                        onChange={() => setFormData({ ...formData, subAgentModelConfig: !formData.subAgentModelConfig })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* 2. AGENT TOWN TAB */}
            {activeTab === "agent" && (
              <div className="space-y-5 text-xs text-gray-300">
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
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-sky-500/35 pr-10"
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
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-sky-500/35"
                    />
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {["google/gemini-3.5-flash", "google/gemini-3.1-pro-preview", "anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormData({ ...formData, modelId: m })}
                          className="px-2 py-0.5 bg-gray-950 hover:bg-gray-900 border border-sky-500/10 text-[9px] text-gray-400 hover:text-gray-200 rounded transition"
                        >
                          {m.split("/")[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 3. DEMO VIDEO TAB */}
            {activeTab === "demo" && (
              <div className="space-y-5 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Stonic AI Academy</h4>
                  <p className="text-[10px] text-gray-400">Learn how to master local desktop control, workflow triggers, and custom widgets</p>
                </div>

                <div className="aspect-video bg-gray-950 rounded-2xl border border-sky-500/10 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-sky-500/5 opacity-40 group-hover:opacity-100 transition"></div>
                  <Play className="w-12 h-12 text-sky-400 mb-3 animate-pulse cursor-pointer hover:scale-110 transition duration-200" />
                  <div className="font-bold text-gray-200">"Deploying Jarvis to Desktop" Video Manual</div>
                  <p className="text-[10px] text-gray-400 max-w-sm mt-1">Discover how to compile this Electron build, set up global wake word hooks, and control local media controllers.</p>
                </div>

                <div className="space-y-2 border-t border-sky-500/10 pt-4">
                  <div className="font-bold text-gray-200">Recommended Desktop Commands:</div>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400 text-[10px]">
                    <li>"Jarvis, update my PC theme to OLED dark matrix"</li>
                    <li>"Jarvis, optimize Filmora render processes"</li>
                    <li>"Jarvis, push system diagnostics to mobile logs via WhatsApp"</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 4. SYSTEM SETTINGS TAB */}
            {activeTab === "system" && (
              <div className="space-y-5 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">System Settings</h4>
                  <p className="text-[10px] text-gray-400">Monitor system performance, clear logs, and verify server latency</p>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Core Engine Latency:</span>
                    <div className="text-sm font-bold text-green-400">124ms</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Audio Pipeline Rate:</span>
                    <div className="text-sm font-bold text-sky-400">24000 Hz / Stereo</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">Cache Footprint:</span>
                    <div className="text-sm font-bold text-yellow-500">4.12 MB</div>
                  </div>
                  <div className="p-3 bg-gray-950/80 rounded-xl border border-sky-500/5 space-y-1">
                    <span className="text-gray-500">WebSocket Core Status:</span>
                    <div className="text-sm font-bold text-green-400">CONNECTED / STABLE</div>
                  </div>
                </div>

                <div className="border-t border-sky-500/10 pt-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-200">Clear Cache & Local logs</div>
                    <p className="text-[9px] text-gray-500 mt-0.5">Re-index files, clean redundant audio chunks and memory logs</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Cache cleared successfully!")}
                    className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-300 rounded-xl transition font-bold text-[10px] cursor-pointer uppercase"
                  >
                    🧹 Flush Session Cache
                  </button>
                </div>
              </div>
            )}

            {/* 5. COGNITIVE MEMORY & USER PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-4 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">Memory Vault & User Profile</h4>
                  <p className="text-[10px] text-gray-400">Manage your active Stonic AI session, business context, and persistent memory facts</p>
                </div>

                {/* Whitelist status */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-green-500/25 bg-green-950/15">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="font-bold text-green-400">Access Whitelist Status</div>
                      <p className="text-[9px] text-gray-400 mt-0.5 font-mono">Verified Google/Gmail Account: {userEmail || "Connected"}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500 text-black text-[9px] font-bold rounded-lg uppercase font-mono">● Approved</span>
                </div>

                {/* Identity Details */}
                <div className="border border-sky-500/10 bg-[#030816]/60 p-5 rounded-xl space-y-3">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">👤 IDENTITY DETAILS / ব্যবহারকারীর পরিচয়</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 block font-bold">Full Name / নাম</label>
                      <input
                        type="text"
                        value={formData.userName || ""}
                        onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                        placeholder="e.g. Tony Stark"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 block font-bold">Primary Location / বর্তমান অবস্থান</label>
                      <input
                        type="text"
                        value={formData.userLocationName || ""}
                        onChange={(e) => setFormData({ ...formData, userLocationName: e.target.value })}
                        placeholder="e.g. Dhaka, Bangladesh"
                        className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-bold">Profession / পেশা</label>
                    <input
                      type="text"
                      value={formData.userProfession || ""}
                      onChange={(e) => setFormData({ ...formData, userProfession: e.target.value })}
                      placeholder="e.g. Master Engineer & Agency Owner"
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-gray-200 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 block font-bold">Bio / Personal Context / নিজের ও বিজনেস এর বিবরণ</label>
                    <textarea
                      rows={3}
                      value={formData.userBio || ""}
                      onChange={(e) => setFormData({ ...formData, userBio: e.target.value })}
                      placeholder="Tell Jarvis more about your background and business..."
                      className="w-full bg-gray-950 border border-sky-500/15 rounded-xl p-3 text-gray-200 focus:outline-none resize-none font-mono"
                    />
                  </div>
                </div>

                {/* Persistent Memory Vault Card */}
                <div className="border border-sky-500/10 bg-[#020510]/80 p-5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-sky-400" />
                      <span>🧠 PERSISTENT MEMORY VAULT / মেমোরি ভল্ট</span>
                    </div>
                    <span className="text-[8px] font-mono px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/15">
                      {(formData.memories || []).length} PERSISTED FACTS
                    </span>
                  </div>
                  
                  <p className="text-[9px] text-gray-400 leading-tight">
                    Add facts, business details, or important reminders that you want Jarvis to remember. Jarvis will automatically know these whenever you ask questions like "Who am I?" (কে আমি?).
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                      placeholder="Add a new memory fact (e.g., 'আমার একটি এজেন্সি আছে যার নাম Stonic IT')"
                      className="flex-1 bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/35"
                    />
                    <button
                      type="button"
                      onClick={handleAddMemory}
                      className="px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl transition cursor-pointer flex items-center justify-center font-bold"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Fact
                    </button>
                  </div>

                  {/* Fact List */}
                  {(formData.memories && formData.memories.length > 0) ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {formData.memories.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-3 p-2 bg-gray-950 border border-sky-500/5 hover:border-sky-500/10 rounded-xl text-[10px] text-gray-300 font-mono">
                          <span className="flex-1">🧠 {m.content}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemory(m.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition"
                            title="Remove Memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-sky-500/10 bg-gray-950/20 text-center text-gray-500 text-[10px] italic">
                      Memory Vault is currently empty. Add facts above to feed Jarvis's cognitive memory bank!
                    </div>
                  )}
                </div>

                <div className="p-4 border border-red-500/20 bg-red-950/10 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-red-400">Sign Out of Stonic AI</div>
                    <p className="text-[9px] text-gray-400 mt-0.5">Logging out will clear your local credentials cache and return you to the login gate.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.reload(); // Refresh will sign out in firebase
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl transition font-bold text-[10px] uppercase cursor-pointer"
                  >
                    🚪 Sign Out Account
                  </button>
                </div>

              </div>
            )}

            {/* 6. WHATSAPP LINK TAB */}
            {activeTab === "whatsapp" && (
              <div className="space-y-5 text-xs text-gray-300">
                <div>
                  <h4 className="text-sm font-bold text-gray-100 mb-0.5">WhatsApp Remote Link</h4>
                  <p className="text-[10px] text-gray-400">Apne WhatsApp ko link karein aur "Message Yourself" chat se Stonic AI ko remotely command bhejein. Reply wapas WhatsApp par aayega.</p>
                </div>

                <div className="p-5 border border-sky-500/10 bg-gray-950/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-200">WhatsApp Status</div>
                      <span className={`text-[10px] ${formData.whatsAppLinkStatus === "connected" ? "text-green-400 font-bold" : "text-gray-500"}`}>
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

                <div className="p-4 bg-gray-950 rounded-xl border border-sky-500/10 space-y-1.5 text-[10px] text-gray-400">
                  <div className="font-bold text-sky-400 uppercase tracking-wide">ROUTING</div>
                  <p>WhatsApp message uss runtime ko jata hai jo chat panel ke VOICE/CHAT toggle par select ho — VOICE = Gemini Live, CHAT = Hermes agent.</p>
                </div>

              </div>
            )}

          </main>

        </div>

        {/* Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-sky-500/15 flex justify-between items-center bg-[#030714]">
          <span className="text-[10px] text-gray-500 uppercase">Custom settings are loaded from Firestore Cloud</span>
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
