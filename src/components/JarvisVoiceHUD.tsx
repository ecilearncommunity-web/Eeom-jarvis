import React, { useState, useEffect } from "react";
import { 
  Mic, 
  MicOff, 
  X, 
  Loader2, 
  Activity, 
  Database, 
  Globe, 
  Tv, 
  Terminal, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX
} from "lucide-react";
import { Message } from "../types";

interface JarvisVoiceHUDProps {
  liveWsStatus: "disconnected" | "connecting" | "connected";
  liveVoiceActive: boolean;
  chatMessages: Message[];
  stopLiveVoiceSession: () => void;
  processingActions: Record<string, { type: string; status: "idle" | "running" | "success" | "failed"; error?: string; resultUrl?: string }>;
  setSandboxActiveTab: (tab: "browser" | "media" | "code" | "image") => void;
  setShowCyberDeck: (show: boolean) => void;
  setCurrentView: (view: "dashboard" | "chat" | "workspace" | "workshop" | "console" | "vault" | "webhooks") => void;
}

export const JarvisVoiceHUD: React.FC<JarvisVoiceHUDProps> = ({
  liveWsStatus,
  liveVoiceActive,
  chatMessages,
  stopLiveVoiceSession,
  processingActions,
  setSandboxActiveTab,
  setShowCyberDeck,
  setCurrentView,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastUserSpeech, setLastUserSpeech] = useState<string>("");
  const [lastJarvisResponse, setLastJarvisResponse] = useState<string>("");

  // Extract real-time transcripts from chatMessages
  useEffect(() => {
    const userMsgs = chatMessages.filter(m => m.role === "user");
    const aiMsgs = chatMessages.filter(m => m.role === "assistant" && !m.content.includes("[SYSTEM ACTION TRIGGERED]"));
    
    if (userMsgs.length > 0) {
      setLastUserSpeech(userMsgs[userMsgs.length - 1].content);
    }
    if (aiMsgs.length > 0) {
      setLastJarvisResponse(aiMsgs[aiMsgs.length - 1].content);
    }
  }, [chatMessages]);

  if (liveWsStatus === "disconnected") return null;

  // Gather active actions
  const activeActionsList = Object.entries(processingActions)
    .filter(([_, info]) => (info as any).status === "running")
    .map(([id, info]) => ({ id, ...(info as any) }));

  const handleActionClick = (type: string) => {
    setCurrentView("chat");
    setShowCyberDeck(true);
    if (type === "play_youtube") {
      setSandboxActiveTab("media");
    } else if (type === "open_web") {
      setSandboxActiveTab("browser");
    } else if (type === "generate_image") {
      setSandboxActiveTab("image");
    } else if (type === "run_code") {
      setSandboxActiveTab("code");
    } else if (type === "query_database_logs") {
      setCurrentView("console");
    }
  };

  return (
    <div 
      className={`fixed bottom-6 left-6 z-[9999] max-w-sm w-full transition-all duration-300 ${
        isMinimized ? "h-auto" : "h-auto"
      }`}
    >
      <div className="border border-cyan-500/35 bg-black/90 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* HUD HEADER */}
        <div className="bg-[#04112e]/90 border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {/* Pulsing visual core */}
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                liveWsStatus === "connecting" ? "bg-amber-400" : "bg-cyan-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                liveWsStatus === "connecting" ? "bg-amber-500" : "bg-cyan-500"
              }`}></span>
            </span>
            <span className="font-orbitron text-[10px] font-black tracking-widest text-cyan-400 uppercase">
              {liveWsStatus === "connecting" ? "UPLINK INITIALIZING..." : "J.A.R.V.I.S. ACTIVE VOICE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-cyan-300 transition p-1 hover:bg-cyan-500/10 rounded cursor-pointer"
              title={isMinimized ? "Expand HUD" : "Minimize HUD"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={stopLiveVoiceSession}
              className="text-gray-400 hover:text-red-400 transition p-1 hover:bg-red-500/10 rounded cursor-pointer border border-transparent hover:border-red-500/20"
              title="Disconnect Voice Link"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* HUD CONTENT */}
        {!isMinimized && (
          <div className="p-4 space-y-3.5 text-left font-mono">
            {/* Waveform visualizer */}
            {liveWsStatus === "connected" && (
              <div className="flex items-center justify-center gap-1.5 py-3 border-b border-cyan-500/10 bg-black/40 rounded-xl px-2">
                <div className="text-[9px] text-cyan-500/70 mr-2 uppercase tracking-wider font-bold">Audio Grid:</div>
                <div className="flex items-end gap-1 h-5">
                  {[...Array(9)].map((_, i) => {
                    const delay = [0.1, 0.4, 0.25, 0.6, 0.15, 0.5, 0.3, 0.7, 0.2][i];
                    return (
                      <div 
                        key={i} 
                        className="w-1 bg-cyan-400 rounded-full animate-pulse"
                        style={{ 
                          height: liveVoiceActive ? "100%" : "25%",
                          animationDuration: `${0.6 + delay}s`,
                          animationDelay: `${delay}s`
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-[8px] text-cyan-400 ml-3 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 animate-pulse">
                  {liveVoiceActive ? "Listening" : "Speaking / Idle"}
                </span>
              </div>
            )}

            {/* Live Transcripts Log */}
            <div className="space-y-3">
              {/* User spoken input */}
              <div className="space-y-1">
                <div className="text-[9px] text-cyan-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>👤</span>
                  <span>You (ভয়েস ইনপুট):</span>
                </div>
                <div className="bg-gray-950/60 border border-cyan-500/5 p-2.5 rounded-xl text-xs text-gray-300 min-h-[40px] leading-relaxed max-h-[80px] overflow-y-auto">
                  {lastUserSpeech ? (
                    <span className="text-gray-200">{lastUserSpeech}</span>
                  ) : (
                    <span className="text-gray-600 italic">Listening to your voice... (কথা বলুন)</span>
                  )}
                </div>
              </div>

              {/* J.A.R.V.I.S. response spoken output */}
              <div className="space-y-1">
                <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>J.A.R.V.I.S. (আউটপুট):</span>
                </div>
                <div className="bg-gray-950/60 border border-cyan-500/5 p-2.5 rounded-xl text-xs text-emerald-300 min-h-[40px] leading-relaxed max-h-[100px] overflow-y-auto scrollbar-thin">
                  {lastJarvisResponse ? (
                    <span>{lastJarvisResponse}</span>
                  ) : (
                    <span className="text-gray-600 italic">Waiting for response...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Active System Actions Execution Grid */}
            {activeActionsList.length > 0 && (
              <div className="border-t border-cyan-500/10 pt-3 space-y-2">
                <div className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse text-yellow-400" />
                  <span>Subsystem Actions Running:</span>
                </div>
                <div className="space-y-1.5">
                  {activeActionsList.map((act) => {
                    let icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />;
                    let label = "Processing Action...";
                    if (act.type === "play_youtube") {
                      icon = <Tv className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />;
                      label = "Playing Media stream...";
                    } else if (act.type === "open_web") {
                      icon = <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />;
                      label = "Loading web portal...";
                    } else if (act.type === "query_database_logs") {
                      icon = <Database className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />;
                      label = "Querying database records...";
                    } else if (act.type === "run_code") {
                      icon = <Terminal className="w-3.5 h-3.5 text-green-400 animate-pulse" />;
                      label = "Compiling Script payload...";
                    }

                    return (
                      <button
                        key={act.id}
                        onClick={() => handleActionClick(act.type)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {icon}
                          <span className="text-[10px] text-yellow-300 font-bold truncate">{label}</span>
                        </div>
                        <span className="text-[8px] text-cyan-400 font-bold group-hover:underline">VIEW ➔</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Floating Action Hint */}
            <div className="text-[8px] text-gray-500 text-center leading-tight">
              Tip: Ask to <span className="text-cyan-400">"play some music"</span>, <span className="text-cyan-400">"open wikipedia"</span>, or <span className="text-cyan-400">"query database records"</span>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
