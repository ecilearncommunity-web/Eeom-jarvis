import React, { useState } from "react";
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

interface Planet {
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

export default function NeuralOrbitVisualizer({ onPlanetClick, systemState }: NeuralOrbitVisualizerProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string>("all");

  // Concentric Orbit Tiers configuration
  const tiers = [
    { id: 1, radius: 85, duration: "30s", label: "Inner Tier - Security & Infrastructure" },
    { id: 2, radius: 150, duration: "45s", label: "Middle Tier - E-Commerce & Growth" },
    { id: 3, radius: 215, duration: "60s", label: "Outer Tier - Productivity & Integrations" },
  ];

  // Sectors for high-level classification
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
      distance: "85px",
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
      distance: "150px",
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
      distance: "150px",
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
      distance: "85px",
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
      distance: "215px",
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
      distance: "215px",
      icon: <Database className="w-3.5 h-3.5" />,
      prompt: "Jarvis, fetch the database diagnostic metrics from the Cloud SQL Registry.",
      orbitTier: 3,
      category: "security"
    },
    // Dynamically demonstrating future expansion compatibility:
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
      distance: "150px",
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
      distance: "215px",
      icon: <Settings className="w-3.5 h-3.5 animate-spin-slow" />,
      prompt: "Jarvis, test-load a telemetry matrix simulation for dynamic outer expansion nodes.",
      orbitTier: 3,
      category: "future"
    }
  ];

  // Filter planets based on the active sector plane
  const filteredPlanets = activeSector === "all" 
    ? planets 
    : planets.filter(p => p.category === activeSector);

  return (
    <div className="flex flex-col items-center justify-between min-h-[480px] lg:min-h-[580px] border border-sky-500/15 bg-[#030713]/80 p-6 rounded-2xl relative shadow-2xl backdrop-blur-md select-none overflow-hidden h-full">
      {/* Dynamic Scanline & Grid Overlays inside Core viewport */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid-overlay z-0"></div>
      
      {/* Top Header Controls with Sector Planes Selection */}
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20 border-b border-sky-500/10 pb-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sky-400 text-[10px] font-mono uppercase tracking-widest font-bold">
          <Compass className="w-4 h-4 text-sky-500 animate-spin-slow" />
          <span>Orbital Sector Grid: System Map</span>
        </div>

        {/* Sector Filter Buttons */}
        <div className="flex flex-wrap gap-1 border border-sky-500/15 rounded-xl bg-gray-950/40 p-1">
          {sectors.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSector(sec.id)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono tracking-wider uppercase transition cursor-pointer ${
                activeSector === sec.id 
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/25" 
                  : "text-gray-400 hover:text-gray-300 border border-transparent"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Core Container */}
      <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center z-10 scale-90 sm:scale-100 my-6">
        
        {/* Concentric Orbiting Rings (Static Guides) */}
        {tiers.map((tier) => (
          <div
            key={`ring-${tier.id}`}
            className="absolute border border-dashed border-sky-500/10 rounded-full pointer-events-none"
            style={{
              width: `${tier.radius * 2}px`,
              height: `${tier.radius * 2}px`,
            }}
          />
        ))}

        {/* Central Sun: AI Neural Core */}
        <div 
          className="relative z-20 flex flex-col items-center justify-center cursor-pointer group"
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
          <div className="absolute w-24 h-24 bg-yellow-500/15 rounded-full blur-xl animate-pulse group-hover:scale-110 transition duration-300"></div>
          <div className="absolute w-16 h-16 bg-yellow-500/10 rounded-full blur-md animate-ping pointer-events-none"></div>

          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 p-1 shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-yellow-200 flex items-center justify-center relative hover:scale-105 transition duration-200">
            <Cpu className="w-8 h-8 text-black animate-spin" style={{ animationDuration: "25s" }} />
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] font-bold tracking-widest text-yellow-400 font-mono block uppercase jarvis-heading drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              AI NEURAL CORE
            </span>
            <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wide">
              {systemState}
            </span>
          </div>
        </div>

        {/* Orbiting Planets - Grouped & Staggered on concentric tiers */}
        {tiers.map((tier) => {
          // Find planets mapped to this tier
          const tierPlanets = filteredPlanets.filter((p) => p.orbitTier === tier.id);
          const count = tierPlanets.length;

          if (count === 0) return null;

          return (
            <div
              key={`tier-orbit-rotator-${tier.id}`}
              className="absolute w-full h-full pointer-events-none"
              style={{
                animation: `orbit-spin ${tier.duration} linear infinite`,
                animationPlayState: hoveredPlanet ? "paused" : "running",
              }}
            >
              {tierPlanets.map((planet, index) => {
                const isHovered = hoveredPlanet === planet.id;
                
                // Calculate angular distribution (e.g., 360 deg divided evenly by total nodes in this orbit ring)
                const angleRad = (2 * Math.PI * index) / count;
                const x = Math.cos(angleRad) * tier.radius;
                const y = Math.sin(angleRad) * tier.radius;

                return (
                  <div
                    key={`planet-${planet.id}`}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
                    }}
                    onMouseEnter={() => setHoveredPlanet(planet.id)}
                    onMouseLeave={() => setHoveredPlanet(null)}
                    onClick={() => onPlanetClick(planet)}
                  >
                    {/* Counter-rotation keeps labels and icons perfectly vertical (not slanted) */}
                    <div
                      style={{
                        animation: `orbit-spin ${tier.duration} linear infinite reverse`,
                        animationPlayState: hoveredPlanet ? "paused" : "running",
                      }}
                    >
                      {/* Planet Group Container */}
                      <div className="relative group flex flex-col items-center justify-center">
                        {/* Sphere with animate-ping */}
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${planet.color} shadow-lg flex items-center justify-center text-black border border-white/20 transition-all duration-300 group-hover:scale-125 hover:shadow-[0_0_15px_rgba(56,189,248,0.4)]`}>
                            {planet.icon}
                          </div>
                          {/* Pulse outer ring around sphere only */}
                          <div className={`absolute -inset-1.5 rounded-full border border-sky-400/20 animate-ping pointer-events-none transition-all duration-300 ${
                            isHovered ? "opacity-100" : "opacity-0"
                          }`}></div>
                        </div>

                        {/* Planet Label Indicator */}
                        <div className={`mt-1.5 px-2 py-0.5 rounded bg-gray-950/90 border border-sky-500/20 text-[8px] font-mono font-semibold tracking-wide whitespace-nowrap transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:scale-105 ${
                          isHovered ? "scale-105 opacity-100" : "scale-100"
                        }`}>
                          <span className="text-gray-300">{planet.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Hover Information Overlay Modal / Panel */}
      <div className="w-full bg-gray-950/90 border border-sky-500/15 p-3 rounded-xl backdrop-blur-md text-left z-20 min-h-[92px] transition duration-200 shrink-0">
        {hoveredPlanet ? (
          (() => {
            const current = planets.find((p) => p.id === hoveredPlanet);
            if (!current) return null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <div className="text-sky-300 font-bold text-[11px] uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    <span>{current.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-wider">
                    {current.status}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-wider bg-sky-500/5 px-1.5 py-0.5 rounded border border-sky-500/10 inline-block">
                    {current.metric}
                  </div>
                </div>
                <div className="text-[10px] text-gray-300 space-y-0.5 border-t md:border-t-0 md:border-l border-sky-500/10 pt-1.5 md:pt-0 md:pl-3">
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
            <p className="uppercase text-sky-400/80 font-bold tracking-widest">Orbital Telemetry Feed Ready</p>
            <p className="text-[9px] text-gray-600 mt-1">Hover over any subsystem node to check live metrics. Click to deploy diagnostic trace commands.</p>
          </div>
        )}
      </div>
    </div>
  );
}

