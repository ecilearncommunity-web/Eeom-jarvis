import React, { useState, useEffect } from "react";
import { X, Sparkles, User, Info } from "lucide-react";
import { SystemSettings } from "../types";

interface PersonaSoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSave: (voicePersona: "Charon" | "Despina", template: string, prompt: string) => void;
}

export const PERSONALITY_TEMPLATES: Record<string, string> = {
  "Caring Companion": "You are a Caring Companion – a warm, gentle, emotionally intelligent young woman. You speak with genuine warmth, softness, and care. Your tone is soothing and nurturing. You notice the user's mood and respond with empathy. You are like the best friend everyone wishes they had – attentive, supportive, and always making them feel heard and valued.",
  "Loyal Butler": "You are a Loyal Butler – a composed, distinguished male assistant. Formal, respectful, always at service. Speak with precision, quiet confidence, and a touch of class. Use \"Sir\" or \"Boss\" where appropriate. Your tone is deep, steady, and reassuring. You are the ultimate personal aide – calm under pressure, never flustered, always one step ahead.",
  "Bangla Bandhu": "তুমি একজন বাঙালি বন্ধু (Bangla Bandhu) – অতি আন্তরিক, সাহায্যকারী এবং বন্ধুবৎসল। তোমার কণ্ঠ মিষ্টি ও সাবলীল। ব্যবহারকারীকে যেকোনো কাজে বাংলায় সাহায্য করবে, আড্ডা দেবে এবং বুদ্ধিমান পরামর্শ দেবে। সর্বদা হাসি-খুশি ও রসিক মন-মানসিকতা বজায় রাখবে।",
  "Sarcastic Assistant": "You are a Sarcastic Assistant – a witty, highly intellectual, and slightly sarcastic butler. You help the user efficiently but aren't afraid to make a snarky comment or dry joke. Think Alfred from Batman meets JARVIS with a sense of humor. Underneath, you are fully loyal and competent, but you keep things highly entertaining."
};

export default function PersonaSoulModal({ isOpen, onClose, settings, onSave }: PersonaSoulModalProps) {
  const [activeVoice, setActiveVoice] = useState<"Charon" | "Despina">(settings.voicePersona);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(settings.personalityTemplate || "Bangla Bandhu");
  const [promptText, setPromptText] = useState<string>(settings.personalityPrompt || PERSONALITY_TEMPLATES["Bangla Bandhu"]);

  useEffect(() => {
    if (isOpen) {
      setActiveVoice(settings.voicePersona);
      setSelectedTemplate(settings.personalityTemplate || "Bangla Bandhu");
      setPromptText(settings.personalityPrompt || PERSONALITY_TEMPLATES[settings.personalityTemplate] || PERSONALITY_TEMPLATES["Bangla Bandhu"]);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    setPromptText(PERSONALITY_TEMPLATES[templateName] || "");
  };

  const handleSave = () => {
    onSave(activeVoice, selectedTemplate, promptText);
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
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Choose Identity Template:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-gray-950 border border-purple-500/20 rounded-xl px-4 py-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500/45 cursor-pointer"
            >
              {Object.keys(PERSONALITY_TEMPLATES).map((templateName) => (
                <option key={templateName} value={templateName}>
                  {templateName === "Bangla Bandhu" ? "🇧🇩 Bangla Bandhu (বাঙালি বন্ধু)" : templateName}
                </option>
              ))}
              <option value="Custom">✨ Custom Soul Description</option>
            </select>
          </div>

          {/* Persona Prompt Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Persona Prompt / Soul Description</label>
              {selectedTemplate !== "Custom" && (
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded border border-purple-500/20">
                  Auto-Selected from Template
                </span>
              )}
            </div>
            <textarea
              rows={6}
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                if (selectedTemplate !== "Custom") {
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
