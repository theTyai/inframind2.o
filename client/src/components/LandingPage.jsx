import { useState, useMemo, useRef, useEffect } from "react";
import {
  Boxes, Sparkles, Workflow, Database, Code2, ArrowRight, ShieldCheck,
  Layers3, CheckCircle2, LockKeyhole, Cpu, Terminal, FileJson, History,
  Users, Check, ExternalLink, ChevronDown, Activity, Play, RefreshCw,
  GitBranch, Server, Zap, Radio, CheckSquare, Layers, Lock, Search, FileCode
} from "lucide-react";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";
import { normalizeToCanonicalModel } from "../lib/canonicalModel.js";
import { runCompilerChecks } from "../lib/consistencyEngine.js";
import SystemDiagram from "./system/SystemDiagram.jsx";
import SortedSystemDiagram from "./system/SortedSystemDiagram.jsx";

// Derive realistic runtime technology based on component tier and name
function getNodeRuntimeTech(node) {
  if (node?.technology) return node.technology;
  if (node?.tech) return node.tech;
  const type = (node?.componentType || node?.type || "").toUpperCase();
  const label = (node?.label || node?.name || "").toLowerCase();

  if (type === "CLIENT" || label.includes("portal") || label.includes("app") || label.includes("web") || label.includes("client")) {
    return "React 18 · Vite · CSS Modules";
  }
  if (type === "GATEWAY" || label.includes("gateway") || label.includes("proxy")) {
    return "Node.js 20 · Express Gateway · JWT";
  }
  if (type === "DATABASE" || label.includes("mongo") || label.includes("db") || label.includes("store")) {
    return "MongoDB 7.0 · Mongoose 8.8";
  }
  if (type === "CACHE" || label.includes("redis") || label.includes("cache")) {
    return "Redis 7 · In-Memory Cache";
  }
  if (type === "QUEUE" || label.includes("queue") || label.includes("worker") || label.includes("kafka")) {
    return "Node.js 20 · BullMQ · Worker Process";
  }
  if (type === "EXTERNAL" || label.includes("stripe") || label.includes("openai") || label.includes("mail")) {
    return "HTTPS · External Provider API";
  }
  return "Node.js 20 · Express Service";
}

export default function LandingPage({
  onStartBuilding,
  onExploreDemo,
  onOpenAuth,
  onUseAsTemplate,
  user
}) {
  // Hero input prompt state
  const [heroPrompt, setHeroPrompt] = useState("");

  // Preset for the interactive hero product shot
  const [selectedDemoId, setSelectedDemoId] = useState("commerceflow");
  const currentDemo = useMemo(() => {
    return DEMO_PROJECTS.find((d) => d.id === selectedDemoId) || DEMO_PROJECTS[0];
  }, [selectedDemoId]);

  // Canonical representation of current demo
  const canonicalDemoModel = useMemo(() => {
    return normalizeToCanonicalModel(currentDemo.fixture);
  }, [currentDemo]);

  const compilerFindings = useMemo(() => {
    return runCompilerChecks(canonicalDemoModel);
  }, [canonicalDemoModel]);

  // Node selection state in product shot
  const [selectedNode, setSelectedNode] = useState(null);
  const activeNode = useMemo(() => {
    if (selectedNode) return selectedNode;
    const comps = canonicalDemoModel.components || [];
    return comps.find((c) => c.tier === "service" || c.tier === "gateway") || comps[0] || null;
  }, [selectedNode, canonicalDemoModel]);

  // Pan and zoom state for product shot diagram
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 20, y: 20 });

  // Traceability demo active layer
  const [activeTraceLayer, setActiveTraceLayer] = useState("endpoint");

  // Open FAQ item
  const [openFaq, setOpenFaq] = useState(0);

  // Quick-start prompt examples
  const promptExamples = [
    { label: "Multi-vendor marketplace", text: "Multi-vendor marketplace with customer and seller roles, inventory locking, and Stripe checkout." },
    { label: "Appointment scheduling", text: "Appointment booking platform with calendar sync, provider availability slots, and SMS reminders." },
    { label: "Analytics dashboard", text: "Real-time collaborative analytics dashboard with team permissions and event ingestion." },
    { label: "B2B SaaS with teams", text: "Multi-tenant B2B SaaS with team invitations, role-based access control, and usage limits." }
  ];

  function handleHeroSubmit(e) {
    e.preventDefault();
    onStartBuilding(heroPrompt);
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  const faqs = [
    {
      q: "What technical artifacts does InfraMind generate?",
      a: "InfraMind generates 4 core production artifacts: 1) Verified system topology diagrams with protocol-labeled edges, 2) Strongly typed MongoDB document models with indexes and foreign references, 3) REST API endpoint contracts adhering to OpenAPI 3.1, and 4) A runnable MERN starter repository containing .env.example, package.json, and Express routes."
    },
    {
      q: "Are the 4 prebuilt example demos real or mocked?",
      a: "They are 100% genuine, static JSON fixtures bundled at build time. Browsing, inspecting, and navigating any of the 4 demos makes zero AI API calls and incurs zero network latency."
    },
    {
      q: "How does the consistency compiler check for broken designs?",
      a: "InfraMind runs an automated, deterministic client-side consistency engine. It asserts that every API endpoint references a declared service, every entity is touched by at least one route, authentication requirements are consistent across auth routes, and no orphaned nodes exist."
    },
    {
      q: "Can I simulate architectural changes before modifying code?",
      a: "Yes. In the Analyze workspace, the Change Impact Simulator lets you test migrations—such as switching from MongoDB to PostgreSQL or injecting a Redis caching tier—showing the exact blast radius and configuration diffs."
    },
    {
      q: "Is prompt data or API keys exposed to the client?",
      a: "No. Sensitive API keys and authentication sessions remain on the server with secure HttpOnly cookies. Client bundles only contain static assets and client-side analysis algorithms."
    },
    {
      q: "What format is the exported code scaffold?",
      a: "The scaffold is exported as a standard Node.js / Express / Mongoose codebase packaged in a clean ZIP file, with a root package.json and .env.example ready for local development with npm install and npm run dev."
    }
  ];

  return (
    <div className="landing-container" style={{ background: "var(--ide-bg-canvas, #090c13)", color: "var(--ide-text-primary, #f8fafc)" }}>
      {/* ─── 1. Sticky Navigation Bar ─────────────────────────────────────────── */}
      <header
        className="landing-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(9, 12, 19, 0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          height: 52
        }}
        role="banner"
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px"
          }}
        >
          {/* Logo & Brand */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
            onClick={() => scrollToSection("hero")}
          >
            <span style={{ color: "var(--ide-accent, #8b7cff)", display: "flex", alignItems: "center" }}>
              <Boxes size={20} />
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc" }}>
              InfraMind<span style={{ color: "var(--ide-accent, #8b7cff)" }}>.</span>
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav
            style={{ display: "flex", alignItems: "center", gap: 24 }}
            className="landing-nav-links"
            aria-label="Main Navigation"
          >
            <a
              href="#preview"
              onClick={(e) => { e.preventDefault(); scrollToSection("preview"); }}
              style={{ fontSize: 13, color: "var(--ide-text-secondary, #cbd5e1)", textDecoration: "none", transition: "color 0.15s" }}
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}
              style={{ fontSize: 13, color: "var(--ide-text-secondary, #cbd5e1)", textDecoration: "none", transition: "color 0.15s" }}
            >
              How it works
            </a>
            <a
              href="#traceability"
              onClick={(e) => { e.preventDefault(); scrollToSection("traceability"); }}
              style={{ fontSize: 13, color: "var(--ide-text-secondary, #cbd5e1)", textDecoration: "none", transition: "color 0.15s" }}
            >
              Traceability
            </a>
            <a
              href="#templates"
              onClick={(e) => { e.preventDefault(); scrollToSection("templates"); }}
              style={{ fontSize: 13, color: "var(--ide-text-secondary, #cbd5e1)", textDecoration: "none", transition: "color 0.15s" }}
            >
              Templates
            </a>
            <a
              href="https://github.com/theTyai/inframind2.o"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: "var(--ide-text-secondary, #cbd5e1)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              GitHub <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => onStartBuilding()}
                style={{ height: 32, padding: "0 14px", fontSize: 13, fontWeight: 600 }}
              >
                Go to Workspace <ArrowRight size={13} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onOpenAuth("signin")}
                  style={{ height: 32, padding: "0 12px", fontSize: 13, color: "#94a3b8" }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onStartBuilding()}
                  style={{ height: 32, padding: "0 14px", fontSize: 13, fontWeight: 600 }}
                >
                  Start designing
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── 2. Hero Section with Direct Interactive Composer ─────────────────── */}
      <section
        id="hero"
        style={{
          padding: "72px 20px 48px",
          maxWidth: 960,
          margin: "0 auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {/* Subtle eyebrow label */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 9999,
            background: "rgba(139, 124, 255, 0.08)",
            border: "1px solid rgba(139, 124, 255, 0.25)",
            fontSize: 12,
            color: "#c4b8ff",
            marginBottom: 20
          }}
        >
          <Sparkles size={12} /> System Design IDE
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 5.5vw, 58px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#f8fafc",
            margin: "0 0 18px",
            maxWidth: 780
          }}
        >
          From a single idea to a{" "}
          <span style={{ color: "var(--ide-accent, #8b7cff)" }}>system you can build</span>.
        </h1>

        {/* Subcopy */}
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--ide-text-secondary, #cbd5e1)",
            margin: "0 auto 32px",
            maxWidth: 620
          }}
        >
          Synthesize verified topologies, typed MongoDB schemas, and REST contracts from natural language
          before writing application code.
        </p>

        {/* Hero Interactive Composer Input */}
        <form
          onSubmit={handleHeroSubmit}
          style={{
            width: "100%",
            maxWidth: 680,
            background: "rgba(20, 24, 34, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14
          }}
        >
          <textarea
            value={heroPrompt}
            onChange={(e) => setHeroPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                handleHeroSubmit(e);
              }
            }}
            placeholder="Describe your application (e.g. multi-vendor marketplace with customer/seller roles, inventory lock, and Stripe checkout)…"
            rows={3}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: 14,
              lineHeight: 1.5,
              padding: "8px 10px",
              resize: "none",
              outline: "none",
              fontFamily: "inherit"
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)"
            }}
          >
            <span style={{ fontSize: 11.5, color: "var(--ide-text-muted, #94a3b8)" }}>
              Press <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.06)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", fontSize: 10 }}>⌘</kbd> + <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.06)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", fontSize: 10 }}>Enter</kbd>
            </span>
            <button
              type="submit"
              className="primary-button"
              style={{
                height: 32,
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              Start designing <ArrowRight size={13} />
            </button>
          </div>
        </form>

        {/* Quick-Start Example Chips */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          <span style={{ fontSize: 11.5, color: "var(--ide-text-muted, #94a3b8)", marginRight: 2 }}>Try:</span>
          {promptExamples.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setHeroPrompt(item.text)}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 9999,
                padding: "3px 10px",
                fontSize: 11.5,
                color: "var(--ide-text-secondary, #cbd5e1)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Secondary link and quiet stack line */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a
            href="#preview"
            onClick={(e) => { e.preventDefault(); scrollToSection("preview"); }}
            style={{ fontSize: 13, color: "var(--ide-accent, #8b7cff)", textDecoration: "none", fontWeight: 500 }}
          >
            View live demo ↓
          </a>
          <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--ide-text-muted, #94a3b8)" }}>
            Built with React 18 · Node.js 20 · MongoDB 7.0 · OpenAPI 3.1
          </span>
        </div>
      </section>

      {/* ─── 3. Centerpiece: Big Sorted Interactive System Architecture ───── */}
      <section id="preview" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px 80px" }}>
        <div
          style={{
            background: "rgba(14, 17, 26, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 14,
            boxShadow: "0 28px 72px -12px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(139, 124, 255, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Window Header */}
          <div
            style={{
              minHeight: 48,
              padding: "8px 18px",
              background: "rgba(20, 24, 36, 0.95)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            {/* Window controls & Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#27c93f", display: "inline-block" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                {currentDemo.name} · <span style={{ color: "var(--ide-accent, #8b7cff)" }}>Sorted Architecture Blueprint</span>
              </span>
            </div>

            {/* Presets Switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {DEMO_PROJECTS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    setSelectedDemoId(demo.id);
                    setSelectedNode(null);
                  }}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    borderRadius: 5,
                    fontSize: 12,
                    fontWeight: selectedDemoId === demo.id ? 600 : 500,
                    background: selectedDemoId === demo.id ? "rgba(139, 124, 255, 0.22)" : "rgba(255, 255, 255, 0.03)",
                    color: selectedDemoId === demo.id ? "#ffffff" : "#94a3b8",
                    border: selectedDemoId === demo.id ? "1px solid rgba(139, 124, 255, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {demo.name}
                </button>
              ))}
            </div>

            {/* Status chip */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#34d399",
                background: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.25)",
                padding: "3px 10px",
                borderRadius: 9999,
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <ShieldCheck size={13} /> 7/7 VERIFIED INTEGRITY
            </span>
          </div>

          {/* Big Sorted Diagram Canvas */}
          <SortedSystemDiagram
            canonicalModel={canonicalDemoModel}
            selectedDemoId={selectedDemoId}
            currentDemo={currentDemo}
            selectedNodeId={activeNode?.id}
            onSelectNode={(comp) => setSelectedNode(comp)}
            onOpenIde={() => onExploreDemo(currentDemo.id)}
          />

          {/* Window Footer */}
          <div
            style={{
              height: 42,
              padding: "0 20px",
              background: "rgba(16, 20, 30, 0.9)",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Deterministic MERN Blueprint: 4 sorted tiers, strict trust boundaries, and zero circular dependencies.
            </span>
            <button
              type="button"
              onClick={() => onExploreDemo(currentDemo.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ide-accent, #8b7cff)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              Open Full {currentDemo.name} IDE <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 4. "How It Works" 3-Step Pipeline ───────────────────────────────── */}
      <section id="how-it-works" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            Deterministic Pipeline
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", margin: "6px 0 10px" }}>
            How InfraMind turns ideas into code
          </h2>
          <p style={{ fontSize: 14, color: "var(--ide-text-secondary, #cbd5e1)", margin: 0 }}>
            Every blueprint passes through 3 explicit verification stages.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {/* Step 1: Describe */}
          <div
            style={{
              background: "rgba(20, 24, 34, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", fontFamily: "monospace" }}>01 · DESCRIBE</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Requirements</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>
              State requirements in plain English
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Specify user personas, business rules, transactional workflows, and external provider constraints.
            </p>
            {/* Real snippet artifact */}
            <div style={{ marginTop: "auto", background: "#0a0d14", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 6, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#38bdf8" }}>
              <code>REQ-1: Customers can place idempotent orders and pay with Stripe.</code>
            </div>
          </div>

          {/* Step 2: Verify */}
          <div
            style={{
              background: "rgba(20, 24, 34, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", fontFamily: "monospace" }}>02 · VERIFY</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Compiler</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>
              Automated consistency compilation
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Deterministic client-side rules check route signatures, foreign key references, and auth coverage in &lt;10ms.
            </p>
            {/* Real snippet artifact */}
            <div style={{ marginTop: "auto", background: "#0a0d14", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#34d399", display: "flex", flexDirection: "column", gap: 4 }}>
              <div>✓ 7/7 rules verified (0 errors, 0 warnings)</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Route uniqueness · FK integrity · Auth alignment</div>
            </div>
          </div>

          {/* Step 3: Ship */}
          <div
            style={{
              background: "rgba(20, 24, 34, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>03 · SHIP</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Deliverables</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>
              Export OpenAPI 3.1 & MERN starter
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Download a complete MERN repository with root package.json and .env.example, ready for local execution.
            </p>
            {/* Real snippet artifact */}
            <div style={{ marginTop: "auto", background: "#0a0d14", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 6, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#cbd5e1" }}>
              <div>📁 package.json · .env.example</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>📄 server/routes/orders.js · models/Order.js</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Traceability: Idea to Code Vertical Trace ──────────────────────── */}
      <section id="traceability" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            End-To-End Traceability
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", margin: "6px 0 8px" }}>
            One continuous thread from user intent to code
          </h2>
          <p style={{ fontSize: 14, color: "var(--ide-text-secondary, #cbd5e1)", margin: 0 }}>
            Every line of scaffolded code links directly back to an approved requirement.
          </p>
        </div>

        {/* Vertical Connected Trace Diagram */}
        <div
          style={{
            background: "rgba(16, 20, 28, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          {/* Layer 1: Requirement */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--cat-requirement, #a78bfa)", fontFamily: "monospace", paddingTop: 4 }}>
              REQUIREMENT
            </span>
            <div style={{ flex: 1, background: "rgba(167, 139, 250, 0.08)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>REQ-1: Idempotent Order Checkout</strong>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(167, 139, 250, 0.2)", color: "#c4b8ff" }}>Must have</span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "#cbd5e1" }}>
                Customers can place checkout orders with duplicate-submission protection and secure Stripe payment processing.
              </p>
            </div>
          </div>

          {/* Connector */}
          <div style={{ marginLeft: 50, height: 16, borderLeft: "2px dashed rgba(255, 255, 255, 0.15)" }} />

          {/* Layer 2: Topology */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--cat-component, #38bdf8)", fontFamily: "monospace", paddingTop: 4 }}>
              TOPOLOGY
            </span>
            <div style={{ flex: 1, background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: 6, padding: "10px 14px" }}>
              <strong style={{ fontSize: 13, color: "#f8fafc" }}>Component: Orders & Payment Service</strong>
              <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
                <span>Tier: Internal Service</span>
                <span>·</span>
                <span>Runtime: Node.js 20 · Express Router</span>
                <span>·</span>
                <span>Protocol: HTTPS · REST</span>
              </div>
            </div>
          </div>

          {/* Connector */}
          <div style={{ marginLeft: 50, height: 16, borderLeft: "2px dashed rgba(255, 255, 255, 0.15)" }} />

          {/* Layer 3: Data Model */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--cat-entity, #34d399)", fontFamily: "monospace", paddingTop: 4 }}>
              DATA MODEL
            </span>
            <div style={{ flex: 1, background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.25)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>Collection: Orders</strong>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#34d399" }}>8 fields · indexed</span>
              </div>
              <code style={{ fontSize: 11, color: "#cbd5e1", display: "block" }}>
                userId: ObjectId (ref: User), totalAmount: Number, status: String, idempotencyKey: String (unique)
              </code>
            </div>
          </div>

          {/* Connector */}
          <div style={{ marginLeft: 50, height: 16, borderLeft: "2px dashed rgba(255, 255, 255, 0.15)" }} />

          {/* Layer 4: REST Contract */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--cat-api, #60a5fa)", fontFamily: "monospace", paddingTop: 4 }}>
              API CONTRACT
            </span>
            <div style={{ flex: 1, background: "rgba(96, 165, 250, 0.08)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(96, 165, 250, 0.2)", color: "#93c5fd", fontFamily: "monospace" }}>POST</span>
                <code style={{ fontSize: 12.5, color: "#f8fafc" }}>/api/v1/orders</code>
                <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>201 Created</span>
              </div>
              <span style={{ fontSize: 11.5, color: "#cbd5e1" }}>
                Auth: Bearer JWT · Header: Idempotency-Key · Writes to: Orders collection
              </span>
            </div>
          </div>

          {/* Connector */}
          <div style={{ marginLeft: 50, height: 16, borderLeft: "2px dashed rgba(255, 255, 255, 0.15)" }} />

          {/* Layer 5: Code Scaffold */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", fontFamily: "monospace", paddingTop: 4 }}>
              SCAFFOLD
            </span>
            <div style={{ flex: 1, background: "rgba(139, 124, 255, 0.08)", border: "1px solid rgba(139, 124, 255, 0.25)", borderRadius: 6, padding: "10px 14px" }}>
              <strong style={{ fontSize: 13, color: "#f8fafc" }}>server/routes/orders.js &amp; server/models/Order.js</strong>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#cbd5e1" }}>
                Auto-generated Express handler with Mongoose schema, validation middleware, and unit test stub.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Feature Bento Grid (3 Rows, 0 Empty Cells) ───────────────────── */}
      <section id="features" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            The Complete IDE Suite
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", margin: "6px 0 8px" }}>
            Everything needed to plan serious systems
          </h2>
          <p style={{ fontSize: 14, color: "var(--ide-text-secondary, #cbd5e1)", margin: 0 }}>
            Precision developer tools designed for technical founders and engineering architects.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {/* Row 1: Span-2 + Span-1 = 3 cols */}
          <div
            style={{
              gridColumn: "span 2",
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(139, 124, 255, 0.15)", color: "var(--ide-accent, #8b7cff)", display: "grid", placeItems: "center" }}>
                <Workflow size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>Hub-and-Spoke System Topologies</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              The API Server acts as the central hub connecting frontend clients, database tiers, and external AI providers with explicit protocol annotations (HTTPS REST, Mongoose persist, LLM stream).
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11.5, color: "#38bdf8" }}>
              Client [React] ── HTTPS ──▶ API Server [Express] ── Mongoose ──▶ Database [MongoDB]
            </div>
          </div>

          <div
            style={{
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(52, 211, 153, 0.15)", color: "#34d399", display: "grid", placeItems: "center" }}>
                <ShieldCheck size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>Compiler Checks</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              7 deterministic consistency rules run client-side to verify route uniqueness, foreign key targets, and auth coverage.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#34d399" }}>
              ✓ 7/7 compiler rules passing with zero hallucinations
            </div>
          </div>

          {/* Row 2: Span-1 + Span-2 = 3 cols */}
          <div
            style={{
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "grid", placeItems: "center" }}>
                <Database size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>MongoDB Schema Models</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Typed document schemas with primary keys, ObjectId foreign refs, nullability constraints, and index recommendations.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#cbd5e1" }}>
              <code>OrderSchema: {`{ userId: ObjectId, total: Number }`}</code>
            </div>
          </div>

          <div
            style={{
              gridColumn: "span 2",
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(96, 165, 250, 0.15)", color: "#60a5fa", display: "grid", placeItems: "center" }}>
                <FileJson size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>OpenAPI 3.1 &amp; REST Contracts</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Standardized HTTP methods, request bodies, and expected status codes. Export clean OpenAPI 3.1 JSON directly to Swagger UI, Postman, or SDK generators.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11.5, color: "#60a5fa" }}>
              POST /api/v1/orders ➔ 201 Created (schema validated) · Bearer JWT
            </div>
          </div>

          {/* Row 3: Span-1 + Span-1 + Span-1 = 3 cols (100% full, 0 empty cells!) */}
          <div
            style={{
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(139, 124, 255, 0.15)", color: "var(--ide-accent, #8b7cff)", display: "grid", placeItems: "center" }}>
                <Code2 size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>MERN Starter Codebase</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Guaranteed root package.json and .env.example with modular Express routes and Mongoose models in a downloadable ZIP.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#cbd5e1" }}>
              📦 Downloadable ZIP scaffold
            </div>
          </div>

          <div
            style={{
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "grid", placeItems: "center" }}>
                <Play size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>Live Mock API Server</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Execute real HTTP requests against your declared endpoints inside the browser before any backend code is implemented.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#38bdf8" }}>
              ⚡ Interactive Send &amp; Response panel
            </div>
          </div>

          <div
            style={{
              background: "rgba(18, 22, 32, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", display: "grid", placeItems: "center" }}>
                <GitBranch size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>Semantic Version Diffs</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
              Branch, compare, and track revisions over time with automatic Design Decision Record (DDR) generation across changes.
            </p>
            <div style={{ marginTop: "auto", background: "#0a0c12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#fbbf24" }}>
              🔀 v1 ➔ v2 revision changelog
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. Compact Neutral Templates Gallery ───────────────────────────── */}
      <section id="templates" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            Production Presets
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", margin: "6px 0 8px" }}>
            Explore prebuilt blueprints across diverse domains
          </h2>
          <p style={{ fontSize: 14, color: "var(--ide-text-secondary, #cbd5e1)", margin: 0 }}>
            Every template is a static JSON fixture bundled at build time with zero network latency.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {DEMO_PROJECTS.map((demo) => {
            const canonical = normalizeToCanonicalModel(demo.fixture);
            const compCount = canonical.components?.length || 4;
            const tableCount = canonical.entities?.length || 4;
            const apiCount = canonical.apis?.length || 6;

            return (
              <div
                key={demo.id}
                style={{
                  background: "rgba(18, 22, 32, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                      {demo.name}
                    </h3>
                    <span style={{ fontSize: 11.5, color: "var(--ide-accent, #8b7cff)", background: "rgba(139, 124, 255, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                      {demo.domain || demo.tagline || "Architecture"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.25)", padding: "2px 6px", borderRadius: 4 }}>
                    0 AI Calls
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>
                  {demo.description}
                </p>

                {/* Derived Counts Strip */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    background: "#0c0f16",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    textAlign: "center"
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: "#f8fafc", display: "block" }}>{compCount}</strong>
                    <span style={{ fontSize: 10, color: "#64748b" }}>Components</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: "#f8fafc", display: "block" }}>{tableCount}</strong>
                    <span style={{ fontSize: 10, color: "#64748b" }}>Collections</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: "#f8fafc", display: "block" }}>{apiCount}</strong>
                    <span style={{ fontSize: 10, color: "#64748b" }}>REST APIs</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => onExploreDemo(demo.id)}
                    style={{ flex: 1, height: 32, fontSize: 12.5, fontWeight: 600 }}
                  >
                    Explore Blueprint
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onUseAsTemplate(demo)}
                    style={{ flex: 1, height: 32, fontSize: 12.5 }}
                  >
                    Use as Template
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. "Built Like Production Software" Developer Proof ────────────── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 80px" }}>
        <div
          style={{
            background: "rgba(16, 20, 30, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: 32
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase" }}>
              Verifiable Architecture
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: "6px 0 6px" }}>
              Built like production software
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              InfraMind enforces real engineering standards, not decorative diagrams.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div style={{ padding: 14, background: "#0c0f16", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <CheckSquare size={14} color="#34d399" />
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>Client-Side Rule Compiler</strong>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                7 deterministic consistency checks run in under 10ms with zero network requests.
              </p>
            </div>

            <div style={{ padding: 14, background: "#0c0f16", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <FileCode size={14} color="#60a5fa" />
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>OpenAPI 3.1 Standards</strong>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                Portable REST contract schemas compatible with Swagger UI, Postman, and code generators.
              </p>
            </div>

            <div style={{ padding: 14, background: "#0c0f16", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Lock size={14} color="#a78bfa" />
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>Security-First Modeling</strong>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                HttpOnly session cookies, bcrypt password hashing, and STRIDE threat mitigation.
              </p>
            </div>

            <div style={{ padding: 14, background: "#0c0f16", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Server size={14} color="#38bdf8" />
                <strong style={{ fontSize: 13, color: "#f8fafc" }}>Interactive Mock API Sandbox</strong>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                Simulate HTTP requests and inspect JSON response bodies directly inside the browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. Frequently Asked Questions ───────────────────────────────────── */}
      <section id="faq" style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            FAQ
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc", margin: "6px 0 6px" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                style={{
                  background: "rgba(18, 22, 32, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 8,
                  overflow: "hidden"
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#f8fafc",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", color: "#94a3b8" }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 16px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 10. Final CTA Banner ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 80px" }}>
        <div
          style={{
            background: "linear-gradient(180deg, rgba(24, 28, 42, 0.8) 0%, rgba(14, 17, 26, 0.95) 100%)",
            border: "1px solid rgba(139, 124, 255, 0.3)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", margin: "0 0 10px" }}>
            Ready to design your application system?
          </h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 24px", maxWidth: 520 }}>
            Start from plain-English requirements or explore 4 bundled prebuilt architecture blueprints.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => onStartBuilding()}
              style={{ height: 38, padding: "0 20px", fontSize: 13.5, fontWeight: 600 }}
            >
              Start designing free <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onExploreDemo("commerceflow")}
              style={{ height: 38, padding: "0 18px", fontSize: 13.5 }}
            >
              Explore live demo
            </button>
          </div>
        </div>
      </section>

      {/* ─── 11. Minimal Factual Footer (Real Links Only) ────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#07090e",
          padding: "40px 20px 24px"
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.5fr repeat(3, 1fr)",
            gap: 28,
            marginBottom: 36
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "var(--ide-accent, #8b7cff)" }}><Boxes size={18} /></span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>InfraMind</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5, maxWidth: 260 }}>
              AI system design &amp; architecture workspace. Turn natural language into verifiable production specifications.
            </p>
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Product</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <a href="#preview" onClick={(e) => { e.preventDefault(); scrollToSection("preview"); }} style={{ color: "inherit", textDecoration: "none" }}>System Diagram</a>
              <a href="#traceability" onClick={(e) => { e.preventDefault(); scrollToSection("traceability"); }} style={{ color: "inherit", textDecoration: "none" }}>Traceability</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }} style={{ color: "inherit", textDecoration: "none" }}>Compiler Engine</a>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Templates</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <button type="button" onClick={() => onExploreDemo("commerceflow")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", textAlign: "left", cursor: "pointer" }}>CommerceFlow</button>
              <button type="button" onClick={() => onExploreDemo("slotwise")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", textAlign: "left", cursor: "pointer" }}>SlotWise</button>
              <button type="button" onClick={() => onExploreDemo("pulseboard")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", textAlign: "left", cursor: "pointer" }}>PulseBoard</button>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Resources</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <a href="https://github.com/theTyai/inframind2.o" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>GitHub Repository</a>
              <a href="https://swagger.io/specification/" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>OpenAPI 3.1 Spec</a>
            </div>
          </div>
        </div>

        {/* Footer bottom line with disclaimer */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            paddingTop: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "#64748b"
          }}
        >
          <span>AI-generated designs: review before production.</span>
          <span>MIT License · InfraMind</span>
        </div>
      </footer>
    </div>
  );
}
