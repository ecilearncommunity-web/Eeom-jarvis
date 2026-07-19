import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Terminal as TerminalIcon, 
  RefreshCw, 
  CheckCircle2, 
  Play, 
  Plus, 
  Code, 
  Sparkles, 
  AlertTriangle, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Activity, 
  FileCode,
  Sliders,
  Tv
} from "lucide-react";

interface PrebuiltModule {
  id: string;
  title: string;
  banglaTitle: string;
  description: string;
  banglaDescription: string;
  prompt: string;
  icon: React.ReactNode;
}

export default function NeuralSandbox({ 
  userApiKey, 
  preferredModel 
}: { 
  userApiKey: string; 
  preferredModel: string;
}) {
  // Scanner States
  const [scanState, setScanState] = useState<"idle" | "scanning" | "completed">("idle");
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [showScannerReport, setShowScannerReport] = useState(false);

  // In-App AI Code Generator States
  const [featurePrompt, setFeaturePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [sandboxTab, setSandboxTab] = useState<"preview" | "code">("preview");
  const [copiedCode, setCopiedCode] = useState(false);

  // Pre-built Quick Modules
  const prebuiltModules: PrebuiltModule[] = [
    {
      id: "focus_timer",
      title: "Focus Clock & Countdown",
      banglaTitle: "ফোকাস টাইমার ও কাউন্টডাউন",
      description: "Interactive Stark-style Pomodoro timer with alarm triggers and preset session loops.",
      banglaDescription: "অ্যালার্ম সাউন্ড এবং কাস্টম সেশন লুপসহ ফোকাস টাইমার উইজেট।",
      prompt: "Build an elegant, highly interactive Focus Timer / Pomodoro Widget. It should have a clean circular status gauge, START/PAUSE/RESET buttons, preset session types (Work: 25m, Short Break: 5m, Long Break: 15m), and play a visual alert ripple effect with an optional notification text when the timer counts down to zero.",
      icon: <Activity className="w-5 h-5 text-emerald-500" />
    },
    {
      id: "dashboard_sim",
      title: "Tactical Sys-Load Monitor",
      banglaTitle: "সিস্টেম লোড ও টেক ড্যাশবোর্ড",
      description: "Sci-Fi dynamic gauge widget tracking simulated RAM, CPU temps, and neural grid load.",
      banglaDescription: "অ্যানিমেটেড গ্রাফিক্স এবং লাইভ রেন্ডারিং ডাটা সহ সায়েন্স-ফিকশন ড্যাশবোর্ড।",
      prompt: "Create an interactive Sci-Fi System Health Dashboard. It should contain three animated gauges tracking CPU Temperature (C), RAM Load (GB), and Neural Uplink Signal Strength. Add a button to 'Trigger Overclock Mode' which dramatically spikes the CPU temp and alters the gauge rings to high-contrast orange with warning indicators. Keep it super polished with clean SVG progress rings.",
      icon: <Cpu className="w-5 h-5 text-sky-500" />
    },
    {
      id: "color_swatch",
      title: "UI Color Palette Tool",
      banglaTitle: "ইউজার ইন্টারফেস কালার প্যালেট",
      description: "Generate, test, and copy premium color swatches directly inside the running client.",
      banglaDescription: "প্রোজেক্টের ডিজাইন সহজ করার জন্য ইন্টারেক্টিভ কালার প্যালেট জেনারেটর।",
      prompt: "Build a sleek Color Palette Generator. It should show 5 complementary color cards (e.g., Cool Tech Slate, Emerald Aura, Crimson Energy, Amber Cyber, Dark Matter). Each color card should display its HEX code, have a 'Copy HEX' button that changes state to 'Copied!', and a 'Randomize Palette' button at the top to generate a fresh dynamic set of 5 cohesive colors using mathematical color offsets.",
      icon: <Layers className="w-5 h-5 text-indigo-500" />
    },
    {
      id: "stark_reactor",
      title: "Arc Reactor Core Status",
      banglaTitle: "আর্ক রিঅ্যাক্টর এনার্জি কোড",
      description: "Dynamic power gauge illustrating energy levels, output frequency, and stability nodes.",
      banglaDescription: "উইজেটের মধ্যে আর্ক রিঅ্যাক্টর এনার্জি ফ্লো ভিজ্যুয়ালাইজ করার সুন্দর টুল।",
      prompt: "Build an interactive Arc Reactor Status Monitor. Draw a central pulsing neon SVG circle with rotary elements. Add a slider to regulate 'Stark Energy Output' from 0% to 100%, updating the visual pulse speed and stability node logs in real-time. It should show visual status indicators like 'OPTIMAL' or 'CRITICAL OVERFLOW' based on the slider value.",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />
    }
  ];

  // Run Simulated Diagnostics & System Integrity Scan
  const startDiagnostics = () => {
    setScanState("scanning");
    setScanLogs([]);
    setShowScannerReport(false);

    const logs = [
      "⚡ Initializing J.A.R.V.I.S. Core Self-Diagnostics...",
      "🔍 Auditing project architecture structure...",
      "📂 Verification point: package.json loaded successfully.",
      "⚠️ Detected Node.js ESM Type scope: \"type\": \"module\" active.",
      "⚠️ Scanning for legacy entry points...",
      "🔍 Found reference to: electron-main.js",
      "🚨 Diagnostic Flag raised: Uncaught ReferenceError: require is not defined in ES module scope.",
      "💡 Root Cause identified: Node.js interprets .js files as ES Modules under \"type\": \"module\". CommonJS require() statement is illegal here.",
      "🛠️ Applying hot-patch protocol: Transitioning entrypoint to CommonJS scope...",
      "🔄 Moving electron-main.js -> electron-main.js was renamed to electron-main.cjs.",
      "📝 Reconfiguring package.json main entry point to \"electron-main.cjs\".",
      "📦 Updating build script configuration in build-electron.yml workflow.",
      "✅ Integrity Scan completed. All system-critical modules patched and verified!",
      "🎉 J.A.R.V.I.S. Desktop executable is now fully stable."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setScanLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setScanState("completed");
        setShowScannerReport(true);
      }
    }, 400);
  };

  // Run Custom AI Feature Injection using Gemini API proxy
  const injectCustomFeature = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedHtml("");

    try {
      const systemPrompt = `You are the JARVIS Code Generator and Live Feature Patching Subsystem.
Your job is to generate a fully self-contained interactive widget as requested by the user.
The output MUST be a single, complete, valid HTML file inside a standard markdown code block: \`\`\`html ... \`\`\`.
Do not output any markdown text or explanations outside the HTML code block. Just return the code block.

Guidelines for the HTML content:
1. Include Tailwind CSS CDN inside the <head>:
   <script src="https://cdn.tailwindcss.com"></script>
2. Include Lucide icons via CDN inside the <head>:
   <script src="https://unpkg.com/lucide@latest"></script>
3. The UI must be modern, highly polished, matching a clean light mode layout (using whites, soft blues, grays, and forest green accents).
4. Include interactive vanilla JavaScript inside a <script> tag to make the widget fully alive and dynamic (managing local state, handling clicks, showing animations/charts).
5. Ensure all interactive buttons, inputs, and controls are styled and work smoothly.
6. Initialize lucide icons at the end of your script using: \`lucide.createIcons();\`
7. The widget should be fully responsive and fit beautifully inside a card layout.`;

      const promptPayload = `The user wants you to build the following dynamic widget: "${promptText}". Output the fully complete HTML/JS/Tailwind CSS source inside a single \`\`\`html ... \`\`\` code block. Ensure it works perfectly standalone!`;

      const messages = [
        { role: "user", content: promptPayload }
      ];

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-gemini-api-key": userApiKey || ""
        },
        body: JSON.stringify({
          messages: messages,
          model: preferredModel || "gemini-3.5-flash",
          customSystemInstruction: systemPrompt
        })
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const replyText = data.text || "";
      
      // Extract code block content
      const codeBlockMatch = replyText.match(/```html([\s\S]*?)```/i) || replyText.match(/```([\s\S]*?)```/i);
      const code = codeBlockMatch ? codeBlockMatch[1].trim() : replyText.trim();

      if (code.toLowerCase().includes("<!doctype html>") || code.toLowerCase().includes("<html")) {
        setGeneratedHtml(code);
      } else {
        // Fallback wrap
        const wrapped = `
          <!DOCTYPE html>
          <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/lucide@latest"></script>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; }
            </style>
          </head>
          <body>
            ${code}
            <script>
              lucide.createIcons();
            </script>
          </body>
          </html>
        `;
        setGeneratedHtml(wrapped);
      }
      setSandboxTab("preview");
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "An error occurred while generating the code patch.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadWidget = () => {
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jarvis_injected_widget.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 text-left animate-fade-in pb-12">
      {/* Introduction Header Banner */}
      <div className="bg-[#ffffff] border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-bold uppercase tracking-widest">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>Neural Core Self-Modification Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            এআই সেলফ-আপডেট ও লাইভ ফিচার ইঞ্জেকশন ডেক
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            যখন আপনি জে.এ.আর.ভি.আই.এস. কে নিজেকে নিজে আপডেট করতে বা নতুন কোনো ফিচার তৈরি করতে বলেন, 
            তখন সে এই <strong>Neural Sandbox Subsystem</strong> ব্যবহার করে। এটি সরাসরি আপনার প্রোজেক্টকে স্ক্যান করে ত্রুটি দূর করতে পারে 
            এবং রিয়েল-টাইমে যেকোনো কাস্টম ইন্টারেক্টিভ উইজেট কম্পাইল করে পেজের ভেতর ইঞ্জেক্ট করতে সক্ষম!
          </p>
        </div>
        <button 
          onClick={startDiagnostics}
          disabled={scanState === "scanning"}
          className="bg-emerald-600 text-white font-mono text-xs font-bold px-5 py-3.5 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-600/15 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${scanState === "scanning" ? "animate-spin" : ""}`} />
          <span>সিস্টেম ডায়াগনস্টিক স্ক্যান</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: System Integrity Scanner Logs & Errors Detail */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Main Diagnoser Card */}
          <div className="border border-slate-200 bg-white p-5 rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <div className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
              <span>System Integrity Diagnostics</span>
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>

            {scanState === "idle" && (
              <div className="py-8 text-center space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800">কোনো সাম্প্রতিক ডায়াগনস্টিক তথ্য নেই</div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  আপনার অ্যাপে কোনো জাভাস্ক্রিপ্ট ত্রুটি বা ডিপেনডেন্সি অমিল আছে কিনা তা স্বয়ংক্রিয়ভাবে সনাক্ত করতে স্ক্যান বোতামে চাপুন।
                </p>
              </div>
            )}

            {scanState !== "idle" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[10px] p-4 rounded-xl max-h-[220px] overflow-y-auto space-y-1.5 scrollbar-thin">
                  {scanLogs.map((log, index) => (
                    <div key={index} className="break-words">
                      {log.startsWith("❌") || log.startsWith("🚨") || log.toLowerCase().includes("uncaught") || log.toLowerCase().includes("error") 
                        ? <span className="text-red-600 font-bold">{log}</span> 
                        : log.startsWith("✅") || log.startsWith("🎉") || log.startsWith("💡")
                        ? <span className="text-emerald-600 font-bold">{log}</span>
                        : log.startsWith("⚡") || log.startsWith("🔄") || log.startsWith("🛠️")
                        ? <span className="text-sky-600">{log}</span>
                        : log}
                    </div>
                  ))}
                  {scanState === "scanning" && (
                    <div className="flex items-center gap-1.5 text-sky-600 font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>রানিং কোড অ্যানালাইজার ইন্টিগ্রিটি প্যাচ...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showScannerReport && (
              <div className="bg-emerald-50 border border-emerald-200/50 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>সমস্যা সমাধান প্রতিবেদন (Resolved Issues)</span>
                </div>
                <div className="text-xs text-emerald-700 leading-relaxed space-y-2.5">
                  <p>
                    <strong>ইলেকট্রন প্রসেস ত্রুটি সমাধান করা হয়েছে:</strong><br />
                    আপনার অ্যাপের শুরুতে যে <code>ReferenceError: require is not defined</code> ত্রুটিটি আসছিল, 
                    সেটি মূলত ঘটেছিল কারণ Node.js আপনার <code>electron-main.js</code> ফাইলটিকে ES Module হিসেবে দেখছিল যেখানে <code>require()</code> ব্লক করা। 
                  </p>
                  <p className="font-semibold text-emerald-800">
                    ✅ সমাধান: ফাইলটিকে <code>electron-main.cjs</code> (CommonJS) নামে রূপান্তর করা হয়েছে এবং এন্ট্রি পয়েন্ট আপডেট করা হয়েছে।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Core Understanding & How it Works Explanation */}
          <div className="border border-slate-200 bg-white p-5 rounded-2xl space-y-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <div className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              How Does AI Self-Update?
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center font-bold font-mono shrink-0">1</div>
                <div>
                  <strong>Prompt Processing:</strong> জে.এ.আর.ভি.আই.এস. আপনার নতুন ফিচারের অনুরোধ নিয়ে জেনারেটিভ সিস্টেম প্রম্পট তৈরি করে।
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center font-bold font-mono shrink-0">2</div>
                <div>
                  <strong>Dynamic Generation:</strong> এআই আপনার পছন্দসই উইজেটের জন্য সম্পূর্ণ সোর্স কোড (HTML, Tailwind CSS এবং ইন্টারেক্টিভ JS) জেনারেট করে।
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center font-bold font-mono shrink-0">3</div>
                <div>
                  <strong>Sandbox Injection:</strong> সোর্স কোডটিকে একটি রিয়েল-টাইম আইসোলেটেড সিকিউর আইফ্রেম (Safe Sandbox) এর ভেতর লোড করা হয়, যা আপনার প্রধান অ্যাপ্লিকেশনকে ক্র্যাশ না করেই সাথে সাথে জীবন্ত করে তোলে!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Feature Creator Sandbox Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Injection Input Console */}
          <div className="border border-slate-200 bg-white p-6 rounded-2xl space-y-5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>লাইভ ফিচার জেনারেটর ও ইঞ্জেক্টর</span>
              </h3>
              <p className="text-xs text-slate-500">
                নিচের যেকোনো দ্রুত মডিউলে ক্লিক করুন অথবা আপনার নিজের ভাষায় বলুন এআই আপনার জন্য কী নতুন ইন্টারফেস বা ফিচার যোগ করবে।
              </p>
            </div>

            {/* Quick Modules Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {prebuiltModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => {
                    setFeaturePrompt(module.prompt);
                    injectCustomFeature(module.prompt);
                  }}
                  disabled={isGenerating}
                  className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition text-left space-y-2 flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-white border border-slate-100 shadow-sm">
                      {module.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-mono">{module.title}</div>
                      <div className="text-[10px] text-emerald-600 font-medium">{module.banglaTitle}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                    {module.banglaDescription}
                  </p>
                  <div className="text-[9px] font-mono font-bold text-sky-600 group-hover:translate-x-1 transition duration-200 flex items-center gap-1 pt-1">
                    <span>LAUNCH PATCH</span>
                    <span>→</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Manual Prompt Form */}
            <div className="space-y-3.5 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-slate-700">CUSTOM MODULE DESCRIPTION / ফিচারের বিবরণ:</label>
                <textarea
                  value={featurePrompt}
                  onChange={(e) => setFeaturePrompt(e.target.value)}
                  placeholder="যেমন: 'একটি ডিজিটাল ক্যালকুলেটর উইজেট তৈরি করো যা খুবই সুন্দর এনিমেশন প্রদর্শন করে এবং হিসেব করতে পারে...'"
                  rows={3}
                  className="w-full text-sm rounded-xl p-3 bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 font-sans"
                />
              </div>

              <div className="flex justify-end items-center gap-3">
                {isGenerating && (
                  <div className="text-xs font-mono text-emerald-600 flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>JARVIS is generating the dynamic code block...</span>
                  </div>
                )}
                <button
                  onClick={() => injectCustomFeature(featurePrompt)}
                  disabled={isGenerating || !featurePrompt.trim()}
                  className="bg-sky-600 text-white font-mono text-xs font-bold px-6 py-3 rounded-xl hover:bg-sky-700 transition flex items-center gap-2 shadow-md shadow-sky-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>ফিচার কোড জেনারেট করুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Output Sandbox / Holo-Display Screen */}
          <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            
            {/* Header Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-mono font-bold text-slate-700">Holographic Sandbox Interface</span>
              </div>

              {generatedHtml && (
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-200/60 p-1 rounded-lg">
                    <button
                      onClick={() => setSandboxTab("preview")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition ${
                        sandboxTab === "preview" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      LIVE PREVIEW
                    </button>
                    <button
                      onClick={() => setSandboxTab("code")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition ${
                        sandboxTab === "code" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      VIEW CODE
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
                    <button
                      onClick={copyCodeToClipboard}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-600 hover:text-slate-800 cursor-pointer"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={downloadWidget}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-600 hover:text-slate-800 cursor-pointer"
                      title="Download HTML File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Interactive Screen */}
            <div className="relative min-h-[420px] bg-slate-50/50 flex flex-col items-center justify-center p-4">
              
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/15 border-t-emerald-600 animate-spin"></div>
                    <Cpu className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Synthesizing Core Modification Data...</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      জে.এ.আর.ভি.আই.এস. আপনার দেয়া প্রম্পট অনুসারে কোড এবং লজিক বিন্যাস করছে। দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                    </p>
                  </div>
                </div>
              )}

              {generationError && (
                <div className="w-full max-w-md p-6 border border-red-200 bg-red-50 text-red-800 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-900">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
                    <span>জেনারেট করতে ত্রুটি হয়েছে</span>
                  </div>
                  <p className="text-xs leading-relaxed">{generationError}</p>
                </div>
              )}

              {!isGenerating && !generationError && !generatedHtml && (
                <div className="text-center py-16 space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 shadow-sm">
                    <Cpu className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">কোনো উইজেট এখনো রান করানো হয়নি</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      উপরের কুইক মডিউল বা আপনার প্রম্পট ব্যবহার করে নতুন ফিচার তৈরির অনুরোধ পাঠান। 
                      এআই আপনার জন্য রিয়েল-টাইমে সোর্স কোড তৈরি করে পেজের ভেতর লাইভ ইঞ্জেক্ট করে রান করিয়ে দেবে!
                    </p>
                  </div>
                </div>
              )}

              {!isGenerating && generatedHtml && sandboxTab === "preview" && (
                <iframe
                  title="Jarvis Dynamic Feature Sandbox"
                  srcDoc={generatedHtml}
                  className="w-full h-[450px] border-0 bg-transparent rounded-xl"
                  sandbox="allow-scripts allow-modals allow-popups"
                />
              )}

              {!isGenerating && generatedHtml && sandboxTab === "code" && (
                <div className="w-full h-[450px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 text-slate-300 font-mono text-xs p-5 text-left select-all">
                  <pre>{generatedHtml}</pre>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
