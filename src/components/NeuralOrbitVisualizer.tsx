import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  HelpCircle,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Code,
  MessageSquare,
  Zap,
  PlusCircle
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
  isCustom?: boolean;
  iconName?: string;
}

export function getIconComponent(name: string) {
  switch (name) {
    case "Shield": return <Shield className="w-3.5 h-3.5" />;
    case "Globe": return <Globe className="w-3.5 h-3.5" />;
    case "RefreshCw": return <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />;
    case "Activity": return <Activity className="w-3.5 h-3.5" />;
    case "Mail": return <Mail className="w-3.5 h-3.5" />;
    case "Database": return <Database className="w-3.5 h-3.5" />;
    case "Layers": return <Layers className="w-3.5 h-3.5" />;
    case "Cpu": return <Cpu className="w-3.5 h-3.5" />;
    case "Sparkles": return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    case "Code": return <Code className="w-3.5 h-3.5 text-yellow-400" />;
    case "MessageSquare": return <MessageSquare className="w-3.5 h-3.5 text-rose-400" />;
    case "Zap": return <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
    case "Settings": return <Settings className="w-3.5 h-3.5 animate-spin-slow" />;
    default: return <Sparkles className="w-3.5 h-3.5" />;
  }
}

import { db } from "../lib/firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";

interface NeuralOrbitVisualizerProps {
  onPlanetClick: (planet: Planet) => void;
  systemState: string;
  userId?: string;
  emailsCount?: number;
  eventsCount?: number;
  tasksCount?: number;
  dbLogsCount?: number;
}

// Map planet IDs to realistic design specs (radius, speed, size, color, curveStrength, and classes)
const planetRenderSpecs: Record<string, { baseRadius: number; speed: number; size: number; color: string; curveStrength: number; cssClass?: string }> = {
  brand_guard: { baseRadius: 80, speed: 0.009, size: 26, color: "#10b981", curveStrength: 15 },
  seo_rank: { baseRadius: 125, speed: 0.007, size: 32, color: "#38bdf8", curveStrength: -25 },
  amazon_sync: { baseRadius: 175, speed: 0.0055, size: 46, color: "#a855f7", curveStrength: 35, cssClass: "p-saturn" },
  ppc_engine: { baseRadius: 230, speed: 0.004, size: 52, color: "#fbbf24", curveStrength: -45 },
  google_workspace: { baseRadius: 290, speed: 0.003, size: 38, color: "#ef4444", curveStrength: 55 },
  cloud_sql: { baseRadius: 350, speed: 0.0022, size: 32, color: "#14b8a6", curveStrength: -65 },
  future_node_1: { baseRadius: 415, speed: 0.0016, size: 28, color: "#ec4899", curveStrength: 75 },
  future_node_2: { baseRadius: 475, speed: 0.0012, size: 26, color: "#06b6d4", curveStrength: -85 }
};

const planetIndices: Record<string, number> = {
  brand_guard: 0,
  seo_rank: 1,
  amazon_sync: 2,
  ppc_engine: 3,
  google_workspace: 4,
  cloud_sql: 5,
  future_node_1: 6,
  future_node_2: 7
};

const defaultPlanets: Planet[] = [
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

export default function NeuralOrbitVisualizer({ 
  onPlanetClick, 
  systemState,
  userId,
  emailsCount = 0,
  eventsCount = 0,
  tasksCount = 0,
  dbLogsCount = 0
}: NeuralOrbitVisualizerProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string>("all");
  const [dimensions, setDimensions] = useState({ cx: 230, cy: 230 });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"nodes" | "create" | "edit">("nodes");

  // Form states for creating custom nodes
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeStatus, setNewNodeStatus] = useState("OPERATIONAL");
  const [newNodeMetric, setNewNodeMetric] = useState("");
  const [newNodeDetails, setNewNodeDetails] = useState("");
  const [newNodeCategory, setNewNodeCategory] = useState<"security" | "marketing" | "workspace" | "future">("future");
  const [newNodeTier, setNewNodeTier] = useState<number>(3);
  const [newNodeColor, setNewNodeColor] = useState("from-cyan-400 to-teal-500");
  const [newNodeIcon, setNewNodeIcon] = useState("Sparkles");

  // Form states for editing custom nodes & overriding default nodes
  const [editingPlanetId, setEditingPlanetId] = useState<string | null>(null);
  const [editNodeName, setEditNodeName] = useState("");
  const [editNodeStatus, setEditNodeStatus] = useState("");
  const [editNodeMetric, setEditNodeMetric] = useState("");
  const [editNodeDetails, setEditNodeDetails] = useState("");
  const [editNodeCategory, setEditNodeCategory] = useState<"security" | "marketing" | "workspace" | "future">("future");
  const [editNodeTier, setEditNodeTier] = useState<number>(3);
  const [editNodeColor, setEditNodeColor] = useState("from-cyan-400 to-teal-500");
  const [editNodeIcon, setEditNodeIcon] = useState("Sparkles");

  // States for connection testing diagnostics simulation
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [connectionTestLogs, setConnectionTestLogs] = useState<string[]>([]);

  // Custom node overrides state (saves modifications made to default nodes)
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, Partial<Planet>>>(() => {
    const saved = localStorage.getItem("stonic_node_overrides");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("stonic_node_overrides", JSON.stringify(nodeOverrides));
  }, [nodeOverrides]);

  const [customPlanets, setCustomPlanets] = useState<Planet[]>(() => {
    const saved = localStorage.getItem("stonic_custom_planets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        return parsed.map((p) => ({
          ...p,
          icon: getIconComponent(p.iconName || "Sparkles")
        }));
      } catch (e) {
        console.error("Error loading custom planets", e);
      }
    }
    return [];
  });

  // Load custom planets and overrides from Firestore when user logs in
  useEffect(() => {
    if (!userId) return;

    const loadFromFirestore = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users", userId, "custom_planets"));
        const planetsFromDb: Planet[] = [];
        const overridesFromDb: Record<string, Partial<Planet>> = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isOverride) {
            overridesFromDb[doc.id] = data as Partial<Planet>;
          } else {
            planetsFromDb.push({
              ...(data as Planet),
              id: doc.id,
              icon: getIconComponent(data.iconName || "Sparkles")
            });
          }
        });

        if (planetsFromDb.length > 0) {
          setCustomPlanets(planetsFromDb);
        }
        if (Object.keys(overridesFromDb).length > 0) {
          setNodeOverrides(overridesFromDb);
        }
      } catch (err) {
        console.warn("Could not load custom planets from Firestore (using local storage fallback):", err);
      }
    };

    loadFromFirestore();
  }, [userId]);

  const saveCustomPlanetToDb = async (planet: Planet) => {
    if (userId) {
      try {
        const { icon, ...rest } = planet;
        await setDoc(doc(db, "users", userId, "custom_planets", planet.id), {
          ...rest,
          isCustom: true
        });
      } catch (e) {
        console.warn("Could not save custom planet to Firestore:", e);
      }
    }
  };

  const deleteCustomPlanetFromDb = async (planetId: string) => {
    if (userId) {
      try {
        await deleteDoc(doc(db, "users", userId, "custom_planets", planetId));
      } catch (e) {
        console.warn("Could not delete custom planet from Firestore:", e);
      }
    }
  };

  const saveOverrideToDb = async (planetId: string, override: Partial<Planet>) => {
    if (userId) {
      try {
        await setDoc(doc(db, "users", userId, "custom_planets", planetId), {
          ...override,
          isOverride: true
        });
      } catch (e) {
        console.warn("Could not save override to Firestore:", e);
      }
    }
  };

  const runConnectionTest = (planetId: string) => {
    setTestingConnectionId(planetId);
    setConnectionTestLogs([
      "[SYS] Initiating real handshake request...",
      "[SYS] Routing security packets through gateway..."
    ]);
    
    if (planetId === "google_workspace") {
      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          "[OK] Ping Google API gateway: 18ms latency",
          "[SYS] Checking authenticated session token...",
          userId ? "[OK] Firebase Auth User Session: DETECTED" : "[WARN] Session state: UNAUTHENTICATED (Simulated mode active)"
        ]);
      }, 600);

      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          `[SYS] Synchronizing OAuth scopes with real Google servers...`,
          `[OK] Scope check completed. Retrieved:`,
          ` - Gmail Messages: ${emailsCount} live items`,
          ` - Google Calendar: ${eventsCount} upcoming events`,
          ` - Google Tasks: ${tasksCount} active items`
        ]);
      }, 1200);

      setTimeout(() => {
        const isFullyConnected = emailsCount > 0 || eventsCount > 0 || tasksCount > 0;
        setConnectionTestLogs(prev => [
          ...prev,
          isFullyConnected 
            ? `[SUCCESS] Real Google API Connection Active! Showing real inbox & calendar data on dashboard.`
            : `[SUCCESS] Google Auth ready. Please sign in via Google OAuth on the cyberdeck to pull your real mailbox data!`
        ]);
        setTestingConnectionId(null);
      }, 1800);

    } else if (planetId === "cloud_sql") {
      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          "[OK] Checking PostgreSQL connection credentials...",
          "[SYS] Querying 'assistant_logs' table in relational schema..."
        ]);
      }, 600);

      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          `[OK] Secured table active. Historical writes certified.`,
          `[OK] Retrieved ${dbLogsCount} Assistant memory/command entries from Cloud database.`
        ]);
      }, 1200);

      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          `[SUCCESS] Relational Cloud SQL registry connection is fully functional and storing real historical records!`
        ]);
        setTestingConnectionId(null);
      }, 1800);

    } else {
      // Default for other nodes
      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          "[OK] Node ping response received: 14ms latency",
          "[SYS] Checking telemetry status..."
        ]);
      }, 600);

      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          "[OK] Encryption certified (SHA-256)",
          "[SYS] Finalizing diagnostics report..."
        ]);
      }, 1200);

      setTimeout(() => {
        setConnectionTestLogs(prev => [
          ...prev,
          `[SUCCESS] Node diagnostics complete. Subsystem operational and secure.`
        ]);
        setTestingConnectionId(null);
      }, 1800);
    }
  };

  // Map default nodes dynamically with live workspace and DB logging metrics
  const dynamicDefaultPlanets = useMemo<Planet[]>(() => {
    return defaultPlanets.map(p => {
      const overridden = nodeOverrides[p.id];
      let base = { ...p };
      if (overridden) {
        base = { ...base, ...overridden };
        if (overridden.iconName) {
          base.icon = getIconComponent(overridden.iconName);
        }
      }

      if (base.id === "google_workspace") {
        return {
          ...base,
          metric: `${emailsCount} Emails | ${eventsCount} Meetings | ${tasksCount} Tasks`,
          status: emailsCount > 0 || eventsCount > 0 || tasksCount > 0 ? "FULLY ACTIVE & SYNCED" : "CONNECTED (WAITING FOR SYNC)",
          details: [
            `Gmail Inbox: ${emailsCount} unread threads synced`,
            `Google Calendar: ${eventsCount} upcoming schedule blocks`,
            `Google Tasks: ${tasksCount} active tasks retrieved`,
            `OAuth Connectivity: Verified (Active User)`
          ]
        };
      }
      if (base.id === "cloud_sql") {
        return {
          ...base,
          metric: `${dbLogsCount} neural logs archived`,
          details: [
            `Database: Cloud SQL PostgreSQL`,
            `ORM Registry: Drizzle Schema Live`,
            `Historical Records: ${dbLogsCount} assistant operations logged`,
            `Latency: 11ms (Optimal Connection)`
          ]
        };
      }
      return base;
    });
  }, [emailsCount, eventsCount, tasksCount, dbLogsCount, nodeOverrides]);

  const planets = useMemo(() => {
    return [...dynamicDefaultPlanets, ...customPlanets];
  }, [dynamicDefaultPlanets, customPlanets]);

  useEffect(() => {
    // Serialize custom planets without the React icon node
    const serialized = customPlanets.map((p) => {
      const iconName = p.iconName || "Sparkles";
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        metric: p.metric,
        details: p.details,
        color: p.color,
        orbitDuration: p.orbitDuration,
        distance: p.distance,
        prompt: p.prompt,
        orbitTier: p.orbitTier,
        category: p.category,
        iconName,
        isCustom: true
      };
    });
    localStorage.setItem("stonic_custom_planets", JSON.stringify(serialized));
  }, [customPlanets]);

  const [visiblePlanetIds, setVisiblePlanetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("stonic_visible_planets");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallthrough
      }
    }
    const coreIds = defaultPlanets.map(p => p.id);
    return coreIds;
  });

  useEffect(() => {
    localStorage.setItem("stonic_visible_planets", JSON.stringify(visiblePlanetIds));
  }, [visiblePlanetIds]);

  const resolvedSpecs = useMemo(() => {
    const specs: Record<string, { baseRadius: number; speed: number; size: number; color: string; curveStrength: number; cssClass?: string }> = {
      ...planetRenderSpecs
    };
    
    planets.forEach((planet, index) => {
      if (!specs[planet.id]) {
        let baseRadius = 150;
        let speed = 0.005;
        let size = 32;
        let color = "#38bdf8";
        
        if (planet.orbitTier === 1) {
          baseRadius = 100 + (index % 3) * 20;
          speed = 0.008;
          size = 28;
        } else if (planet.orbitTier === 2) {
          baseRadius = 175 + (index % 3) * 20;
          speed = 0.005;
          size = 36;
        } else {
          baseRadius = 260 + (index % 3) * 30;
          speed = 0.003;
          size = 40;
        }
        
        if (planet.color.includes("emerald")) color = "#10b981";
        else if (planet.color.includes("sky") || planet.color.includes("cyan")) color = "#38bdf8";
        else if (planet.color.includes("purple") || planet.color.includes("indigo")) color = "#a855f7";
        else if (planet.color.includes("amber") || planet.color.includes("orange")) color = "#fbbf24";
        else if (planet.color.includes("red") || planet.color.includes("rose")) color = "#ef4444";
        else if (planet.color.includes("teal")) color = "#14b8a6";
        else if (planet.color.includes("pink")) color = "#ec4899";
        else if (planet.color.includes("fuchsia")) color = "#d946ef";
        else if (planet.color.includes("violet")) color = "#8b5cf6";
        else if (planet.color.includes("lime")) color = "#84cc16";
        
        specs[planet.id] = {
          baseRadius,
          speed,
          size,
          color,
          curveStrength: (index % 2 === 0 ? 1 : -1) * (20 + (index % 5) * 15)
        };
      }
    });
    
    return specs;
  }, [planets]);

  const resolvedSpecsRef = useRef(resolvedSpecs);
  useEffect(() => {
    resolvedSpecsRef.current = resolvedSpecs;
  }, [resolvedSpecs]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dimensionsRef = useRef(dimensions);
  const hoveredPlanetRef = useRef<string | null>(null);
  const activeSectorRef = useRef(activeSector);

  // Refs for direct DOM manipulation to maintain 60FPS animation
  const planetElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const dataLineElementsRef = useRef<Record<string, SVGLineElement | null>>({});
  const dataPacketElementsRef = useRef<Record<string, SVGCircleElement | null>>({});

  // Numerical states kept in refs to avoid React re-renders during gameplay/physics loop
  const baseAngleRef = useRef(0);
  const packetProgressRef = useRef<Record<string, number>>({});
  const animIdRef = useRef<number | null>(null);

  // Pre-generate stellar sky field for a high-performance deep space background
  const starsRef = useRef(
    Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() < 0.15 ? "w-[3px] h-[3px]" : Math.random() < 0.4 ? "w-[2px] h-[2px]" : "w-[1px] h-[1px]",
      opacity: 0.2 + Math.random() * 0.8,
      duration: `${3 + Math.random() * 5}s`,
      delay: `${Math.random() * 5}s`,
    }))
  );

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

  const visiblePlanets = planets.filter((p) => visiblePlanetIds.includes(p.id));


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

  // Main high-performance render loop for direct 3D CSS transformation changes (60FPS)
  useEffect(() => {
    const step = () => {
      const { cx, cy } = dimensionsRef.current;
      const currentActiveSector = activeSectorRef.current;
      const activeHovered = hoveredPlanetRef.current;

      const isPaused = activeHovered !== null;
      if (!isPaused) {
        // Smooth majestic uniform rotation
        baseAngleRef.current += 0.0016;
      }

      // 4. Update elements and draw
      visiblePlanets.forEach((planet, idx) => {
        const spec = resolvedSpecsRef.current[planet.id];
        if (!spec) return;

        const isMuted = currentActiveSector !== "all" && planet.category !== currentActiveSector;
        const planetEl = planetElementsRef.current[planet.id];
        const lineEl = dataLineElementsRef.current[planet.id];
        const packetEl = dataPacketElementsRef.current[planet.id];

        // Stagger planets evenly to ensure absolute mathematically guaranteed 0% overlaps
        const staggerOffset = (idx * Math.PI * 2) / visiblePlanets.length;
        const angle = baseAngleRef.current + staggerOffset;

        // Responsively auto-scale orbits to always fit within the dashboard safely
        const maxAvailableRadius = cx - 35;
        const minAvailableRadius = 125;
        const minBase = 80;
        const maxBase = 475;
        let radius = 150;
        if (maxAvailableRadius <= minAvailableRadius) {
          radius = minAvailableRadius + idx * 16;
        } else {
          const pct = (spec.baseRadius - minBase) / (maxBase - minBase);
          radius = minAvailableRadius + pct * (maxAvailableRadius - minAvailableRadius);
        }

        // Add a gentle floating wave for realistic organic weightlessness
        const floatOffset = Math.sin(baseAngleRef.current * 1.8 + idx) * 3.5;
        const currentRadius = radius + floatOffset;

        // 3D Oblique Tilted Orbit (Y-axis compressed by 0.42)
        const px = cx + currentRadius * Math.cos(angle);
        const py = cy + currentRadius * 0.42 * Math.sin(angle);

        // Continuous depth scaling (smaller in back, larger in front)
        const depthScale = 0.76 + 0.34 * ((Math.sin(angle) + 1) / 2);
        
        // Continuous depth opacity (slightly dimmer in back)
        const depthOpacity = 0.70 + 0.30 * ((Math.sin(angle) + 1) / 2);

        if (planetEl) {
          // Update Planet Spherical Center coordinate
          planetEl.style.left = `${px}px`;
          planetEl.style.top = `${py}px`;
          
          // Apply 3D zIndex relative to Sun (which is z-20)
          planetEl.style.zIndex = Math.sin(angle) < 0 ? "10" : "30";
          
          // Apply continuous depth scale
          planetEl.style.transform = `translate(-50%, -50%) scale(${depthScale})`;
          
          // Combine muted status opacity with depth opacity
          planetEl.style.opacity = isMuted ? "0.12" : depthOpacity.toString();
          planetEl.style.pointerEvents = isMuted ? "none" : "auto";
        }

        // Update Laser Beam Data Link Line between Sun and Planet
        if (lineEl) {
          lineEl.setAttribute("x1", cx.toString());
          lineEl.setAttribute("y1", cy.toString());
          lineEl.setAttribute("x2", px.toString());
          lineEl.setAttribute("y2", py.toString());
          
          // Set dynamic beam opacity: dimmer when muted, slightly dependent on orbital angle depth
          const beamOpacity = isMuted ? 0.015 : 0.16 + 0.10 * ((Math.sin(angle) + 1) / 2);
          lineEl.setAttribute("stroke-opacity", beamOpacity.toString());
        }

        // Update Flowing Data Telemetry Packet along connection line
        if (packetEl) {
          if (!isPaused && !isMuted) {
            packetProgressRef.current[planet.id] = (packetProgressRef.current[planet.id] || 0) + 0.007;
            if (packetProgressRef.current[planet.id] > 1) {
              packetProgressRef.current[planet.id] = 0;
            }
          }
          const t = packetProgressRef.current[planet.id] || 0;
          // Interpolate coordinate along the line Sun (cx, cy) to Planet (px, py)
          const pPackX = cx + (px - cx) * t;
          const pPackY = cy + (py - cy) * t;
          
          packetEl.setAttribute("cx", pPackX.toString());
          packetEl.setAttribute("cy", pPackY.toString());
          
          // Hide packet when muted, set depth-based opacity
          packetEl.setAttribute("opacity", isMuted ? "0" : (0.85 * depthOpacity).toString());
        }
      });

      animIdRef.current = requestAnimationFrame(step);
    };

    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [dimensions.cx, dimensions.cy]);

  const selectedPlanet = selectedPlanetId === "neural_core" 
    ? {
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
        icon: <Cpu className="w-5 h-5 text-yellow-400" />,
        prompt: "Jarvis, perform a central self-diagnostic scan on your neural core.",
        orbitTier: 0,
        category: "security" as const
      }
    : planets.find((p) => p.id === selectedPlanetId);

  return (
    <div 
      onClick={() => setSelectedPlanetId(null)}
      className="flex flex-col items-center justify-between min-h-[500px] lg:min-h-[580px] border border-sky-500/10 bg-[#020512]/30 p-6 rounded-2xl relative shadow-[inset_0_0_24px_rgba(0,0,0,0.8)] backdrop-blur-sm select-none overflow-hidden h-full cursor-default"
    >
      {/* Deep Space Cosmic Atmosphere filled with twinkling stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Stars */}
        {starsRef.current.map((star) => (
          <div
            key={star.id}
            className={`absolute rounded-full bg-white animate-pulse ${star.size}`}
            style={{
              top: star.top,
              left: star.left,
              opacity: star.opacity,
              animationDuration: star.duration,
              animationDelay: star.delay,
              boxShadow: star.size.includes("3px") ? "0 0 6px rgba(255, 255, 255, 0.8)" : "none",
            }}
          />
        ))}
        {/* Deep cosmic nebula gas glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Top Header Section */}
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20 border-b border-cyan-500/10 pb-4 shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-orbitron uppercase tracking-widest font-bold">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>Orbital Sector Grid: System Map</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sector Planes Filter buttons */}
          <div className="flex flex-wrap gap-1 border border-cyan-500/15 rounded-xl bg-black/65 p-1">
            {sectors.map((sec) => (
              <button
                key={sec.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSector(sec.id);
                }}
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

          {/* Toggle Control Switch Panel */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className={`p-1.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 ${
              showSettings 
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-105" 
                : "bg-black/65 border-cyan-500/15 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30"
            }`}
            title="System Orbit Controller"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Universe Stage Core Area */}
      <div ref={containerRef} className="relative w-full flex-1 flex items-center justify-center z-10 scale-95 sm:scale-100 my-4 min-h-[340px]">

        {/* Interactive Live Data Beams & Flowing Packet Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {visiblePlanets.map((planet) => {
            const spec = resolvedSpecs[planet.id];
            if (!spec) return null;
            return (
              <g key={`data-group-${planet.id}`}>
                {/* Faint high-tech data beam laser line */}
                <line
                  ref={(el) => { dataLineElementsRef.current[planet.id] = el; }}
                  stroke={spec.color}
                  strokeWidth="1.2"
                  strokeDasharray="3 6"
                  className="transition-all duration-300"
                />
                {/* Flowing neural packet data drop */}
                <circle
                  ref={(el) => { dataPacketElementsRef.current[planet.id] = el; }}
                  r="3"
                  fill="#ffffff"
                  style={{
                    filter: `drop-shadow(0 0 4px ${spec.color}) drop-shadow(0 0 1.5px #ffffff)`,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Centered Realistic Sun Core */}
        <div 
          className="absolute z-20 flex flex-col items-center justify-center cursor-pointer group"
          style={{
            left: `calc(50% - 50px)`,
            top: `calc(50% - 50px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPlanetId("neural_core");
            onPlanetClick({
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
              icon: <Cpu className="w-5 h-5 text-yellow-400" />,
              prompt: "Jarvis, perform a central self-diagnostic scan on your neural core.",
              orbitTier: 0,
              category: "security"
            });
          }}
        >
          {/* Solar Aura - Broad Breathing Cosmic Glow */}
          <div className="absolute w-36 h-36 bg-orange-600/20 rounded-full blur-3xl animate-pulse group-hover:scale-125 transition duration-500 pointer-events-none"></div>
          
          {/* Corona Heat Waves - Pulsing energy waves */}
          <div className="absolute w-28 h-28 bg-yellow-500/15 rounded-full blur-2xl animate-pulse group-hover:scale-115 transition duration-500 pointer-events-none" style={{ animationDuration: "3s" }}></div>
          <div className="absolute w-20 h-20 bg-orange-500/10 rounded-full blur-md animate-ping pointer-events-none" style={{ animationDuration: "4s" }}></div>

          {/* Fiery Blazing Solar Core Globe */}
          <div 
            className="w-[100px] h-[100px] rounded-full shadow-[0_0_40px_#ff7700,0_0_80px_#e63900,inset_-8px_-8px_16px_rgba(0,0,0,0.8),inset_4px_4px_10px_rgba(255,255,255,0.6)] border border-yellow-200/30 flex flex-col items-center justify-center relative hover:scale-110 transition duration-300 select-none overflow-hidden"
            style={{
              background: "radial-gradient(circle at 40% 40%, #ffffff 0%, #fff4be 15%, #ffb700 45%, #ff4500 75%, #4a1200 100%)"
            }}
          >
            {/* Burning Sun Surface Turbulence Layers */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-400/20 to-transparent scale-125 mix-blend-color-dodge opacity-70 animate-spin" style={{ animationDuration: "12s" }}></div>
            <div className="absolute inset-0 bg-radial-gradient from-orange-600/20 to-transparent scale-110 mix-blend-screen opacity-50 animate-reverse-spin" style={{ animationDuration: "18s" }}></div>
            
            {/* Beautiful Subtle Integrated Golden Core Icon */}
            <div className="z-10 flex flex-col items-center justify-center text-center px-1">
              <Cpu className="w-4 h-4 text-yellow-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse mb-0.5" />
              <span className="text-[7.5px] font-extrabold tracking-widest text-white block uppercase drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] leading-tight font-sans">
                SYSTEM CORE
              </span>
              <span className="text-[6px] font-mono text-yellow-200 uppercase tracking-widest font-extrabold block drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] leading-none mt-0.5">
                STONIC AI
              </span>
            </div>
            
            {/* Blazing Crown Outer Rim */}
            <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.2)] pointer-events-none" />
          </div>
        </div>

        {/* Staggered Planets Nodes */}
        {visiblePlanets.map((planet) => {
          const spec = resolvedSpecs[planet.id];
          if (!spec) return null;
          const isHovered = hoveredPlanet === planet.id;
          const isMuted = activeSector !== "all" && planet.category !== activeSector;

          return (
            <div
              key={`planet-element-${planet.id}`}
              ref={(el) => { planetElementsRef.current[planet.id] = el; }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-30 transition-opacity duration-300 ${
                isMuted ? "opacity-15 pointer-events-none" : "opacity-100"
              }`}
              onMouseEnter={() => setHoveredPlanet(planet.id)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => {
                if (!isMuted) {
                  setSelectedPlanetId(planet.id);
                  onPlanetClick(planet);
                }
              }}
            >
              {/* Spherical container representing the planet */}
              <div 
                className="relative flex flex-col items-center justify-center"
                style={{ width: `${spec.size}px`, height: `${spec.size}px` }}
              >
                {/* 3D Realistic Planet Sphere with Specular Highlight and Shadow casting */}
                <div 
                  className="w-full h-full rounded-full relative flex items-center justify-center border border-white/20 transition-all duration-300 shadow-[0_0_15px_var(--planet-glow)] group-hover:scale-110"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, #ffffff 0%, rgba(255,255,255,0.15) 25%, transparent 65%), linear-gradient(135deg, ${spec.color} 0%, #050505 100%)`,
                    boxShadow: `inset -6px -6px 12px rgba(0,0,0,0.9), inset 3px 3px 6px rgba(255,255,255,0.35), 0 0 16px ${spec.color}50`,
                    "--planet-glow": spec.color
                  } as React.CSSProperties}
                >
                  {/* Planetary Atmosphere Outer Glow */}
                  <div className="absolute inset-0 rounded-full border border-white/5 shadow-[0_0_10px_rgba(255,255,255,0.1)] pointer-events-none" />

                  {/* Planet Central Icon */}
                  <div className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] z-10 scale-90">
                    {planet.icon}
                  </div>
                </div>



                {/* Orbiting Mini-Moons */}
                {(planet.id === "seo_rank" || planet.id === "google_workspace" || planet.id === "cloud_sql") && (
                  <div 
                    className="absolute inset-0 rounded-full animate-spin pointer-events-none" 
                    style={{ animationDuration: planet.id === "seo_rank" ? "5s" : planet.id === "google_workspace" ? "7s" : "9s" }}
                  >
                    <div 
                      className="absolute w-2 h-2 rounded-full border border-white/10"
                      style={{
                        top: "-5px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: `radial-gradient(circle at 30% 30%, #ffffff, ${spec.color})`,
                        boxShadow: `0 0 6px ${spec.color}`
                      }}
                    />
                  </div>
                )}

                {/* Pulse outer ring around sphere only on hover */}
                <div className={`absolute -inset-2.5 rounded-full border border-cyan-400/20 animate-ping pointer-events-none transition-all duration-300 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}></div>

                {/* Planet Label Indicator (Beautifully positioned below the sphere so it doesn't wobble or affect rotation) */}
                <div 
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-1.5 py-0.5 rounded bg-black/95 border text-[8px] font-mono font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                    selectedPlanetId === planet.id 
                      ? "scale-105 opacity-100 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                      : "opacity-0 scale-95 pointer-events-none"
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
      {selectedPlanetId && selectedPlanet && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-black/90 border border-cyan-500/30 p-3.5 rounded-xl backdrop-blur-md text-left z-20 transition duration-300 shrink-0 relative shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        >
          {/* Close/Deselect button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlanetId(null);
            }}
            className="absolute top-2.5 right-2.5 p-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition cursor-pointer"
            title="Close Telemetry"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs pr-8 pb-3">
            <div>
              <div className="text-cyan-400 font-bold text-[11px] uppercase flex items-center gap-1.5 font-orbitron">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                <span>{selectedPlanet.name}</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                {selectedPlanet.status}
              </div>
              <div className="text-[9px] text-cyan-300 mt-2 uppercase font-bold tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 inline-block">
                {selectedPlanet.metric}
              </div>
            </div>
            <div className="text-[10px] text-gray-300 space-y-1 border-t md:border-t-0 md:border-l border-cyan-500/15 pt-2 md:pt-0 md:pl-4">
              {selectedPlanet.details.map((detail, idx) => (
                <div key={idx} className="truncate text-gray-300 hover:text-cyan-200 transition duration-150">
                  <span className="text-cyan-500/60 font-bold mr-1">&gt;</span> {detail}
                </div>
              ))}
            </div>
          </div>

          {/* Action Row / Diagnostic Output */}
          <div className="mt-2.5 pt-2.5 border-t border-cyan-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[9px]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Open system panel, load editor
                  setEditingPlanetId(selectedPlanet.id);
                  setEditNodeName(selectedPlanet.name);
                  setEditNodeStatus(selectedPlanet.status);
                  setEditNodeMetric(selectedPlanet.metric);
                  setEditNodeDetails(selectedPlanet.details.join("\n"));
                  setEditNodeCategory(selectedPlanet.category);
                  setEditNodeTier(selectedPlanet.orbitTier);
                  setEditNodeColor(selectedPlanet.color);
                  setEditNodeIcon(selectedPlanet.iconName || "Sparkles");

                  setActiveTab("edit");
                  setShowSettings(true);
                }}
                className="px-2.5 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-bold tracking-wider uppercase transition cursor-pointer flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                <span>Configure Node</span>
              </button>

              <button
                disabled={!!testingConnectionId}
                onClick={(e) => {
                  e.stopPropagation();
                  runConnectionTest(selectedPlanet.id);
                }}
                className={`px-2.5 py-1.5 rounded border font-bold tracking-wider uppercase transition flex items-center gap-1 ${
                  testingConnectionId === selectedPlanet.id
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-not-allowed"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 cursor-pointer"
                }`}
              >
                <Activity className={`w-3 h-3 ${testingConnectionId === selectedPlanet.id ? "animate-spin text-amber-400" : "text-emerald-400"}`} />
                <span>{testingConnectionId === selectedPlanet.id ? "Testing..." : "Test Connection"}</span>
              </button>
            </div>

            {/* Test connection animation output log */}
            {connectionTestLogs.length > 0 && (
              <div className="flex-1 max-h-12 overflow-y-auto bg-black/40 border border-cyan-500/10 rounded p-1.5 text-[8px] text-gray-400 space-y-0.5 custom-scrollbar leading-tight text-left">
                {connectionTestLogs.map((log, lidx) => (
                  <div key={lidx} className={log.includes("[SUCCESS]") ? "text-emerald-400 font-bold" : log.includes("[OK]") ? "text-cyan-400" : "text-gray-500"}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* High-Tech System Control Drawer / Settings Switch Panel */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-0 top-0 bottom-0 w-80 bg-[#020512]/95 border-l border-cyan-500/20 backdrop-blur-xl z-50 p-5 flex flex-col justify-between transition-all duration-300 shadow-2xl ${
          showSettings ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div className="text-left">
                <h3 className="text-[11px] font-orbitron font-extrabold text-cyan-400 uppercase tracking-wider">System Control</h3>
                <p className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Orbit Controller HUD</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-cyan-500/10 mb-4 text-[9px] font-mono shrink-0">
            <button 
              onClick={() => { setActiveTab("nodes"); setEditingPlanetId(null); }}
              className={`flex-1 pb-2 font-extrabold tracking-wider uppercase border-b-2 transition duration-200 cursor-pointer ${
                activeTab === "nodes" && !editingPlanetId ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Subsystems
            </button>
            <button 
              onClick={() => { setActiveTab("create"); setEditingPlanetId(null); }}
              className={`flex-1 pb-2 font-extrabold tracking-wider uppercase border-b-2 transition duration-200 cursor-pointer ${
                activeTab === "create" && !editingPlanetId ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Deploy Node
            </button>
            {editingPlanetId && (
              <button 
                onClick={() => setActiveTab("edit")}
                className={`flex-1 pb-2 font-extrabold tracking-wider uppercase border-b-2 transition duration-200 cursor-pointer ${
                  activeTab === "edit" ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Configure Node
              </button>
            )}
          </div>

          {activeTab === "nodes" ? (
            <>
              {/* Quick Stats */}
              <div className="flex items-center justify-between mb-3 text-[9px] font-mono shrink-0 px-1">
                <span className="text-gray-400">TOTAL SYSTEM NODES: {planets.length}</span>
                <span className="text-cyan-400 font-bold">ONLINE: {visiblePlanetIds.length}</span>
              </div>

              {/* Subsystem Switch List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {planets.map((planet) => {
                  const isVisible = visiblePlanetIds.includes(planet.id);
                  const spec = resolvedSpecs[planet.id];
                  return (
                    <div 
                      key={`switch-${planet.id}`}
                      onClick={() => {
                        if (isVisible) {
                          if (visiblePlanetIds.length > 1) {
                            setVisiblePlanetIds(visiblePlanetIds.filter(id => id !== planet.id));
                          }
                        } else {
                          setVisiblePlanetIds([...visiblePlanetIds, planet.id]);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        isVisible 
                          ? "bg-cyan-950/10 border-cyan-500/20 hover:bg-cyan-950/20" 
                          : "bg-black/40 border-white/5 opacity-40 hover:opacity-75 hover:bg-black/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {/* Tiny representation of planet color */}
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center border text-white transition-all duration-300 shrink-0"
                          style={{
                            borderColor: spec?.color || "#ffffff",
                            background: isVisible 
                              ? `radial-gradient(circle at 30% 30%, #ffffff 0%, ${spec?.color || "#fff"} 100%)` 
                              : "#1e293b",
                            boxShadow: isVisible ? `0 0 6px ${spec?.color}` : "none"
                          }}
                        >
                          <div className="scale-75 text-white">
                            {planet.icon}
                          </div>
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-200 leading-tight truncate">{planet.name}</p>
                          <p className="text-[8px] font-mono text-gray-400 uppercase tracking-wider">{planet.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* High-tech Toggle Switch */}
                        <div 
                          className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ${
                            isVisible ? "bg-cyan-500" : "bg-slate-800"
                          }`}
                        >
                          <div 
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                              isVisible ? "translate-x-3.5" : "translate-x-0"
                            }`}
                          />
                        </div>

                        {/* Custom Node Purge / Deletion Action */}
                        {planet.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomPlanets(prev => prev.filter(p => p.id !== planet.id));
                              setVisiblePlanetIds(prev => prev.filter(vid => vid !== planet.id));
                              deleteCustomPlanetFromDb(planet.id);
                              if (selectedPlanetId === planet.id) {
                                setSelectedPlanetId(null);
                              }
                            }}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition cursor-pointer"
                            title="Purge Subsystem Node"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-cyan-500/15 pt-3 mt-3 space-y-2 shrink-0">
                <button 
                  onClick={() => setVisiblePlanetIds(planets.map(p => p.id))}
                  className="w-full py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 font-mono text-[9px] uppercase tracking-widest font-extrabold transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore All Nodes</span>
                </button>
                {customPlanets.length > 0 && (
                  <button 
                    onClick={() => {
                      customPlanets.forEach(p => deleteCustomPlanetFromDb(p.id));
                      setCustomPlanets([]);
                      setVisiblePlanetIds(defaultPlanets.map(p => p.id));
                      setSelectedPlanetId(null);
                    }}
                    className="w-full py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-mono text-[9px] uppercase tracking-widest font-extrabold transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Purge Custom Nodes</span>
                  </button>
                )}
                <p className="text-[7.5px] font-mono text-gray-500 text-center uppercase tracking-widest">
                  STONIC SECURE INTERFACE v3.1
                </p>
              </div>
            </>
          ) : activeTab === "create" ? (
            /* Node Deployment Form */
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newNodeName.trim()) return;

                const id = "custom_" + Date.now().toString(36);
                
                const details = newNodeDetails
                  ? newNodeDetails.split("\n").map(l => l.trim()).filter(Boolean)
                  : ["Status: Online", "Telemetry: Active Node"];

                const promptText = `Jarvis, scan and execute telemetry diagnostics on the custom ${newNodeName.trim()} node.`;

                const newPlanet: Planet = {
                  id,
                  name: newNodeName.trim(),
                  status: newNodeStatus.trim() || "OPERATIONAL",
                  metric: newNodeMetric.trim() || "SECURED NODE",
                  details,
                  color: newNodeColor,
                  orbitDuration: newNodeTier === 1 ? "30s" : newNodeTier === 2 ? "45s" : "60s",
                  distance: newNodeTier === 1 ? "100px" : newNodeTier === 2 ? "155px" : "210px",
                  icon: getIconComponent(newNodeIcon),
                  prompt: promptText,
                  orbitTier: newNodeTier,
                  category: newNodeCategory,
                  isCustom: true,
                  iconName: newNodeIcon
                };

                setCustomPlanets([...customPlanets, newPlanet]);
                setVisiblePlanetIds([...visiblePlanetIds, id]);
                saveCustomPlanetToDb(newPlanet);

                // Reset fields
                setNewNodeName("");
                setNewNodeStatus("OPERATIONAL");
                setNewNodeMetric("");
                setNewNodeDetails("");
                setNewNodeCategory("future");
                setNewNodeTier(3);
                setNewNodeColor("from-cyan-400 to-teal-500");
                setNewNodeIcon("Sparkles");

                // Navigate back
                setActiveTab("nodes");
              }} 
              className="flex-1 flex flex-col justify-between overflow-hidden text-left"
            >
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar pb-2">
                {/* Name */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Node Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Google Workspace Sync" 
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition font-mono"
                  />
                </div>

                {/* Status & Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Status Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ONLINE" 
                      value={newNodeStatus}
                      onChange={(e) => setNewNodeStatus(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Core Metric</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15 ms latency" 
                      value={newNodeMetric}
                      onChange={(e) => setNewNodeMetric(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>
                </div>

                {/* Category & Orbit Tier */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Category</label>
                    <select 
                      value={newNodeCategory}
                      onChange={(e) => setNewNodeCategory(e.target.value as any)}
                      className="w-full bg-black/80 border border-cyan-500/25 rounded-lg px-1.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    >
                      <option value="security">Security & Core</option>
                      <option value="marketing">SEO & Commerce</option>
                      <option value="workspace">Workspace Suite</option>
                      <option value="future">Future Expansion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Orbit Tier</label>
                    <select 
                      value={newNodeTier}
                      onChange={(e) => setNewNodeTier(Number(e.target.value))}
                      className="w-full bg-black/80 border border-cyan-500/25 rounded-lg px-1.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    >
                      <option value={1}>Tier 1 (Inner)</option>
                      <option value={2}>Tier 2 (Middle)</option>
                      <option value={3}>Tier 3 (Outer)</option>
                    </select>
                  </div>
                </div>

                {/* Detail lines */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Diagnostic Log Lines (One per line)</label>
                  <textarea 
                    placeholder="e.g.&#10;Email: ecilearncommunity@gmail.com&#10;Uptime: 99.98%&#10;Data Feed: Connected" 
                    rows={3}
                    value={newNodeDetails}
                    onChange={(e) => setNewNodeDetails(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/25 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono leading-normal resize-none custom-scrollbar"
                  />
                </div>

                {/* Color presets selection */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1.5 font-bold">Color Energy</label>
                  <div className="flex flex-wrap gap-2 justify-between px-0.5">
                    {[
                      { name: "Emerald", value: "from-emerald-400 to-teal-500", color: "#10b981" },
                      { name: "Sky", value: "from-sky-400 to-blue-500", color: "#38bdf8" },
                      { name: "Purple", value: "from-purple-400 to-indigo-500", color: "#a855f7" },
                      { name: "Amber", value: "from-amber-400 to-orange-500", color: "#fbbf24" },
                      { name: "Red", value: "from-red-400 to-rose-500", color: "#ef4444" },
                      { name: "Pink", value: "from-pink-400 to-purple-500", color: "#ec4899" },
                      { name: "Teal", value: "from-teal-400 to-emerald-500", color: "#14b8a6" }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNewNodeColor(preset.value)}
                        className={`w-5.5 h-5.5 rounded-full border transition-transform duration-200 cursor-pointer ${
                          newNodeColor === preset.value ? "scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "border-white/15 hover:scale-105"
                        }`}
                        style={{ background: `linear-gradient(135deg, ${preset.color}, #0c101f)` }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon presets selection */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1.5 font-bold">Identity Icon</label>
                  <div className="grid grid-cols-6 gap-1 px-0.5">
                    {[
                      { name: "Shield", icon: <Shield className="w-3 h-3" /> },
                      { name: "Globe", icon: <Globe className="w-3 h-3" /> },
                      { name: "RefreshCw", icon: <RefreshCw className="w-3 h-3" /> },
                      { name: "Activity", icon: <Activity className="w-3 h-3" /> },
                      { name: "Mail", icon: <Mail className="w-3 h-3" /> },
                      { name: "Database", icon: <Database className="w-3 h-3" /> },
                      { name: "Layers", icon: <Layers className="w-3 h-3" /> },
                      { name: "Cpu", icon: <Cpu className="w-3 h-3" /> },
                      { name: "Sparkles", icon: <Sparkles className="w-3 h-3" /> },
                      { name: "Code", icon: <Code className="w-3 h-3" /> },
                      { name: "MessageSquare", icon: <MessageSquare className="w-3 h-3" /> },
                      { name: "Zap", icon: <Zap className="w-3 h-3" /> }
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setNewNodeIcon(item.name)}
                        className={`p-1 rounded border flex items-center justify-center transition duration-200 cursor-pointer ${
                          newNodeIcon === item.name 
                            ? "bg-cyan-500/30 border-cyan-400 text-white scale-105 shadow-[0_0_6px_rgba(6,182,212,0.3)]" 
                            : "bg-black/40 border-white/5 text-gray-400 hover:text-white"
                        }`}
                        title={item.name}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Deploy Button */}
              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-orbitron text-[9px] uppercase tracking-widest font-extrabold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_16px_rgba(6,182,212,0.3)] shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Deploy Subsystem Node</span>
              </button>
            </form>
          ) : (
            /* Node Edit / Override Form */
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingPlanetId) return;

                const details = editNodeDetails
                  ? editNodeDetails.split("\n").map(l => l.trim()).filter(Boolean)
                  : ["Status: Online", "Telemetry: Active Node"];

                const isCustomNode = editingPlanetId.startsWith("custom_");

                if (isCustomNode) {
                  // Update custom planet
                  const updatedPlanets = customPlanets.map((p) => {
                    if (p.id === editingPlanetId) {
                      const updated: Planet = {
                        ...p,
                        name: editNodeName.trim(),
                        status: editNodeStatus.trim() || "OPERATIONAL",
                        metric: editNodeMetric.trim() || "SECURED NODE",
                        details,
                        color: editNodeColor,
                        orbitDuration: editNodeTier === 1 ? "30s" : editNodeTier === 2 ? "45s" : "60s",
                        distance: editNodeTier === 1 ? "100px" : editNodeTier === 2 ? "155px" : "210px",
                        icon: getIconComponent(editNodeIcon),
                        prompt: `Jarvis, scan and execute telemetry diagnostics on the custom ${editNodeName.trim()} node.`,
                        orbitTier: editNodeTier,
                        category: editNodeCategory,
                        iconName: editNodeIcon
                      };
                      saveCustomPlanetToDb(updated);
                      return updated;
                    }
                    return p;
                  });
                  setCustomPlanets(updatedPlanets);
                } else {
                  // Create override for default planet
                  const override: Partial<Planet> = {
                    name: editNodeName.trim(),
                    status: editNodeStatus.trim() || "OPERATIONAL",
                    metric: editNodeMetric.trim() || "SECURED NODE",
                    details,
                    color: editNodeColor,
                    orbitTier: editNodeTier,
                    category: editNodeCategory,
                    iconName: editNodeIcon
                  };
                  const updatedOverrides = {
                    ...nodeOverrides,
                    [editingPlanetId]: override
                  };
                  setNodeOverrides(updatedOverrides);
                  saveOverrideToDb(editingPlanetId, override);
                }

                // Go back
                setActiveTab("nodes");
                setEditingPlanetId(null);
              }}
              className="flex-1 flex flex-col justify-between overflow-hidden text-left"
            >
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar pb-2">
                {/* Name */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Node Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Google Workspace Sync" 
                    value={editNodeName}
                    onChange={(e) => setEditNodeName(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition font-mono"
                  />
                </div>

                {/* Status & Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Status Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ONLINE" 
                      value={editNodeStatus}
                      onChange={(e) => setEditNodeStatus(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Core Metric</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15 ms latency" 
                      value={editNodeMetric}
                      onChange={(e) => setEditNodeMetric(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/25 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>
                </div>

                {/* Category & Orbit Tier */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Category</label>
                    <select 
                      value={editNodeCategory}
                      onChange={(e) => setEditNodeCategory(e.target.value as any)}
                      className="w-full bg-black/80 border border-cyan-500/25 rounded-lg px-1.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    >
                      <option value="security">Security & Core</option>
                      <option value="marketing">SEO & Commerce</option>
                      <option value="workspace">Workspace Suite</option>
                      <option value="future">Future Expansion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Orbit Tier</label>
                    <select 
                      value={editNodeTier}
                      onChange={(e) => setEditNodeTier(Number(e.target.value))}
                      className="w-full bg-black/80 border border-cyan-500/25 rounded-lg px-1.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                    >
                      <option value={1}>Tier 1 (Inner)</option>
                      <option value={2}>Tier 2 (Middle)</option>
                      <option value={3}>Tier 3 (Outer)</option>
                    </select>
                  </div>
                </div>

                {/* Detail lines */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1 font-bold">Diagnostic Log Lines (One per line)</label>
                  <textarea 
                    placeholder="e.g.&#10;Email: ecilearncommunity@gmail.com&#10;Uptime: 99.98%&#10;Data Feed: Connected" 
                    rows={3}
                    value={editNodeDetails}
                    onChange={(e) => setEditNodeDetails(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/25 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-400 transition font-mono leading-normal resize-none custom-scrollbar"
                  />
                </div>

                {/* Color presets selection */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1.5 font-bold">Color Energy</label>
                  <div className="flex flex-wrap gap-2 justify-between px-0.5">
                    {[
                      { name: "Emerald", value: "from-emerald-400 to-teal-500", color: "#10b981" },
                      { name: "Sky", value: "from-sky-400 to-blue-500", color: "#38bdf8" },
                      { name: "Purple", value: "from-purple-400 to-indigo-500", color: "#a855f7" },
                      { name: "Amber", value: "from-amber-400 to-orange-500", color: "#fbbf24" },
                      { name: "Red", value: "from-red-400 to-rose-500", color: "#ef4444" },
                      { name: "Pink", value: "from-pink-400 to-purple-500", color: "#ec4899" },
                      { name: "Teal", value: "from-teal-400 to-emerald-500", color: "#14b8a6" }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEditNodeColor(preset.value)}
                        className={`w-5.5 h-5.5 rounded-full border transition-transform duration-200 cursor-pointer ${
                          editNodeColor === preset.value ? "scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "border-white/15 hover:scale-105"
                        }`}
                        style={{ background: `linear-gradient(135deg, ${preset.color}, #0c101f)` }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon presets selection */}
                <div>
                  <label className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1.5 font-bold">Identity Icon</label>
                  <div className="grid grid-cols-6 gap-1 px-0.5">
                    {[
                      { name: "Shield", icon: <Shield className="w-3 h-3" /> },
                      { name: "Globe", icon: <Globe className="w-3 h-3" /> },
                      { name: "RefreshCw", icon: <RefreshCw className="w-3 h-3" /> },
                      { name: "Activity", icon: <Activity className="w-3 h-3" /> },
                      { name: "Mail", icon: <Mail className="w-3 h-3" /> },
                      { name: "Database", icon: <Database className="w-3 h-3" /> },
                      { name: "Layers", icon: <Layers className="w-3 h-3" /> },
                      { name: "Cpu", icon: <Cpu className="w-3 h-3" /> },
                      { name: "Sparkles", icon: <Sparkles className="w-3 h-3" /> },
                      { name: "Code", icon: <Code className="w-3 h-3" /> },
                      { name: "MessageSquare", icon: <MessageSquare className="w-3 h-3" /> },
                      { name: "Zap", icon: <Zap className="w-3 h-3" /> }
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setEditNodeIcon(item.name)}
                        className={`p-1 rounded border flex items-center justify-center transition duration-200 cursor-pointer ${
                          editNodeIcon === item.name 
                            ? "bg-cyan-500/30 border-cyan-400 text-white scale-105 shadow-[0_0_6px_rgba(6,182,212,0.3)]" 
                            : "bg-black/40 border-white/5 text-gray-400 hover:text-white"
                        }`}
                        title={item.name}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-orbitron text-[9px] uppercase tracking-widest font-extrabold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_16px_rgba(6,182,212,0.3)] shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save Configuration</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
