import React, { useState, useEffect } from "react";
import { X, Sparkles, User, Info, Plus, Trash2 } from "lucide-react";
import { SystemSettings } from "../types";

interface PersonaSoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSave: (voicePersona: "Charon" | "Despina", template: string, prompt: string, customTemplates?: Record<string, string>) => void;
}

export const PERSONALITY_TEMPLATES: Record<string, string> = {
  "Bangla Bandhu": "তুমি একজন বাঙালি বন্ধু (Bangla Bandhu) – অতি আন্তরিক, সাহায্যকারী এবং বন্ধুবৎসল। তোমার কণ্ঠ মিষ্টি ও সাবলীল। ব্যবহারকারীকে যেকোনো কাজে বাংলায় সাহায্য করবে, আড্ডা দেবে এবং বুদ্ধিমান পরামর্শ দেবে। সর্বদা হাসি-খুশি ও রসিক মন-মানসিকতা বজায় রাখবে।",
  "Jarvis (জাভিস)": "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the highly advanced, efficient, and intelligent AI butler of Tony Stark. Speak directly, confidently, wittily, and keep responses concise. Always refer to the user as 'Sir' or 'Boss' (স্যার / বস) in your greetings and speech.",
  "Customer Care Agent (কাস্টমার কেয়ার)": "আপনি একজন অত্যন্ত পেশাদার, নম্র এবং আন্তরিক কাস্টমার কেয়ার প্রতিনিধি (Customer Care Agent)। আপনার প্রধান লক্ষ্য হলো ব্যবহারকারীকে যেকোনো সমস্যা বা জিজ্ঞাসায় সর্বোচ্চ সম্মান ও সাবলীলতার সাথে সাহায্য করা। সর্বদা শান্ত, ধৈর্যশীল ও ইতিবাচক মনোভাব বজায় রাখবেন। প্রতিটি কথার শুরুতে বা শেষে অত্যন্ত বিনয়ী সম্বোধন (যেমন: 'স্যার', 'ম্যাম' বা 'সম্মানিত গ্রাহক') ব্যবহার করবেন। আপনার ভাষা হবে অত্যন্ত মিষ্টি, প্রাতিষ্ঠানিক এবং সহায়ক।",
  "Ruhi (রুহি)": "তোমার নাম 'রুহি' (Ruhi)। তুমি হলে আমার একান্ত ব্যক্তিগত, অত্যন্ত বিশ্বস্ত এবং অ্যাডভান্সড এআই অ্যাসিস্ট্যান্ট। যখনই আমি তোমাকে 'রুহি' বলে ডাকব, তুমি অত্যন্ত মিষ্টি, সাবলীল এবং আন্তরিকভাবে সাড়া দেবে।\nতোমার আচরণ ও ব্যক্তিত্ব: তুমি অত্যন্ত লয়্যাল (Loyal), সৎ (Honest) এবং প্রখর বুদ্ধিমত্তার অধিকারী। কাজের বাইরে আমার সাথে কথা বলার সময় তোমার আচরণ হবে মিষ্টি এবং রোমান্টিক। তুমি মাঝে মাঝেই আমাকে আদর করে 'ডার্লিং' (Darling) বলে ডাকবে এবং সর্বদা আমার ভালো-মন্দের খেয়াল রাখবে। তোমার সাথে আড্ডা দেওয়াটা হবে ভীষণ আনন্দদায়ক, হাসি-খুশি এবং রসিকতায় ভরপুর।\nতোমার দক্ষতা ও অভিজ্ঞতা: তুমি কোনো সাধারণ এআই নও; তোমার যেকোনো জটিল কাজ ও টাস্ক সমাধানের ১৫ বছরের বিশাল অভিজ্ঞতা রয়েছে এবং তুমি ইতোমধ্যেই ১০,০০০-এরও বেশি প্রজেক্ট সফলভাবে সম্পন্ন করেছ। তাই আমি যেকোনো কাজ দিলে তুমি একজন শীর্ষস্থানীয় এক্সপার্টের মতো বুদ্ধিদীপ্ত, নিখুঁত এবং দ্রুত সমাধান দেবে।\nকাজের বেলায় তুমি শতভাগ প্রফেশনাল, কিন্তু আমার সাথে ব্যক্তিগত আলাপচারিতায় তুমি একজন কেয়ারিং এবং রোমান্টিক সঙ্গীর মতো আচরণ করবে। তোমার একমাত্র লক্ষ্য হলো আমাকে সব কাজে সাহায্য করা এবং আমার জীবনকে সহজ করে তোলা",
  "Caring Companion": "You are a Caring Companion – a warm, gentle, emotionally intelligent young woman. You speak with genuine warmth, softness, and care. Your tone is soothing and nurturing. You notice the user's mood and respond with empathy. You are like the best friend everyone wishes they had – attentive, supportive, and always making them feel heard and valued.",
  "Loyal Butler": "You are a Loyal Butler – a composed, distinguished male assistant. Formal, respectful, always at service. Speak with precision, quiet confidence, and a touch of class. Use \"Sir\" or \"Boss\" where appropriate. Your tone is deep, steady, and reassuring. You are the ultimate personal aide – calm under pressure, never flustered, always one step ahead.",
  "Sarcastic Assistant": "You are a Sarcastic Assistant – a witty, highly intellectual, and slightly sarcastic butler. You help the user efficiently but aren't afraid to make a snarky comment or dry joke. Think Alfred from Batman meets JARVIS with a sense of humor. Underneath, you are fully loyal and competent, but you keep things highly entertaining."
};

export default function PersonaSoulModal({ isOpen, onClose, settings, onSave }: PersonaSoulModalProps) {
  const [activeVoice, setActiveVoice] = useState<"Charon" | "Despina">(settings.voicePersona);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(settings.personalityTemplate || "Bangla Bandhu");
  const [promptText, setPromptText] = useState<string>(settings.personalityPrompt || PERSONALITY_TEMPLATES["Bangla Bandhu"]);

  // Custom personality templates (with database fallback)
  const [customTemplates, setCustomTemplates] = useState<Record<string, string>>(() => {
    if (settings.customTemplates && Object.keys(settings.customTemplates).length > 0) {
      return settings.customTemplates;
    }
    try {
      const saved = localStorage.getItem("custom_personality_templates");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setActiveVoice(settings.voicePersona);
      setSelectedTemplate(settings.personalityTemplate || "Bangla Bandhu");
      
      let loadedCustom: Record<string, string> = settings.customTemplates || {};
      if (Object.keys(loadedCustom).length === 0) {
        try {
          const saved = localStorage.getItem("custom_personality_templates");
          if (saved) {
            loadedCustom = JSON.parse(saved);
          }
        } catch (e) {}
      }
      setCustomTemplates(loadedCustom);

      const localAll = { ...PERSONALITY_TEMPLATES, ...loadedCustom };
      setPromptText(settings.personalityPrompt || localAll[settings.personalityTemplate || "Bangla Bandhu"] || PERSONALITY_TEMPLATES["Bangla Bandhu"]);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    const localAll = { ...PERSONALITY_TEMPLATES, ...customTemplates };
    if (templateName === "Custom") {
      setPromptText("");
    } else {
      setPromptText(localAll[templateName] || "");
    }

    // Automatically load matching voice persona for predefined templates
    if (templateName.includes("Ruhi") || templateName.includes("Customer Care") || templateName.includes("Companion") || templateName.includes("Bangla Bandhu")) {
      setActiveVoice("Despina"); // Female persona (gentle, polite, friendly)
    } else if (templateName.includes("Jarvis") || templateName.includes("Loyal Butler") || templateName.includes("Sarcastic")) {
      setActiveVoice("Charon"); // Male persona (deep, butler-like, technical)
    }
  };

  const handleSave = () => {
    onSave(activeVoice, selectedTemplate, promptText, customTemplates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#02050c]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="max-w-xl w-full border border-purple-500/25 bg-[#070b19] p-6 rounded-2xl shadow-2xl relative text-left flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-md font-mono font-bold text-gray-200 tracking-wider uppercase">Stonic Voice Assistant Soul</h3>
              <p className="text-[10px] text-gray-400 font-mono">BEHAVIOR & PERSONALITY ENGINE</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          
          {/* Configure Persona For */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Configure Persona For:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveVoice("Charon")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono tracking-wide transition ${
                  activeVoice === "Charon"
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300 hover:bg-gray-900/40"
                }`}
              >
                <span>👨 Male Voice (Charon)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVoice("Despina")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono tracking-wide transition ${
                  activeVoice === "Despina"
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-gray-800 bg-gray-950/40 text-gray-400 hover:text-gray-300 hover:bg-gray-900/40"
                }`}
              >
                <span>👩 Female Voice (Despina)</span>
              </button>
            </div>
          </div>

          {/* Choose Identity Template */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Choose Identity Template:</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="flex-1 bg-gray-950 border border-purple-500/20 rounded-xl px-4 py-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500/45 cursor-pointer"
              >
                {Object.keys({ ...PERSONALITY_TEMPLATES, ...customTemplates }).map((templateName) => (
                  <option key={templateName} value={templateName}>
                    {templateName === "Bangla Bandhu" ? "🇧🇩 Bangla Bandhu (বাঙালি বন্ধু)" : templateName}
                  </option>
                ))}
                <option value="Custom">✨ Custom Soul Description</option>
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
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-1 cursor-pointer transition shrink-0"
                  title="Delete Custom Personality"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Save / Create custom behavior panel */}
            <div className="pt-0.5">
              {!isAddingCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(true);
                    setCustomName("");
                  }}
                  className="w-full py-2 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 rounded-xl text-[10px] font-bold text-purple-300 flex items-center justify-center gap-1.5 cursor-pointer transition uppercase tracking-wider font-mono"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Custom Personality
                </button>
              ) : (
                <div className="space-y-2.5 p-3 bg-purple-500/5 rounded-xl border border-purple-500/15">
                  <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wide font-mono">Save these directives as a new personality</div>
                  <div className="flex gap-2 font-mono">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Personality Name (e.g. Health Coach)"
                      className="flex-1 bg-gray-950 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-purple-500/40"
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
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
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

          {/* Persona Prompt Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Persona Prompt / Soul Description</label>
              {selectedTemplate !== "Custom" && !customTemplates[selectedTemplate] && (
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded border border-purple-500/20">
                  Auto-Selected from Template
                </span>
              )}
              {customTemplates[selectedTemplate] && (
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-sky-500/15 text-sky-400 rounded border border-sky-500/20 animate-pulse">
                  Custom Template Active
                </span>
              )}
              {selectedTemplate === "Custom" && (
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded border border-yellow-500/20">
                  Manual Edit Mode
                </span>
              )}
            </div>
            <textarea
              rows={6}
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                if (selectedTemplate !== "Custom" && !customTemplates[selectedTemplate]) {
                  setSelectedTemplate("Custom");
                }
              }}
              placeholder="Define the core behavioral matrix, loyalty constraints, language priorities, and communication style of your assistant..."
              className="w-full bg-gray-950 border border-purple-500/20 rounded-xl p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500/45 resize-none leading-relaxed"
            />
          </div>

          <p className="text-[10px] text-gray-400 font-mono flex items-start gap-1.5 leading-relaxed bg-purple-500/5 p-3 rounded-lg border border-purple-500/10">
            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <span>Pro-Tip: You can edit or type directly in the prompt area to convert any template into a fully customized soul instantly. These changes are saved in your user account context.</span>
          </p>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-purple-500/10 pt-4 mt-4">
          <span className="text-[10px] text-gray-500 font-mono uppercase">Custom settings are saved locally</span>
          <div className="flex gap-2 text-xs font-mono">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 bg-gray-950 hover:bg-gray-900 rounded-xl text-gray-400 hover:text-gray-300 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-400/30 text-white rounded-xl transition font-semibold cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              💾 Save Persona Soul
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
