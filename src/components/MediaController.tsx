import React, { useState, useEffect, useRef } from "react";
import { motion, useDragControls } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Music,
  Tv,
  Loader2,
  Globe,
  RotateCw,
  Search,
  Monitor
} from "lucide-react";

interface MediaControllerProps {
  activeVideoId: string;
  setActiveVideoId: (id: string | "") => void;
  results: any[];
  activeTab: string;
  setActiveTab: (tab: "browser" | "media" | "code" | "image") => void;
  showCyberDeck: boolean;
  setShowCyberDeck: (show: boolean) => void;
  placeholderRef: React.RefObject<HTMLDivElement | null>;
  setTerminalOutput: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Custom Browser Integration props
  sandboxBrowserUrl?: string;
  setSandboxBrowserUrl?: (url: string) => void;
}

export const MediaController: React.FC<MediaControllerProps> = ({
  activeVideoId,
  setActiveVideoId,
  results,
  activeTab,
  setActiveTab,
  showCyberDeck,
  setShowCyberDeck,
  placeholderRef,
  setTerminalOutput,
  sandboxBrowserUrl = "https://www.google.com/search?igu=1",
  setSandboxBrowserUrl
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const browserIframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [placeholderRect, setPlaceholderRect] = useState<DOMRect | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activePopupTab, setActivePopupTab] = useState<"stream" | "browser">("stream");
  const [localBrowserUrl, setLocalBrowserUrl] = useState(sandboxBrowserUrl);

  // Draggable window coordinates and states using framer-motion
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  const isDocked = placeholderRect && activeTab === "media" && showCyberDeck && !isMinimized && !isMaximized;

  // Sync local URL state with prop updates
  useEffect(() => {
    setLocalBrowserUrl(sandboxBrowserUrl);
  }, [sandboxBrowserUrl]);

  // Expand and focus window on new commands
  useEffect(() => {
    if (activeVideoId) {
      setIsMinimized(false);
      setActivePopupTab("stream");
      // Give visual cues or auto-maximize if requested by voice
      setTerminalOutput((prev) => [...prev, `[JARVIS] Stream popup triggered: Ready to watch.`]);
    }
  }, [activeVideoId]);

  useEffect(() => {
    if (sandboxBrowserUrl && sandboxBrowserUrl !== "https://www.google.com/search?igu=1") {
      setIsMinimized(false);
      setActivePopupTab("browser");
      setTerminalOutput((prev) => [...prev, `[JARVIS] Personal browser popup triggered: Loading portal.`]);
    }
  }, [sandboxBrowserUrl]);

  // Synchronize state from YouTube's enablejsapi events
  useEffect(() => {
    const handleYTPostMessages = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.youtube.com" &&
        event.origin !== "https://www.youtube-nocookie.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange") {
          // -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
          const state = data.info;
          if (state === 1) {
            setIsPlaying(true);
          } else if (state === 2) {
            setIsPlaying(false);
          }
        } else if (data.event === "infoDelivery") {
          if (data.info && typeof data.info.muted !== "undefined") {
            setIsMuted(data.info.muted);
          }
        }
      } catch (e) {
        // Safe catch for non-JSON postMessages
      }
    };

    window.addEventListener("message", handleYTPostMessages);
    return () => window.removeEventListener("message", handleYTPostMessages);
  }, []);

  // Track position of the inline placeholder in the Media tab
  useEffect(() => {
    const shouldDock = activeTab === "media" && showCyberDeck && !isMinimized && !isMaximized;
    
    if (shouldDock && placeholderRef.current) {
      const updateRect = () => {
        if (placeholderRef.current) {
          setPlaceholderRect(placeholderRef.current.getBoundingClientRect());
        }
      };
      
      updateRect();
      window.addEventListener("resize", updateRect);
      
      // Let layout settle before measuring
      const timeoutId = setTimeout(updateRect, 150);
      
      return () => {
        window.removeEventListener("resize", updateRect);
        clearTimeout(timeoutId);
      };
    } else {
      setPlaceholderRect(null);
    }
  }, [activeTab, showCyberDeck, isMinimized, isMaximized, placeholderRef]);

  if (!activeVideoId && (!sandboxBrowserUrl || sandboxBrowserUrl === "https://www.google.com/search?igu=1")) {
    return null;
  }

  // Find active track details
  const activeTrack = results.find((v) => v.videoId === activeVideoId) || {
    title: "Streaming Active Frequency...",
    channel: "YouTube Uplink",
    thumbnail: `https://img.youtube.com/vi/${activeVideoId}/mqdefault.jpg`
  };

  const sendPlayerCommand = (func: string, args: any = "") => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const message = JSON.stringify({
        event: "command",
        func: func,
        args: args
      });
      iframeRef.current.contentWindow.postMessage(message, "*");
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      sendPlayerCommand("pauseVideo");
      setIsPlaying(false);
      setTerminalOutput((prev) => [...prev, "[CYBERDECK] Playback stream paused."]);
    } else {
      sendPlayerCommand("playVideo");
      setIsPlaying(true);
      setTerminalOutput((prev) => [...prev, "[CYBERDECK] Playback stream resumed."]);
    }
  };

  const handleMuteUnmute = () => {
    if (isMuted) {
      sendPlayerCommand("unMute");
      setIsMuted(false);
    } else {
      sendPlayerCommand("mute");
      setIsMuted(true);
    }
  };

  const handleSkipNext = () => {
    const currentIndex = results.findIndex((v) => v.videoId === activeVideoId);
    if (currentIndex >= 0 && currentIndex < results.length - 1) {
      const nextId = results[currentIndex + 1].videoId;
      setActiveVideoId(nextId);
      setIsPlaying(true);
      setTerminalOutput((prev) => [
        ...prev,
        `[CYBERDECK] Skipped forward to: "${results[currentIndex + 1].title}"`
      ]);
    }
  };

  const handleSkipPrev = () => {
    const currentIndex = results.findIndex((v) => v.videoId === activeVideoId);
    if (currentIndex > 0) {
      const prevId = results[currentIndex - 1].videoId;
      setActiveVideoId(prevId);
      setIsPlaying(true);
      setTerminalOutput((prev) => [
        ...prev,
        `[CYBERDECK] Skipped backward to: "${results[currentIndex - 1].title}"`
      ]);
    }
  };

  const handleSyncToDeck = () => {
    setActiveTab("media");
    setShowCyberDeck(true);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const handleBrowserGo = () => {
    let target = localBrowserUrl;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    setLocalBrowserUrl(target);
    if (setSandboxBrowserUrl) {
      setSandboxBrowserUrl(target);
    }
  };

  const handleBrowserRefresh = () => {
    if (browserIframeRef.current) {
      browserIframeRef.current.src = localBrowserUrl;
    }
  };

  // Determine styles for docked vs floating vs minimized modes
  const playerStyle: React.CSSProperties = isMaximized
    ? {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(95vw, 1150px)",
        height: "min(85vh, 700px)",
        zIndex: 9999, // High z-index to stay on top
        transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }
    : isDocked
    ? {
        position: "fixed",
        top: `${placeholderRect!.top}px`,
        left: `${placeholderRect!.left}px`,
        width: `${placeholderRect!.width}px`,
        height: `${placeholderRect!.height}px`,
        zIndex: 40,
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }
    : {
        position: "fixed",
        top: position ? `${position.y}px` : undefined,
        left: position ? `${position.x}px` : undefined,
        bottom: position ? undefined : "24px",
        right: position ? undefined : "24px",
        width: isMinimized ? "260px" : "360px",
        height: isMinimized ? "52px" : "280px",
        zIndex: 9999, // High z-index to stay on top of all other elements
        transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      };

  const originUrl = encodeURIComponent(window.location.origin);
  const playerSrc = activeVideoId 
    ? `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&mute=0&enablejsapi=1&origin=${originUrl}&widget_referrer=${originUrl}`
    : "";

  return (
    <>
      {/* Backdrop overlay for Maximized / Pop-up view */}
      {isMaximized && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99] transition-opacity duration-300"
          onClick={() => setIsMaximized(false)}
        />
      )}

      <motion.div
        drag={!isDocked && !isMaximized}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        style={playerStyle}
        className={`border flex flex-col overflow-hidden shadow-2xl backdrop-blur-md rounded-2xl group ${
          isMaximized
            ? "border-sky-500 bg-[#020512] ring-4 ring-sky-500/20"
            : isDocked
            ? "border-sky-500/20 bg-black"
            : "border-sky-500/30 bg-[#03091e]/95"
        }`}
      >
        {/* HEADER BAR */}
        <div 
          onPointerDown={(e) => {
            if (isDocked || isMaximized) return;
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest("input") || target.closest("a")) return;
            dragControls.start(e);
          }}
          className={`bg-[#040e2d] border-b border-sky-500/10 px-3 py-2.5 flex items-center justify-between text-[10px] font-mono shrink-0 select-none ${
            isDocked || isMaximized ? "" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Pulsing Visual Indicator */}
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? "bg-teal-400" : "bg-gray-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? "bg-teal-400" : "bg-gray-500"}`}></span>
            </span>

            {/* Title switcher tabs inside the popup window */}
            <div className="flex items-center bg-gray-950/60 border border-sky-500/15 rounded-lg p-0.5">
              <button
                onClick={() => setActivePopupTab("stream")}
                className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                  activePopupTab === "stream" 
                    ? "bg-sky-500/15 text-sky-400" 
                    : "text-gray-500 hover:text-gray-300"
                }`}
                title="Watch Stream Video"
              >
                <Music className="w-3 h-3" />
                <span>Stream</span>
              </button>
              <button
                onClick={() => setActivePopupTab("browser")}
                className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                  activePopupTab === "browser" 
                    ? "bg-sky-500/15 text-sky-400" 
                    : "text-gray-500 hover:text-gray-300"
                }`}
                title="Personal Browser"
              >
                <Globe className="w-3 h-3" />
                <span>Browser</span>
              </button>
            </div>

            <span className="text-gray-700 hidden sm:inline">|</span>
            <span className="text-sky-300 truncate max-w-[100px] sm:max-w-[200px] font-bold">
              {activePopupTab === "stream" 
                ? (activeVideoId ? activeTrack.title : "No Stream Loaded")
                : (localBrowserUrl || "Personal Web Browser")
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Stream Player Controls in header (Mute) */}
            {activePopupTab === "stream" && activeVideoId && (
              <button
                onClick={handleMuteUnmute}
                className="p-1 hover:text-sky-300 hover:bg-sky-500/10 rounded cursor-pointer transition text-gray-400"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            )}

            {/* Breakout / Float out of CyberDeck UI into floating window */}
            {isDocked && (
              <button
                onClick={() => {
                  const rect = placeholderRef.current?.getBoundingClientRect();
                  if (rect) {
                    setPosition({ x: rect.left, y: rect.top });
                  } else {
                    setPosition({ x: window.innerWidth - 384, y: window.innerHeight - 340 });
                  }
                  setActiveTab("browser"); // switch central tab away so it isn't dual-rendered
                  setIsMinimized(false);
                  setIsMaximized(false);
                }}
                className="p-1 hover:text-sky-300 hover:bg-sky-500/10 rounded cursor-pointer transition text-gray-400"
                title="Breakout to Floating Window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              </button>
            )}

            {/* Sync to central CyberDeck (only in floating/maximized view) */}
            {!isDocked && (
              <button
                onClick={handleSyncToDeck}
                className="p-1 hover:text-sky-300 hover:bg-sky-500/10 rounded cursor-pointer transition text-gray-400"
                title="Dock inside Workspace panel"
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Toggle Maximized (Theater Modal) popup */}
            <button
              onClick={() => {
                setIsMaximized(!isMaximized);
                setIsMinimized(false);
              }}
              className="p-1 hover:text-sky-300 hover:bg-sky-500/10 rounded cursor-pointer transition text-gray-400"
              title={isMaximized ? "Restore Window Size" : "Maximize Screen Size (Theater Mode)"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-sky-300" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Toggle Minimize/Collapse (only when not docked) */}
            {!isDocked && (
              <button
                onClick={() => {
                  setIsMinimized(!isMinimized);
                  setIsMaximized(false);
                }}
                className="p-1 hover:text-sky-300 hover:bg-sky-500/10 rounded cursor-pointer transition font-bold text-gray-400"
                title={isMinimized ? "Expand popup workspace" : "Minimize popup workspace"}
              >
                <span className="text-[12px] leading-none block h-3.5 w-3.5 flex items-center justify-center">
                  {isMinimized ? "＋" : "－"}
                </span>
              </button>
            )}

            {/* Terminate Session completely */}
            <button
              onClick={() => {
                setActiveVideoId("");
                if (setSandboxBrowserUrl) {
                  setSandboxBrowserUrl("https://www.google.com/search?igu=1");
                }
                setIsMaximized(false);
                setTerminalOutput((prev) => [...prev, "[CYBERDECK] Floating portal session closed."]);
              }}
              className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition text-gray-400 border border-transparent hover:border-red-500/20"
              title="Close Portal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CONTAINER CONTENT AREA */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 relative bg-black">
            
            {/* TAB 1: YOUTUBE MUSIC/VIDEO STREAM */}
            {activePopupTab === "stream" && (
              <div className="flex-1 flex flex-col md:flex-row min-h-0 relative h-full">
                {activeVideoId ? (
                  <>
                    {/* Video viewport (Takes full space or left side depending on Maximized and Width) */}
                    <div className="flex-1 relative bg-black h-full min-h-0">
                      <iframe
                        ref={iframeRef}
                        src={playerSrc}
                        title="CyberDeck Media Stream"
                        className="w-full h-full border-0 absolute inset-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>

                      {/* Waveform active label overlay */}
                      {isPlaying && (
                        <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-sky-500/15 flex items-center gap-2 pointer-events-none text-[8px] font-mono text-sky-400">
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-0.5 bg-sky-400 animate-pulse h-2"></span>
                            <span className="w-0.5 bg-sky-400 animate-pulse h-3.5" style={{ animationDelay: "0.15s" }}></span>
                            <span className="w-0.5 bg-sky-400 animate-pulse h-1.5" style={{ animationDelay: "0.3s" }}></span>
                            <span className="w-0.5 bg-sky-400 animate-pulse h-2.5" style={{ animationDelay: "0.45s" }}></span>
                          </div>
                          <span className="tracking-widest uppercase text-[7px] font-bold">STREAM FREQUENCY LOCKED</span>
                        </div>
                      )}
                    </div>

                    {/* Right side Search/Playlist panel - visible only when Maximized for beautiful user experience! */}
                    {isMaximized && results.length > 0 && (
                      <div className="w-80 bg-gray-950 border-l border-sky-500/10 flex flex-col p-4 font-mono text-xs text-left shrink-0">
                        <div className="flex items-center justify-between border-b border-sky-500/10 pb-2 mb-3">
                          <span className="text-[10px] text-sky-400 font-bold tracking-widest uppercase flex items-center gap-1">
                            <Music className="w-3.5 h-3.5" />
                            <span>COSMIC PLAYLIST</span>
                          </span>
                          <span className="text-[9px] text-gray-500">{results.length} tracks</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-sky-500/10">
                          {results.map((video) => {
                            const isActive = video.videoId === activeVideoId;
                            return (
                              <button
                                key={video.videoId}
                                onClick={() => {
                                  setActiveVideoId(video.videoId);
                                  setTerminalOutput(prev => [
                                    ...prev,
                                    `[PORTAL] Playlist track selected: "${video.title}"`
                                  ]);
                                }}
                                className={`w-full text-left p-2 rounded-lg border flex gap-2.5 transition cursor-pointer group ${
                                  isActive
                                    ? "border-sky-400 bg-sky-500/15"
                                    : "border-sky-500/5 bg-gray-900/30 hover:bg-sky-500/5 hover:border-sky-500/15"
                                }`}
                              >
                                <img
                                  src={video.thumbnail}
                                  alt=""
                                  className="w-16 h-10 object-cover rounded flex-shrink-0 border border-sky-500/10"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0 flex-1 flex flex-col justify-center">
                                  <p className={`font-medium truncate leading-tight ${isActive ? "text-sky-300" : "text-gray-400 group-hover:text-gray-200"}`}>
                                    {video.title}
                                  </p>
                                  <p className="text-[9px] text-gray-600 truncate mt-0.5">{video.channel}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3 font-mono">
                    <span className="text-4xl animate-bounce">🎵</span>
                    <p className="text-xs text-sky-400 uppercase tracking-widest font-bold">Acoustic Portal Idle</p>
                    <p className="text-[10px] max-w-xs text-gray-600">
                      Give a voice command or type: "play some music" to stream audio immediately.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERSONAL CYBERBROWSER PORTAL */}
            {activePopupTab === "browser" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#020510] h-full p-3 space-y-2">
                {/* Browser Address Bar inside floating modal */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={localBrowserUrl}
                      onChange={(e) => setLocalBrowserUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleBrowserGo();
                        }
                      }}
                      placeholder="Enter address URL (e.g., wikipedia.org)..."
                      className="w-full bg-gray-950 border border-sky-500/25 rounded-xl pl-9 pr-3 py-1.5 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500/50 placeholder-gray-700"
                    />
                    <Globe className="w-3.5 h-3.5 text-sky-500/40 absolute left-3.5 top-2.5" />
                  </div>
                  
                  <button
                    onClick={handleBrowserRefresh}
                    className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl cursor-pointer transition"
                    title="Reload Webpage"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleBrowserGo}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Go</span>
                  </button>

                  <a
                    href={localBrowserUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl flex items-center justify-center cursor-pointer transition"
                    title="Launch Webpage in Native Browser Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Secure IFrame Window */}
                <div className="flex-1 border border-sky-500/15 bg-black rounded-xl overflow-hidden relative min-h-0">
                  <iframe
                    ref={browserIframeRef}
                    src={localBrowserUrl}
                    title="Jarvis Popup Browser"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  ></iframe>
                  
                  <div className="absolute bottom-2.5 right-2.5 bg-[#020510]/95 border border-sky-500/20 px-2.5 py-1 rounded text-[8px] font-mono text-gray-400 pointer-events-none select-none">
                    PERSONAL PORTAL FRAME
                  </div>
                </div>

                <p className="text-[8px] font-mono text-gray-500 text-left leading-tight">
                  💡 <span className="font-bold text-sky-500/70">X-Frame Policy Note:</span> Some major portals (Google, Facebook, YouTube) restrict embedding inside nested frames. Use the native new-tab button in the address bar if any site appears blank.
                </p>
              </div>
            )}

          </div>
        )}

        {/* BOTTOM FLOATING CONTROL BAR (Visible when not docked or when minimized) */}
        {(!isDocked || isMinimized) && activePopupTab === "stream" && activeVideoId && (
          <div className="bg-[#030a21] border-t border-sky-500/10 p-2 flex items-center justify-between shrink-0 font-mono text-[9px] select-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSkipPrev}
                disabled={results.findIndex((v) => v.videoId === activeVideoId) <= 0}
                className="p-1 hover:bg-sky-500/10 hover:text-sky-300 text-gray-500 rounded disabled:opacity-20 cursor-pointer transition"
                title="Previous Track"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 rounded-lg cursor-pointer transition shadow-sm"
                title={isPlaying ? "Pause Stream" : "Resume Stream"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              
              <button
                onClick={handleSkipNext}
                disabled={
                  results.findIndex((v) => v.videoId === activeVideoId) >= results.length - 1 ||
                  results.length <= 1
                }
                className="p-1 hover:bg-sky-500/10 hover:text-sky-300 text-gray-500 rounded disabled:opacity-20 cursor-pointer transition"
                title="Next Track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right min-w-0 pl-3">
              <p className="text-sky-300/90 font-bold truncate text-[8px] leading-tight">
                {activeTrack.title}
              </p>
              <p className="text-gray-500 text-[7px] truncate leading-none mt-0.5">
                {activeTrack.channel}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};
