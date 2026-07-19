import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Globe, 
  RefreshCw, 
  Activity, 
  Mail, 
  Database, 
  Cpu, 
  Terminal,
  Compass,
  Layers,
  Settings,
  HelpCircle
} from "lucide-react";

export interface Planet {
  id: string;
  name: string;
  status: string;
  details: string[];
  color: string;
  orbitDuration: string;
  distance: string;
  icon: React.ReactNode;
  prompt: string;
  metric: string;
  orbitTier: number;
  category: "security" | "marketing" | "workspace" | "future";
}

interface NeuralOrbitVisualizerProps {
  onPlanetClick: (planet: Planet) => void;
  systemState: string;
}

// Map planet IDs to realistic design specs (radius, speed, size, color, curveStrength, and classes)
const planetRenderSpecs: Record<string, { radius: number; speed: number; size: number; color: string; curveStrength: number; cssClass?: string }> = {
  brand_guard: { radius: 100, speed: 0.0035, size: 32, color: "#10b981", curveStrength: 30 },
  seo_rank: { radius: 155, speed: 0.0022, size: 36, color: "#38bdf8", curveStrength: -40 },
  amazon_sync: { radius: 210, speed: 0.0016, size: 48, color: "#a855f7", curveStrength: 50, cssClass: "p-saturn" },
  ppc_engine: { radius: 270, speed: 0.0011, size: 54, color: "#fbbf24", curveStrength: -60 },
  google_workspace: { radius: 330, speed: 0.0008, size: 42, color: "#ef4444", curveStrength: 70 },
  cloud_sql: { radius: 385, speed: 0.0006, size: 34, color: "#14b8a6", curveStrength: -80 },
  future_node_1: { radius: 440, speed: 0.0004, size: 32, color: "#ec4899", curveStrength: 90 },
  future_node_2: { radius: 490, speed: 0.0003, size: 32, color: "#06b6d4", curveStrength: -100 }
};

// Helper function to dynamically scale orbit radii to fit perfectly inside the container while guaranteeing a safe gap from the Sun core
const getOrbitRadius = (specRadius: number, cx: number, cy: number) => {
  const minOrbitRadius = 110; // Guarantees a clean 40px margin around the 70px radius system core
  const maxOrbitRadius = Math.max(minOrbitRadius + 120, Math.min(cx, cy) - 32);
  const minSpecRadius = 100;
  const maxSpecRadius = 490;
  const specRange = maxSpecRadius - minSpecRadius;
  const orbitRange = maxOrbitRadius - minOrbitRadius;
  
  return minOrbitRadius + ((specRadius - minSpecRadius) / specRange) * orbitRange;
};

export default function NeuralOrbitVisualizer({ onPlanetClick, systemState }: NeuralOrbitVisualizerProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string>("all");
  const [dimensions, setDimensions] = useState({ cx: 230, cy: 230 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dimensionsRef = useRef(dimensions);
  const hoveredPlanetRef = useRef<string | null>(null);
  const activeSectorRef = useRef(activeSector);

  // Refs for direct DOM manipulation to maintain 60FPS animation
  const planetElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const pathElementsRef = useRef<Record<string, SVGPathElement | null>>({});
  const packetOutElementsRef = useRef<Record<string, SVGCircleElement | null>>({});
  const packetInElementsRef = useRef<Record<string, SVGCircleElement | null>>({});

  // Numerical states kept in refs to avoid React re-renders during gameplay/physics loop
  const anglesRef = useRef<Record<string, number>>({});
  const packetOutProgressRef = useRef<Record<string, number>>({});
  const packetInProgressRef = useRef<Record<string, number>>({});
  const animIdRef = useRef<number | null>(null);

  // Concentric static guideline ring display config
  const tiers = [
    { id: 1, radius: 100, label: "Inner - Security & Core" },
    { id: 2, radius: 155, label: "Middle - E-Commerce & Optimization" },
    { id: 3, radius: 210, label: "Outer - Integrations & Enterprise" },
  ];

  const sectors = [
    { id: "all", label: "All Sectors" },
    { id: "security", label: "Security & Core" },
    { id: "marketing", label: "SEO & Commerce" },
    { id: "workspace", label: "Workspace Suite" },
    { id: "future", label: "Future Expansion" },
  ];

  const planets: Planet[] = [
    {
      id: "brand_guard",
      name: "Brand Guard Secure",
      status: "SECURED & ACTIVE",
      metric: "FIREWALL ONLINE",
      details: [
        "Status: Active Security Firewall",
        "Shield Level: 100% Operational",
        "Threat Defense: Real-time Anti-DDoS",
        "API Security Integrity: Verified"
      ],
      color: "from-emerald-400 to-teal-500",
      orbitDuration: "30s",
      distance: "100px",
      icon: <Shield className="w-3.5 h-3.5" />,
      prompt: "Jarvis, check the current status and firewall logs for Brand Guard Secure.",
      orbitTier: 1,
      category: "security"
    },
    {
      id: "seo_rank",
      name: "Global SEO Rank 1st",
      status: "MONITORED",
      metric: "RANK #1 ACHIEVED",
      details: [
        "SERP Standing: Position #1 Targeted",
        "Google Crawler Loop: Synced",
        "SEO Backlink Health: Excellent",
        "Weekly Traffic Yield: +24% Spiked"
      ],
      color: "from-sky-400 to-blue-500",
      orbitDuration: "45s",
      distance: "155px",
      icon: <Globe className="w-3.5 h-3.5" />,
      prompt: "Jarvis, retrieve the latest Global SEO Rank report and indexing status.",
      orbitTier: 2,
      category: "marketing"
    },
    {
      id: "amazon_sync",
      name: "Amazon API Sync",
      status: "SYNCED (2s AGO)",
      metric: "FEED RATE 2.4k/s",
      details: [
        "Gateway Feed Rate: 2.4k operations/sec",
        "Inventory Synced: 100% Integrity",
        "Order Despatch Queue: Checked",
        "FBA Connection State: Stable"
      ],
      color: "from-purple-400 to-indigo-500",
      orbitDuration: "45s",
      distance: "155px",
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />,
      prompt: "Jarvis, initiate an Amazon API synchronization trace and inventory verify.",
      orbitTier: 2,
      category: "marketing"
    },
    {
      id: "ppc_engine",
      name: "PPC Engine Optimised",
      status: "ACOS 18% (OPTIMAL)",
      metric: "ACoS 18% / ROI 3.8x",
      details: [
        "Core ACoS Load: 18.2% Optimal",
        "Click-Through Rate (CTR): 4.12%",
        "Campaign Yield Ratio: 3.8x ROI",
        "Daily Spend Efficiency: 98%"
      ],
      color: "from-amber-400 to-orange-500",
      orbitDuration: "30s",
      distance: "100px",
      icon: <Activity className="w-3.5 h-3.5" />,
      prompt: "Jarvis, generate a PPC efficiency analysis and ACoS breakdown report.",
      orbitTier: 1,
      category: "marketing"
    },
    {
      id: "google_workspace",
      name: "Google Workspace Hub",
      status: "AUTHENTICATED",
      metric: "CALENDAR & INBOX SYNC",
      details: [
        "Gmail Client Node: Online",
        "Calendar Gateway: 3 Upcoming meetings",
        "Tasks Queue: Synced (Needs action)",
        "Google Meet Linker: Connected"
      ],
      color: "from-red-400 to-rose-500",
      orbitDuration: "60s",
      distance: "210px",
      icon: <Mail className="w-3.5 h-3.5" />,
      prompt: "Jarvis, scan my Google Workspace inbox and compile upcoming events.",
      orbitTier: 3,
      category: "workspace"
    },
    {
      id: "cloud_sql",
      name: "Cloud SQL Registry",
      status: "OPERATIONAL",
      metric: "central_neural_registry.db",
      details: [
        "Database Link: Synced / Connected",
        "Persistent Write Latency: 12ms",
        "Historical logs stored: Synced",
        "Replica Health Status: Healthy"
      ],
      color: "from-teal-400 to-emerald-500",
      orbitDuration: "60s",
      distance: "210px",
      icon: <Database className="w-3.5 h-3.5" />,
      prompt: "Jarvis, fetch the database diagnostic metrics from the Cloud SQL Registry.",
      orbitTier: 3,
      category: "security"
    },
    {
      id: "future_node_1",
      name: "Future Feature Node A",
      status: "READY FOR UPLINK",
      metric: "DYNAMIC SLOTS ACTIVE",
      details: [
        "Dynamic Allocation Range: Orbit Tier 2",
        "Placement: Trigonometric Angle Staggering",
        "State: Simulated Expansion Vector",
        "Auto-scale Algorithm: Dynamic Density Map"
      ],
      color: "from-pink-400 to-purple-500",
      orbitDuration: "45s",
      distance: "155px",
      icon: <Layers className="w-3.5 h-3.5" />,
      prompt: "Jarvis, simulate the integration of dynamic future expansion vectors.",
      orbitTier: 2,
      category: "future"
    },
    {
      id: "future_node_2",
      name: "Future Feature Node B",
      status: "READY FOR UPLINK",
      metric: "SCALABLE MATRIX ACTIVE",
      details: [
        "Dynamic Allocation Range: Orbit Tier 3",
        "Placement: Trigonometric Angle Staggering",
        "State: Simulated Expansion Vector",
        "Auto-scale Algorithm: Dynamic Density Map"
      ],
      color: "from-cyan-400 to-teal-500",
      orbitDuration: "60s",
      distance: "210px",
      icon: <Settings className="w-3.5 h-3.5 animate-spin-slow" />,
      prompt: "Jarvis, test-load a telemetry matrix simulation for dynamic outer expansion nodes.",
      orbitTier: 3,
      category: "future"
    }
  ];

  // Helper for quadratic bezier path plotting
  const getBezierXY = (t: number, sx: number, sy: number, cpX: number, cpY: number, ex: number, ey: number) => {
    return {
      x: Math.pow(1 - t, 2) * sx + 2 * (1 - t) * t * cpX + Math.pow(t, 2) * ex,
      y: Math.pow(1 - t, 2) * sy + 2 * (1 - t) * t * cpY + Math.pow(t, 2) * ey
    };
  };

  // Sync state variables to refs to ensure the physics loop has non-stale scope values
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  useEffect(() => {
    hoveredPlanetRef.current = hoveredPlanet;
  }, [hoveredPlanet]);

  useEffect(() => {
    activeSectorRef.current = activeSector;
  }, [activeSector]);

  // Handle Container Dimensions dynamically via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep center point computed accurately
        setDimensions({ cx: width / 2, cy: height / 2 });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Set up staggered initial planet orbital offsets/angles
  useEffect(() => {
    planets.forEach((p, idx) => {
      if (anglesRef.current[p.id] === undefined) {
        // Distribute planets naturally across the circle initially
        anglesRef.current[p.id] = (idx * Math.PI * 2) / planets.length;
        packetOutProgressRef.current[p.id] = Math.random();
        packetInProgressRef.current[p.id] = Math.random();
      }
    });
  }, [planets]);

  // Main high-performance render loop for direct SVG & CSS transformation changes (60FPS)
  useEffect(() => {
    const step = () => {
      const { cx, cy } = dimensionsRef.current;
      const currentActiveSector = activeSectorRef.current;
      const activeHovered = hoveredPlanetRef.current;

      planets.forEach((planet) => {
        const spec = planetRenderSpecs[planet.id];
        if (!spec) return;

        // Verify if node is active under current sector classification
        const isMuted = currentActiveSector !== "all" && planet.category !== currentActiveSector;

        // Smoothly fade inactive layers
        const planetEl = planetElementsRef.current[planet.id];
        const pathEl = pathElementsRef.current[planet.id];
        const packetOutEl = packetOutElementsRef.current[planet.id];
        const packetInEl = packetInElementsRef.current[planet.id];

        if (planetEl) {
          planetEl.style.opacity = isMuted ? "0.15" : "1";
          planetEl.style.pointerEvents = isMuted ? "none" : "auto";
        }
        if (pathEl) pathEl.style.opacity = isMuted ? "0.05" : "1";
        if (packetOutEl) packetOutEl.style.opacity = isMuted ? "0" : "1";
        if (packetInEl) packetInEl.style.opacity = isMuted ? "0" : "1";

        // Increment orbits only if no node is actively hovered (pause animation on focus)
        const isPaused = activeHovered !== null;
        if (!isPaused && !isMuted) {
          anglesRef.current[planet.id] += spec.speed;
        }

        const angle = anglesRef.current[planet.id] || 0;

        // Responsively auto-scale orbits to always fit within the dashboard safely
        const radius = getOrbitRadius(spec.radius, cx, cy);

        // Circle Coordinates
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);

        // Update Planet Spherical Center coordinate
        if (planetEl) {
          planetEl.style.left = `${px}px`;
          planetEl.style.top = `${py}px`;
        }

        // 90-degree Bezier Arc Control Point math
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const scaleFactor = Math.min(cx, cy) / 360;
        const curveStrength = spec.curveStrength * Math.max(0.48, Math.min(1.0, scaleFactor));
        const cpX = cx + dx / 2 - (dy / dist) * curveStrength;
        const cpY = cy + dy / 2 + (dx / dist) * curveStrength;

        // Draw dynamic Bezier path
        if (pathEl) {
          pathEl.setAttribute("d", `M ${cx} ${cy} Q ${cpX} ${cpY} ${px} ${py}`);
        }

        // Direct stream update of Outgoing telemetry packets (white data)
        if (!isPaused && !isMuted) {
          packetOutProgressRef.current[planet.id] += 0.005;
          if (packetOutProgressRef.current[planet.id] > 1) {
            packetOutProgressRef.current[planet.id] = 0;
          }
        }
        const progOut = packetOutProgressRef.current[planet.id] || 0;
        const outPos = getBezierXY(progOut, cx, cy, cpX, cpY, px, py);
        if (packetOutEl) {
          packetOutEl.setAttribute("cx", outPos.x.toString());
          packetOutEl.setAttribute("cy", outPos.y.toString());
        }

        // Direct stream update of Incoming telemetry packets (color-matched node data)
        if (!isPaused && !isMuted) {
          packetInProgressRef.current[planet.id] -= 0.005;
          if (packetInProgressRef.current[planet.id] < 0) {
            packetInProgressRef.current[planet.id] = 1;
          }
        }
        const progIn = packetInProgressRef.current[planet.id] || 0;
        const inPos = getBezierXY(progIn, cx, cy, cpX, cpY, px, py);
        if (packetInEl) {
          packetInEl.setAttribute("cx", inPos.x.toString());
          packetInEl.setAttribute("cy", inPos.y.toString());
        }
      });

      animIdRef.current = requestAnimationFrame(step);
    };

    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [dimensions.cx, dimensions.cy]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[500px] lg:min-h-[580px] border border-cyan-500/20 bg-black/80 p-6 rounded-2xl relative shadow-2xl backdrop-blur-md select-none overflow-hidden h-full">
      {/* Scanline and Grid overlays inside viewport */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid-overlay z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none scanline z-0"></div>

      {/* Top Header Section */}
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20 border-b border-cyan-500/10 pb-4 shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-orbitron uppercase tracking-widest font-bold">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>Orbital Sector Grid: System Map</span>
        </div>

        {/* Sector Planes Filter buttons */}
        <div className="flex flex-wrap gap-1 border border-cyan-500/15 rounded-xl bg-black/65 p-1">
          {sectors.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSector(sec.id)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono tracking-wider uppercase transition cursor-pointer ${
                activeSector === sec.id 
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25" 
                  : "text-gray-400 hover:text-gray-300 border border-transparent"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Universe Stage Core Area */}
      <div ref={containerRef} className="relative w-full flex-1 flex items-center justify-center z-10 scale-95 sm:scale-100 my-4 min-h-[340px]">
        {/* Curved Data Transfer Lines Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {planets.map((planet) => {
            const spec = planetRenderSpecs[planet.id];
            if (!spec) return null;
            return (
              <g key={`svg-group-${planet.id}`}>
                {/* Flowing Curved Path */}
                <path
                  ref={(el) => { pathElementsRef.current[planet.id] = el; }}
                  className="curved-data-link"
                  style={{ "--planet-color": spec.color } as React.CSSProperties}
                  d=""
                />
                {/* Outgoing data packet (white) */}
                <circle
                  ref={(el) => { packetOutElementsRef.current[planet.id] = el; }}
                  r="3.5"
                  fill="#ffffff"
                  style={{ filter: "drop-shadow(0 0 4px #ffffff)" }}
                  cx="0"
                  cy="0"
                />
                {/* Incoming data packet (color matched) */}
                <circle
                  ref={(el) => { packetInElementsRef.current[planet.id] = el; }}
                  r="3.5"
                  fill={spec.color}
                  style={{ filter: `drop-shadow(0 0 4px ${spec.color})` }}
                  cx="0"
                  cy="0"
                />
              </g>
            );
          })}
        </svg>

        {/* Static guidelines indicating orbits */}
        {planets.map((planet) => {
          const spec = planetRenderSpecs[planet.id];
          if (!spec) return null;
          const currentRadius = getOrbitRadius(spec.radius, dimensions.cx, dimensions.cy);
          const isMuted = activeSector !== "all" && planet.category !== activeSector;
          return (
            <div
              key={`ring-guide-${planet.id}`}
              className="absolute border border-dashed border-cyan-500/10 rounded-full pointer-events-none transition-opacity duration-300"
              style={{
                width: `${currentRadius * 2}px`,
                height: `${currentRadius * 2}px`,
                left: `calc(50% - ${currentRadius}px)`,
                top: `calc(50% - ${currentRadius}px)`,
                opacity: isMuted ? 0.05 : 1,
              }}
            />
          );
        })}

        {/* Centered Realistic Sun Core */}
        <div 
          className="absolute z-20 flex flex-col items-center justify-center cursor-pointer group"
          style={{
            left: `calc(50% - 70px)`,
            top: `calc(50% - 70px)`,
          }}
          onClick={() => onPlanetClick({
            id: "neural_core",
            name: "AI Neural Core",
            status: systemState,
            metric: "STONIC AI ONLINE",
            details: [
              "Subsystem Host: J.A.R.V.I.S.",
              "Cognitive Uplink: Connected",
              "Voice Assistant Status: Operational",
              "Uptime: 100% stable session"
            ],
            color: "from-yellow-400 to-amber-500",
            orbitDuration: "0s",
            distance: "0px",
            icon: <Cpu className="w-6 h-6 text-yellow-400" />,
            prompt: "Jarvis, perform a central self-diagnostic scan on your neural core.",
            orbitTier: 0,
            category: "security"
          })}
        >
          {/* Pulsing Arc Reactor Glows */}
          <div className="absolute w-36 h-36 bg-yellow-500/15 rounded-full blur-2xl animate-pulse group-hover:scale-110 transition duration-300"></div>
          <div className="absolute w-24 h-24 bg-orange-500/10 rounded-full blur-md animate-ping pointer-events-none"></div>

          {/* Fiery Solar Core Globe */}
          <div 
            className="w-[140px] h-[140px] rounded-full shadow-[0_0_50px_#f59e0b,0_0_100px_#ea580c,inset_-10px_-10px_20px_rgba(0,0,0,0.6)] border border-yellow-200/20 flex flex-col items-center justify-center relative hover:scale-105 transition duration-300 select-none overflow-hidden"
            style={{
              background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f59e0b 40%, #ea580c 70%, #7c2d12 100%)"
            }}
          >
            {/* Solar Flare Rotator */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-400/30 to-transparent scale-110 mix-blend-screen opacity-60 animate-spin" style={{ animationDuration: "15s" }}></div>
            
            <Cpu className="w-8 h-8 text-black drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)] animate-pulse" />
            <div className="mt-1 text-center px-1 z-10">
              <span className="text-[10px] font-bold tracking-widest text-white font-orbitron block uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">
                SYSTEM CORE
              </span>
              <span className="text-[7px] font-mono text-yellow-300 uppercase tracking-widest font-bold block drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] leading-none mt-0.5">
                STONIC AI
              </span>
            </div>
          </div>
        </div>

        {/* Staggered Planets Nodes */}
        {planets.map((planet) => {
          const spec = planetRenderSpecs[planet.id];
          if (!spec) return null;
          const isHovered = hoveredPlanet === planet.id;
          const isMuted = activeSector !== "all" && planet.category !== activeSector;

          return (
            <div
              key={`planet-element-${planet.id}`}
              ref={(el) => { planetElementsRef.current[planet.id] = el; }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-30 transition-opacity duration-300`}
              onMouseEnter={() => setHoveredPlanet(planet.id)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => !isMuted && onPlanetClick(planet)}
            >
              {/* Spherical container representing the planet */}
              <div 
                className={`relative flex flex-col items-center justify-center ${spec.cssClass || ""}`}
                style={{ width: `${spec.size}px`, height: `${spec.size}px` }}
              >
                {/* Render Planet with 3D shadow depth style matching user request */}
                <div 
                  className={`w-full h-full rounded-full bg-gradient-to-br ${planet.color} flex items-center justify-center text-black border border-white/20 transition-all duration-300 group-hover:scale-125`}
                  style={{
                    boxShadow: "inset -6px -6px 12px rgba(0,0,0,0.85), inset 2px 2px 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.08)"
                  }}
                >
                  {planet.icon}
                </div>

                {/* Pulse outer ring around sphere only on hover */}
                <div className={`absolute -inset-1.5 rounded-full border border-cyan-400/20 animate-ping pointer-events-none transition-all duration-300 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}></div>

                {/* Planet Label Indicator (Beautifully positioned below the sphere so it doesn't wobble or affect rotation) */}
                <div 
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-1.5 py-0.5 rounded bg-black/95 border text-[8px] font-mono font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                    isHovered 
                      ? "scale-105 opacity-100 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                      : "opacity-80 border-cyan-500/25 text-gray-300"
                  }`}
                >
                  <span>{planet.name}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Telemetry / Status Overlay Panel */}
      <div className="w-full bg-black/85 border border-cyan-500/20 p-3 rounded-xl backdrop-blur-md text-left z-20 min-h-[92px] transition duration-200 shrink-0">
        {hoveredPlanet ? (
          (() => {
            const current = planets.find((p) => p.id === hoveredPlanet);
            if (!current) return null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <div className="text-cyan-400 font-bold text-[11px] uppercase flex items-center gap-1 font-orbitron">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    <span>{current.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-wider">
                    {current.status}
                  </div>
                  <div className="text-[9px] text-cyan-300 mt-1 uppercase font-bold tracking-wider bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 inline-block">
                    {current.metric}
                  </div>
                </div>
                <div className="text-[10px] text-gray-300 space-y-0.5 border-t md:border-t-0 md:border-l border-cyan-500/10 pt-1.5 md:pt-0 md:pl-3">
                  {current.details.map((detail, idx) => (
                    <div key={idx} className="truncate">
                      &gt; {detail}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-2 text-gray-500 font-mono text-[10px]">
            <p className="uppercase text-cyan-400/80 font-bold tracking-widest font-orbitron">Orbital Telemetry Feed Active</p>
            <p className="text-[9px] text-gray-500 mt-1">Hover over any subsystem node to check live metrics. Click to deploy diagnostic trace commands.</p>
          </div>
        )}
      </div>
    </div>
  );
}
