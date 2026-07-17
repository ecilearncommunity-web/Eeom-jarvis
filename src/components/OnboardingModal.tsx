import React, { useState } from "react";
import { 
  Sparkles, 
  Globe, 
  User, 
  CheckCircle, 
  Briefcase, 
  MapPin, 
  Database, 
  Plus, 
  Trash2, 
  Brain,
  MessageCircle
} from "lucide-react";
import { SystemSettings } from "../types";
import { PERSONALITY_TEMPLATES } from "./PersonaSoulModal";

interface OnboardingModalProps {
  isOpen: boolean;
  onSave: (settings: Partial<SystemSettings>) => void;
}

export default function OnboardingModal({ isOpen, onSave }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLang, setSelectedLang] = useState<string>("Bengali");
  const [selectedVoice, setSelectedVoice] = useState<"Charon" | "Despina">("Despina");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Bangla Bandhu");
  
  // Custom Personality Templates Management
  const [customTemplates, setCustomTemplates] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("custom_personality_templates");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [promptText, setPromptText] = useState<string>(() => {
    const all = { ...PERSONALITY_TEMPLATES, ...customTemplates };
    return all["Bangla Bandhu"];
  });

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  // Sync prompt text when selected template changes
  React.useEffect(() => {
    const all = { ...PERSONALITY_TEMPLATES, ...customTemplates };
    if (all[selectedTemplate] !== undefined) {
      setPromptText(all[selectedTemplate]);
    }
  }, [selectedTemplate, customTemplates]);
  
  // Profile details
  const [userName, setUserName] = useState("");
  const [userProfession, setUserProfession] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [userBio, setUserBio] = useState("");

  // Memory Vault details
  const [memories, setMemories] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [newMemory, setNewMemory] = useState("");

  if (!isOpen) return null;

  const addMemoryFact = () => {
    if (!newMemory.trim()) return;
    const item = {
      id: Math.random().toString(36).substring(7),
      content: newMemory.trim(),
      createdAt: new Date().toISOString()
    };
    setMemories([...memories, item]);
    setNewMemory("");
  };

  const removeMemoryFact = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleStart = () => {
    onSave({
      language: selectedLang,
      voicePersona: selectedVoice,
      personalityTemplate: selectedTemplate,
      personalityPrompt: promptText,
      userName: userName.trim() || "Boss",
      userProfession: userProfession.trim() || "Business Owner",
      userLocationName: userLocation.trim() || "Dhaka, Bangladesh",
      userBio: userBio.trim() || "Owner of a growing digital enterprise.",
      memories: memories,
      customTemplates: customTemplates
    });
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "Bengali": return "বাংলা (Bengali)";
      case "English": return "English (US/UK)";
      case "Arabic": return "العربية (Arabic)";
      case "Hindi": return "हिन्दी (Hindi)";
      case "Spanish": return "Español (Spanish)";
      default: return lang;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#010307]/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 font-mono overflow-y-auto">
      <div className="max-w-2xl w-full border border-sky-500/20 bg-[#030714] p-6 sm:p-8 rounded-3xl shadow-2xl text-left relative overflow-hidden my-8">
        
        {/* Visual glow backdrop decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Top Header & Indicator */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/15">
            Onboarding Matrix — Step {step} of 2
          </div>
          <div className="flex gap-1">
            <span className={`w-2 h-2 rounded-full ${step === 1 ? "bg-sky-400 animate-pulse" : "bg-sky-900"}`}></span>
            <span className={`w-2 h-2 rounded-full ${step === 2 ? "bg-sky-400 animate-pulse" : "bg-sky-900"}`}></span>
          </div>
        </div>

        {/* STEP 1: PREFERENCES & PERSONALITY */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full border-2 border-sky-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                <Brain className="w-7 h-7 text-sky-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-sky-400 tracking-wider uppercase mt-3">COGNITIVE SYSTEM INITIALIZATION</h2>
              <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                Welcome Boss. Let's configure your preferred language, AI companion soul, and voice profile to boot up Jarvis.
              </p>
            </div>

            <div className="space-y-4">
              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>1. Choose Primary Language / ভাষা নির্বাচন করুন</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Bengali", "English", "Arabic", "Hindi"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang);
                        if (lang === "Bengali") {
                          setSelectedTemplate("Bangla Bandhu");
                        } else if (selectedTemplate === "Bangla Bandhu") {
                          setSelectedTemplate("Caring Companion");
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        selectedLang === lang
                          ? "border-sky-500 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)] font-bold"
                          : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300 hover:bg-gray-900/40"
                      }`}
                    >
                      <span className="text-xs">{lang === "Bengali" ? "🇧🇩 বাংলা" : lang === "English" ? "🇺🇸 English" : lang === "Arabic" ? "🇸🇦 العربية" : "🇮🇳 हिन्दी"}</span>
                      <span className="text-[9px] text-gray-500 font-normal">{lang}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Choice */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
                  <User className="w-3.5 h-3.5" />
                  <span>2. Choose Voice Persona / ভয়েস নির্বাচন করুন</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVoice("Charon")}
                    className={`p-3 rounded-xl border text-left transition relative flex items-start gap-2.5 cursor-pointer ${
                      selectedVoice === "Charon"
                        ? "border-sky-500 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                        : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300 hover:bg-gray-900/40"
                    }`}
                  >
                    <span className="text-xl mt-0.5">🧑</span>
                    <div className="text-[11px]">
                      <div className="font-bold">Charon (Male)</div>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">Deep, crisp, professional voice</p>
                    </div>
                    {selectedVoice === "Charon" && (
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 absolute top-2.5 right-2.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVoice("Despina")}
                    className={`p-3 rounded-xl border text-left transition relative flex items-start gap-2.5 cursor-pointer ${
                      selectedVoice === "Despina"
                        ? "border-sky-500 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                        : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300 hover:bg-gray-900/40"
                    }`}
                  >
                    <span className="text-xl mt-0.5">👩</span>
                    <div className="text-[11px]">
                      <div className="font-bold">Despina (Female)</div>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">Clear, sweet, incredibly natural</p>
                    </div>
                    {selectedVoice === "Despina" && (
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 absolute top-2.5 right-2.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Personality Soul */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3. Choose Character Soul / বুদ্ধিমত্তা ও আচরণ</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex-1 bg-gray-950 border border-sky-500/20 rounded-xl px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-sky-500/45 cursor-pointer"
                  >
                    {Object.keys({ ...PERSONALITY_TEMPLATES, ...customTemplates }).map((templateName) => (
                      <option key={templateName} value={templateName}>
                        {templateName === "Bangla Bandhu" ? "🇧🇩 Bangla Bandhu (বাঙালি বন্ধু)" : templateName}
                      </option>
                    ))}
                  </select>

                  {/* Delete button if selected template is custom */}
                  {customTemplates[selectedTemplate] !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...customTemplates };
                        delete updated[selectedTemplate];
                        setCustomTemplates(updated);
                        localStorage.setItem("custom_personality_templates", JSON.stringify(updated));
                        setSelectedTemplate("Bangla Bandhu");
                      }}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-1 cursor-pointer transition shrink-0"
                      title="Delete Custom Personality"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Directives text area (Fully Editable as requested) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sky-400 font-bold">Directives / আচরণ নির্দেশাবলী:</span>
                    {customTemplates[selectedTemplate] ? (
                      <span className="text-[9px] text-green-400 uppercase font-bold tracking-wider px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20">
                        Custom Soul Created By You
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-500">Edit instructions to customize this soul</span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={promptText}
                    onChange={(e) => {
                      setPromptText(e.target.value);
                    }}
                    placeholder="Describe the personality details..."
                    className="w-full bg-gray-950 border border-sky-500/15 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-sky-500/40 resize-none font-sans leading-relaxed"
                  />
                </div>

                {/* Add Custom behavior panel */}
                <div className="pt-1">
                  {!isAddingCustom ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(true);
                        setCustomName("");
                      }}
                      className="w-full py-2 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/15 rounded-xl text-[10px] font-bold text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer transition uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Custom Personality / নতুন আচরণ তৈরি করুন
                    </button>
                  ) : (
                    <div className="space-y-2.5 p-3 bg-sky-500/5 rounded-xl border border-sky-500/15">
                      <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wide">Save these directives as a new personality</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Personality Name (e.g. Special Advisor)"
                          className="flex-1 bg-gray-950 border border-sky-500/20 rounded-xl px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-sky-500/40"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customName.trim()) return;
                            const name = customName.trim();
                            const updated = { ...customTemplates, [name]: promptText };
                            setCustomTemplates(updated);
                            localStorage.setItem("custom_personality_templates", JSON.stringify(updated));
                            setSelectedTemplate(name);
                            setIsAddingCustom(false);
                          }}
                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustom(false)}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-850 rounded-xl text-xs text-gray-400 border border-gray-800 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next step button */}
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue to Memory Vault & Identity Setup 🧠</span>
            </button>
          </div>
        )}

        {/* STEP 2: USER IDENTITY & MEMORIES */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full border-2 border-sky-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                <Database className="w-6 h-6 text-sky-400" />
              </div>
              <h2 className="text-lg font-bold text-sky-400 tracking-wider uppercase mt-2">PERSONAL MEMORY VAULT</h2>
              <p className="text-[10px] text-gray-400">
                Teach Jarvis who you are. These details will be stored permanently in your cloud profile so Jarvis remembers you instantly.
              </p>
            </div>

            <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              
              {/* Name and Location row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 block font-bold uppercase">What is your Name? / আপনার নাম</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Tony Stark"
                    className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-500/35"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 block font-bold uppercase">Where are you from? / বর্তমান অবস্থান</label>
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-500/35"
                  />
                </div>
              </div>

              {/* Profession */}
              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 block font-bold uppercase">Your Profession & Role / আপনার পেশা বা কাজ</label>
                <input
                  type="text"
                  value={userProfession}
                  onChange={(e) => setUserProfession(e.target.value)}
                  placeholder="e.g. Software Architect & Agency Owner"
                  className="w-full bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-500/35"
                />
              </div>

              {/* Story / Context */}
              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 block font-bold uppercase">Tell Jarvis about your life/business / নিজের সম্পর্কে বিবরণ</label>
                <textarea
                  rows={2}
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="e.g. I run an agency called Stonic IT. We specialize in AI automation and custom app development. I want you to manage my workflow..."
                  className="w-full bg-gray-950 border border-sky-500/15 rounded-xl p-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-500/35 resize-none font-mono"
                />
              </div>

              {/* Core Memory Facts Generator */}
              <div className="border border-sky-500/10 bg-[#020510]/80 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] text-sky-400 block font-bold uppercase flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-sky-400" />
                    <span>Memory Facts / গুরুত্বপূর্ণ ছোট মেমোরি সমূহ</span>
                  </label>
                  <span className="text-[8px] px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/15">
                    {memories.length} FACTS SAVED
                  </span>
                </div>
                
                {/* Adding interface */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMemoryFact()}
                    placeholder="Add a fact (e.g. 'আমার একটি বিড়াল আছে নাম মিনি')"
                    className="flex-1 bg-gray-950 border border-sky-500/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/35"
                  />
                  <button
                    type="button"
                    onClick={addMemoryFact}
                    className="px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/25 transition flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Display memories list */}
                {memories.length > 0 ? (
                  <div className="space-y-1.5 pt-1.5 max-h-24 overflow-y-auto">
                    {memories.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 p-1.5 bg-gray-950 border border-sky-500/5 rounded-lg text-[10px] text-gray-300">
                        <span className="truncate flex-1">🧠 {m.content}</span>
                        <button
                          type="button"
                          onClick={() => removeMemoryFact(m.id)}
                          className="text-gray-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-gray-500 italic pt-1 text-center">No micro-memories added yet. Jarvis will learn them as you use the system.</p>
                )}
              </div>

            </div>

            {/* Actions button */}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-gray-850 bg-gray-950 hover:bg-gray-900 rounded-xl text-gray-400 hover:text-gray-300 transition text-xs font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleStart}
                className="flex-1 py-3 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/35 text-sky-300 hover:text-sky-200 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.1)] flex items-center justify-center gap-2"
              >
                <span>🚀 Initialize Jarvis in {getLanguageLabel(selectedLang)}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
