import { useState } from "react";
import {
  Users, Server, Database, Zap, ArrowRight, ArrowLeftRight,
  Shield, CheckCircle2, RefreshCw, Cpu, Layers, HardDrive,
  Clock, ShieldAlert, Sparkles, Terminal, Code2, Globe
} from "lucide-react";

export default function SystemDataFlowDiagram({ canonicalModel, project, overview }) {
  const [activeFlowMode, setActiveFlowMode] = useState("standard"); // "standard" | "cached" | "cache_miss"
  const [selectedTier, setSelectedTier] = useState("db");

  const projectName = canonicalModel?.metadata?.projectName || project?.name || "System Architecture";
  const entities = canonicalModel?.entities || [];
  const apis = canonicalModel?.apis || [];
  const components = canonicalModel?.components || [];
  const actors = canonicalModel?.actors || [];

  // Representative collections/tables
  const collectionNames = entities.map(e => e.name).slice(0, 4);
  const apiSampleRoutes = apis.slice(0, 3).map(a => `${a.method} ${a.path}`);

  // Flow scenario data
  const flowScenarios = {
    standard: {
      title: "Standard User Request & Persistence Flow",
      tag: "Write & Mutate",
      tagColor: "#42d6a4",
      desc: "User submits an action from the UI. The API Gateway authenticates the JWT, invokes the business service, commits the document to MongoDB, and invalidates stale Redis cache entries.",
      steps: [
        { num: 1, title: "Client Action", desc: "User triggers HTTP POST/PUT with JSON payload & Bearer JWT", from: "Client", to: "Gateway" },
        { num: 2, title: "Authenticate & Route", desc: "Express Gateway verifies token, validates schema & checks rate-limits", from: "Gateway", to: "Services" },
        { num: 3, title: "Execute Business Logic", desc: "Service enforces invariants, triggers workflow transitions & builds query", from: "Services", to: "MongoDB" },
        { num: 4, title: "Persist Document", desc: "Mongoose commits document with timestamps, indexes & constraints", from: "MongoDB", to: "Redis" },
        { num: 5, title: "Evict Stale Cache", desc: "Redis cache keys for this entity are invalidated to prevent stale reads", from: "Redis", to: "Client" },
        { num: 6, title: "HTTP 201 Response", desc: "Client receives clean JSON payload with created entity details", from: "Services", to: "Client" }
      ]
    },
    cached: {
      title: "High-Speed In-Memory Read Flow",
      tag: "Sub-Millisecond Read",
      tagColor: "#53d7f4",
      desc: "User requests frequently accessed data (e.g. dashboard, profile, catalog). The API Gateway checks Redis in-memory cache, finds a valid cache hit, and returns immediately without querying the database.",
      steps: [
        { num: 1, title: "Client Query", desc: "User triggers HTTP GET request (e.g. GET /api/data)", from: "Client", to: "Gateway" },
        { num: 2, title: "Cache Lookup", desc: "API Gateway queries Redis using deterministic cache key", from: "Gateway", to: "Redis" },
        { num: 3, title: "⚡ Cache Hit (<2ms)", desc: "Redis returns in-memory serialized JSON payload immediately", from: "Redis", to: "Gateway" },
        { num: 4, title: "Skip Database", desc: "MongoDB query is bypassed, saving CPU cycles and database connection pool", from: "Gateway", to: "Client" },
        { num: 5, title: "HTTP 200 OK", desc: "Client renders refreshed UI state in ~12ms total round-trip time", from: "Gateway", to: "Client" }
      ]
    },
    cache_miss: {
      title: "Cache-Miss Query & Read-Through Refresh Flow",
      tag: "Lazy Population",
      tagColor: "#f59e0b",
      desc: "User requests data that is expired or not yet cached. The Gateway checks Redis (Miss), routes to the backend service to query MongoDB, populates Redis with a 300s TTL, and returns the data.",
      steps: [
        { num: 1, title: "Client Query", desc: "User calls GET endpoint for cold or dynamic data", from: "Client", to: "Gateway" },
        { num: 2, title: "Cache Miss", desc: "Redis key does not exist or TTL expired; query forwarded to service", from: "Redis", to: "Services" },
        { num: 3, title: "Database Query", desc: "Backend service executes indexed query against MongoDB Atlas", from: "Services", to: "MongoDB" },
        { num: 4, title: "Fetch & Hydrate", desc: "MongoDB returns document BSON, Mongoose hydrates schema model", from: "MongoDB", to: "Services" },
        { num: 5, title: "Populate Redis Cache", desc: "Service writes serialized JSON to Redis with 5-minute TTL", from: "Services", to: "Redis" },
        { num: 6, title: "HTTP 200 OK", desc: "Client receives data; subsequent requests will now hit in-memory cache", from: "Services", to: "Client" }
      ]
    }
  };

  const activeScenario = flowScenarios[activeFlowMode];

  // Tier details definition
  const tierDetails = {
    client: {
      title: "Client Application Tier",
      subtitle: "React 18 · Vite · Responsive SPA / Mobile",
      icon: Users,
      color: "#fbbf24",
      role: "User Interaction & Presentation Layer",
      stores: "Client state, JWT tokens (secure storage), cached UI responses, active sessions",
      traffic: "Sends: HTTPS REST (GET, POST, PATCH) with JSON & Bearer Auth | Receives: JSON payloads, status codes (200, 201, 400)",
      notes: "Handles client-side routing, form validation, and reactive component rendering."
    },
    gateway: {
      title: "API Gateway & Security Tier",
      subtitle: "Express.js · Router · JWT Middleware",
      icon: Shield,
      color: "#818cf8",
      role: "Perimeter Security, Routing & Traffic Control",
      stores: "CORS configuration, rate limit thresholds, JWT public keys, route dispatch map",
      traffic: "Directs incoming requests to target backend controllers; checks Authorization header",
      notes: "Enforces Token Bucket rate limiting and input sanitization before touching business services."
    },
    redis: {
      title: "In-Memory Caching & Session Tier",
      subtitle: "Redis 7 · In-Memory Key-Value & Hashes",
      icon: Zap,
      color: "#53d7f4",
      role: "Sub-Millisecond Read Acceleration & Rate Limiting",
      stores: "Active session tokens, rate limit counters, hot query results (JSON strings), TTL keys",
      traffic: "Low-latency TCP protocol (<2ms response); cached GET queries and session validations",
      notes: "Prevents database thrashing during traffic spikes; invalidated automatically on writes."
    },
    backend: {
      title: "Backend Core Services Tier",
      subtitle: "Node.js · Express Controllers · Service Logic",
      icon: Cpu,
      color: "#a78bfa",
      role: "Business Domain Logic & Workflow Orchestration",
      stores: "Business rules, validation schemas, state machine guards, audit logger hooks",
      traffic: "Receives routed requests from Gateway; translates user actions into database mutations",
      notes: "Decoupled domain handlers ensuring transactional integrity and input validation."
    },
    db: {
      title: "Primary Database Storage Tier",
      subtitle: "MongoDB 7 · Mongoose 8 Document Store",
      icon: Database,
      color: "#42d6a4",
      role: "Durable Data Persistence & Relational References",
      stores: `Persistent collections: ${collectionNames.length ? collectionNames.join(", ") : "users, interactions, logs"}`,
      traffic: "Indexed MongoDB queries, BSON document storage, unique compound indexes, Mongoose hooks",
      notes: "Configured with replica sets for high availability, automatic failover, and strict schema validation."
    }
  };

  const selectedTierInfo = tierDetails[selectedTier] || tierDetails.db;
  const SelectedIcon = selectedTierInfo.icon;

  return (
    <div className="system-data-flow-panel" style={{
      background: "linear-gradient(180deg, #0e1118 0%, #0a0c10 100%)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      {/* ─── Header & Flow Switcher ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 4,
              background: "rgba(83, 215, 244, 0.15)",
              color: "#53d7f4",
              border: "1px solid rgba(83, 215, 244, 0.3)"
            }}>
              <Globe size={11} /> LIVE ARCHITECTURE & DATA FLOW
            </span>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>
              Real-life request/response lifecycle across tiers
            </span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0, letterSpacing: "-0.01em" }}>
            How User Data Travels & Where It Is Stored
          </h3>
        </div>

        {/* Flow Scenario Tabs */}
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 3,
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => setActiveFlowMode("standard")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 650,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeFlowMode === "standard" ? "rgba(66, 214, 164, 0.18)" : "transparent",
              color: activeFlowMode === "standard" ? "#42d6a4" : "var(--ide-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#42d6a4" }} />
            Write & Mutate Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveFlowMode("cached")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 650,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeFlowMode === "cached" ? "rgba(83, 215, 244, 0.18)" : "transparent",
              color: activeFlowMode === "cached" ? "#53d7f4" : "var(--ide-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Zap size={13} />
            Cached Read (Redis)
          </button>
          <button
            type="button"
            onClick={() => setActiveFlowMode("cache_miss")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 650,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeFlowMode === "cache_miss" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              color: activeFlowMode === "cache_miss" ? "#fbbf24" : "var(--ide-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <RefreshCw size={12} />
            Cache-Miss & Refresh
          </button>
        </div>
      </div>

      {/* ─── Scenario Context Summary ─────────────────────────────────────── */}
      <div style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 4,
            background: `${activeScenario.tagColor}22`,
            color: activeScenario.tagColor,
            border: `1px solid ${activeScenario.tagColor}44`,
            textTransform: "uppercase"
          }}>
            {activeScenario.tag}
          </span>
          <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{activeScenario.title}:</strong>
          <span style={{ fontSize: 12, color: "var(--ide-text-secondary)" }}>{activeScenario.desc}</span>
        </div>
      </div>

      {/* ─── Interactive Multi-Tier Visual Architecture Map ─────────────────── */}
      <div className="flow-architecture-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        position: "relative"
      }}>
        {/* Tier 1: Client Application */}
        <div
          onClick={() => setSelectedTier("client")}
          style={{
            background: selectedTier === "client" ? "rgba(251, 191, 36, 0.08)" : "#11141c",
            border: `1px solid ${selectedTier === "client" ? "#fbbf24" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(251, 191, 36, 0.15)",
              color: "#fbbf24",
              display: "grid",
              placeItems: "center"
            }}>
              <Users size={17} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "2px 6px", borderRadius: 4 }}>
              TIER 1
            </span>
          </div>
          <div>
            <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>Client Application</strong>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>React 18 · Vite SPA</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ide-text-secondary)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ display: "block", color: "#fbbf24", fontWeight: 600, fontSize: 10, marginBottom: 2 }}>DATA OUT / IN:</span>
            JSON Payloads · JWT Tokens
          </div>
        </div>

        {/* Tier 2: API Gateway */}
        <div
          onClick={() => setSelectedTier("gateway")}
          style={{
            background: selectedTier === "gateway" ? "rgba(129, 140, 248, 0.08)" : "#11141c",
            border: `1px solid ${selectedTier === "gateway" ? "#818cf8" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(129, 140, 248, 0.15)",
              color: "#818cf8",
              display: "grid",
              placeItems: "center"
            }}>
              <Shield size={17} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", background: "rgba(129,140,248,0.12)", padding: "2px 6px", borderRadius: 4 }}>
              TIER 2
            </span>
          </div>
          <div>
            <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>API Gateway</strong>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>Express 4.x · Auth Guard</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ide-text-secondary)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ display: "block", color: "#818cf8", fontWeight: 600, fontSize: 10, marginBottom: 2 }}>SECURITY GUARD:</span>
            JWT Auth · Rate Limiter
          </div>
        </div>

        {/* Tier 3: In-Memory Cache (Redis) */}
        <div
          onClick={() => setSelectedTier("redis")}
          style={{
            background: selectedTier === "redis" ? "rgba(83, 215, 244, 0.08)" : "#11141c",
            border: `1px solid ${selectedTier === "redis" ? "#53d7f4" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(83, 215, 244, 0.15)",
              color: "#53d7f4",
              display: "grid",
              placeItems: "center"
            }}>
              <Zap size={17} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#53d7f4", background: "rgba(83,215,244,0.12)", padding: "2px 6px", borderRadius: 4 }}>
              CACHE
            </span>
          </div>
          <div>
            <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>In-Memory Redis</strong>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>Redis 7 · TTL Store</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ide-text-secondary)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ display: "block", color: "#53d7f4", fontWeight: 600, fontSize: 10, marginBottom: 2 }}>WHAT IS STORED:</span>
            Sessions · Token Buckets · Hits
          </div>
        </div>

        {/* Tier 4: Backend Application Services */}
        <div
          onClick={() => setSelectedTier("backend")}
          style={{
            background: selectedTier === "backend" ? "rgba(167, 139, 250, 0.08)" : "#11141c",
            border: `1px solid ${selectedTier === "backend" ? "#a78bfa" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(167, 139, 250, 0.15)",
              color: "#a78bfa",
              display: "grid",
              placeItems: "center"
            }}>
              <Cpu size={17} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.12)", padding: "2px 6px", borderRadius: 4 }}>
              TIER 3
            </span>
          </div>
          <div>
            <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>Backend Services</strong>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>Node.js · Business Logic</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ide-text-secondary)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ display: "block", color: "#a78bfa", fontWeight: 600, fontSize: 10, marginBottom: 2 }}>PROCESSING:</span>
            Domain Validation · Workflows
          </div>
        </div>

        {/* Tier 5: Primary Database (MongoDB) */}
        <div
          onClick={() => setSelectedTier("db")}
          style={{
            background: selectedTier === "db" ? "rgba(66, 214, 164, 0.08)" : "#11141c",
            border: `1px solid ${selectedTier === "db" ? "#42d6a4" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(66, 214, 164, 0.15)",
              color: "#42d6a4",
              display: "grid",
              placeItems: "center"
            }}>
              <Database size={17} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#42d6a4", background: "rgba(66,214,164,0.12)", padding: "2px 6px", borderRadius: 4 }}>
              DATABASE
            </span>
          </div>
          <div>
            <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>Primary Database</strong>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>MongoDB 7 · Mongoose 8</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ide-text-secondary)", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ display: "block", color: "#42d6a4", fontWeight: 600, fontSize: 10, marginBottom: 2 }}>WHAT IS STORED:</span>
            {collectionNames.slice(0, 2).join(", ") || "Collections & Docs"}
          </div>
        </div>
      </div>

      {/* ─── Animated Inter-Tier Live Pulse Connection Track ───────────────── */}
      <div style={{
        background: "rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: 8,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeScenario.tagColor }} className="pulse-anim" />
          <span style={{ fontSize: 10, fontWeight: 800, color: activeScenario.tagColor, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            LIVE PROTOCOL FLOW:
          </span>
        </div>

        {/* 4 SVG connecting segments with animated particles */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, justifyContent: "space-around", overflowX: "auto" }}>
          {[
            { from: "Client", to: "Gateway", label: "HTTPS / REST (JWT)", color: "#fbbf24" },
            { from: "Gateway", to: "Redis", label: activeFlowMode === "cached" ? "⚡ Cache Hit" : "Lookup / Invalidate", color: "#53d7f4" },
            { from: "Gateway", to: "Backend", label: "Domain Dispatch", color: "#818cf8" },
            { from: "Backend", to: "MongoDB", label: "BSON / Index Commit", color: "#42d6a4" }
          ].map((seg, sIdx) => (
            <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f3f5fa" }}>{seg.from}</span>
              <div style={{ width: 44, height: 16, position: "relative" }}>
                <svg width="44" height="16" style={{ overflow: "visible" }}>
                  <path
                    d="M 2 8 L 38 8"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    className="flow-marching-ants"
                  />
                  <circle r="3" fill={seg.color} filter="drop-shadow(0 0 3px #53d7f4)">
                    <animateMotion path="M 2 8 L 38 8" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <circle r="1.2" fill="#ffffff">
                    <animateMotion path="M 2 8 L 38 8" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f3f5fa" }}>{seg.to}</span>
              <span style={{ fontSize: 9, color: seg.color, background: `${seg.color}15`, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                {seg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Selected Tier Deep Dive & Protocol Details ───────────────────── */}
      <div style={{
        background: "#08090d",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: 16,
        alignItems: "center"
      }}>
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <SelectedIcon size={18} style={{ color: selectedTierInfo.color }} />
            <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{selectedTierInfo.title}</strong>
          </div>
          <span style={{ fontSize: 11, color: "var(--ide-text-dim)", display: "block", marginBottom: 6 }}>
            {selectedTierInfo.subtitle}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            background: `${selectedTierInfo.color}18`,
            color: selectedTierInfo.color
          }}>
            {selectedTierInfo.role}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 11 }}>
          <div>
            <strong style={{ color: "#f3f5fa", display: "block", marginBottom: 3 }}>What is stored here:</strong>
            <span style={{ color: "var(--ide-text-secondary)" }}>{selectedTierInfo.stores}</span>
          </div>
          <div>
            <strong style={{ color: "#f3f5fa", display: "block", marginBottom: 3 }}>Data Transfer & Protocols:</strong>
            <span style={{ color: "var(--ide-text-secondary)" }}>{selectedTierInfo.traffic}</span>
          </div>
        </div>
      </div>

      {/* ─── Step-by-Step Data Lifecycle Timeline ─────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ide-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            LIFECYCLE STEPS: {activeScenario.title.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>
            {activeScenario.steps.length} sequential execution stages
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${activeScenario.steps.length}, 1fr)`, gap: 8 }}>
          {activeScenario.steps.map((st, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: `${activeScenario.tagColor}22`,
                  color: activeScenario.tagColor,
                  fontSize: 10,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center"
                }}>
                  {st.num}
                </span>
                <span style={{ fontSize: 9, color: "var(--ide-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {st.from} ➔ {st.to}
                </span>
              </div>
              <strong style={{ fontSize: 11, color: "#f3f5fa" }}>{st.title}</strong>
              <p style={{ fontSize: 10, color: "var(--ide-text-secondary)", margin: 0, lineHeight: 1.4 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
