import { useState, useMemo } from "react";
import {
  Boxes, Sparkles, Workflow, Database, Code2, ArrowRight, ShieldCheck,
  Layers3, CheckCircle2, LockKeyhole, Cpu, Terminal, FileJson, History,
  Users, Check, ExternalLink, ChevronDown, Activity, Play, RefreshCw,
  GitBranch, Server, Zap, Radio
} from "lucide-react";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

export default function LandingPage({ onStartBuilding, onExploreDemo, onOpenAuth, onUseAsTemplate, user }) {
  // Active demo preset for the interactive hero preview
  const [selectedDemoId, setSelectedDemoId] = useState("commerceflow");
  const [activePreviewTab, setActivePreviewTab] = useState("architecture");
  const [selectedNodeId, setSelectedNodeId] = useState("gateway");
  const [simulatingPacket, setSimulatingPacket] = useState(true);

  // Active step in "How it Works"
  const [activeStep, setActiveStep] = useState(0);

  // Open FAQ item
  const [openFaq, setOpenFaq] = useState(0);

  // Current demo fixture
  const currentDemo = useMemo(() => {
    return DEMO_PROJECTS.find(d => d.id === selectedDemoId) || DEMO_PROJECTS[0];
  }, [selectedDemoId]);

  // Nodes for the interactive hero preview
  const previewNodes = useMemo(() => {
    const rawNodes = currentDemo.fixture.architecture?.nodes || [];
    if (rawNodes.length >= 3) {
      return rawNodes.slice(0, 4);
    }
    return [
      { id: "client", label: "Client Application", type: "CLIENT", description: "React SPA & Mobile Web frontend", tech: "React 18 · Vite · Tailwind" },
      { id: "gateway", label: "Edge API Gateway", type: "GATEWAY", description: "Reverse proxy, JWT verification, rate limiter", tech: "Express Router · Helmet · Zod" },
      { id: "service", label: "Domain Engine", type: "SERVICE", description: "Core business logic, workflows, state machine", tech: "Node.js 20 · Clean Architecture" },
      { id: "database", label: "MongoDB Atlas", type: "DATABASE", description: "Primary document store with ACID transactions", tech: "MongoDB 7.0 · Mongoose" }
    ];
  }, [currentDemo]);

  // Selected node details
  const activeNode = useMemo(() => {
    return previewNodes.find(n => n.id === selectedNodeId) || previewNodes[1] || previewNodes[0];
  }, [previewNodes, selectedNodeId]);

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  const steps = [
    {
      num: "01",
      title: "Describe your software concept",
      desc: "Provide requirements in plain English — who the users are, their core journeys, business rules, and constraints.",
      artifact: "Natural-Language Spec Ingestion",
      details: "InfraMind parses intent without locking you into proprietary formats. Beginners can write a single paragraph; architects can provide exhaustive engineering briefs."
    },
    {
      num: "02",
      title: "Synthesize complete system topology",
      desc: "OpenRouter AI decomposes goals into micro-frontends, edge gateways, service boundaries, and primary databases.",
      artifact: "Verified Mermaid.js Topology",
      details: "Produces clean component graphs with explicit edge protocols (HTTPS, WebSocket, Mongoose, gRPC) rather than ambiguous boxes."
    },
    {
      num: "03",
      title: "Run deterministic design validation",
      desc: "Automated client-side rules check for orphaned nodes, unindexed foreign keys, duplicate API routes, and auth gaps.",
      artifact: "6/6 Automated Integrity Checks",
      details: "Client-side validation verifies that models, routes, and roles are mutually consistent before any code is generated."
    },
    {
      num: "04",
      title: "Export OpenAPI 3.1 & MERN starter ZIP",
      desc: "One-click download of a runnable MERN boilerplate repository with models, routes, CORS setup, and Postman schemas.",
      artifact: "Downloadable Starter ZIP & OpenAPI",
      details: "Export directly to Swagger, Postman, or download a modular MERN boilerplate ready to run with `npm run dev`."
    }
  ];

  const faqs = [
    {
      q: "What technical artifacts does InfraMind generate?",
      a: "InfraMind generates 6 core production artifacts: 1) Interactive Mermaid.js system topology diagrams, 2) Strongly typed MongoDB document models with indexes and references, 3) REST API endpoint contracts with request/response schemas and status codes, 4) Role-based access matrices (RBAC), 5) Step-by-step transaction workflows, and 6) A downloadable MERN starter ZIP scaffold."
    },
    {
      q: "Are the 4 prebuilt example demos real or simulated?",
      a: "They are 100% genuine, production-grade static JSON fixtures bundled at build time. Browsing, inspecting, and navigating any of the 4 demos makes zero AI API calls and incurs zero network latency."
    },
    {
      q: "Can I refine or branch an existing blueprint without losing progress?",
      a: "Yes. When signed in, all projects are stored in your MongoDB database with full versioning. You can refine a specification to generate v2, v3, or duplicate a project to explore an alternative architecture path."
    },
    {
      q: "How does InfraMind ensure API contracts and database schemas are valid?",
      a: "Unlike raw LLM chats that frequently hallucinate non-existent foreign keys or broken routes, InfraMind runs a deterministic client-side validation engine (`analyzeBlueprint`) that verifies route uniqueness, foreign key targets, and component connectivity."
    },
    {
      q: "Is my OpenRouter API key and prompt data kept secure?",
      a: "Yes. All AI calls route through the server backend with encrypted environment variables. User authentication utilizes secure HttpOnly cookies, and sensitive credentials are never exposed in frontend bundles."
    }
  ];

  return (
    <div className="landing-container">
      {/* ─── Section A: Sticky Navigation ────────────────────────────────────── */}
      <header className="landing-nav" role="banner">
        <div className="landing-nav-inner">
          <div className="brand" onClick={() => scrollToSection("top")} style={{ cursor: "pointer" }} title="Back to top">
            <span className="brand-mark"><Boxes size={18} /></span>
            <span>InfraMind<span className="brand-period">.</span></span>
            <span className="version-pill">v2.0</span>
          </div>

          <nav className="landing-nav-links" aria-label="Main Navigation">
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>How It Works</a>
            <a href="#examples" onClick={(e) => { e.preventDefault(); scrollToSection("examples"); }}>Examples</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>Features</a>
            <a href="#preview" onClick={(e) => { e.preventDefault(); scrollToSection("preview"); }}>Live Preview</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection("faq"); }}>FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <button className="primary-button" onClick={onStartBuilding} aria-label="Go to workspace">
                Go to Workspace <ArrowRight size={13} />
              </button>
            ) : (
              <>
                <button className="ghost-button" onClick={() => onOpenAuth("signin")} aria-label="Sign in">
                  Sign In
                </button>
                <button className="primary-button" onClick={onStartBuilding} aria-label="Get started free">
                  Start Designing <ArrowRight size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Section B: Hero Section ─────────────────────────────────────────── */}
      <section className="landing-hero tech-grid-bg" id="top">
        <div className="landing-hero-content">
          <div className="eyebrow">
            <span className="eyebrow-icon"><Sparkles size={12} /></span>
            AI SYSTEM DESIGN & ARCHITECTURE WORKSPACE
          </div>
          <h1>
            From a single idea to<br />
            <span>a system you can build.</span>
          </h1>
          <p className="landing-hero-subtitle">
            Explore your architecture, define your data, understand every workflow, and turn your
            software idea into a developer-ready blueprint before writing application code.
          </p>

          <div className="landing-hero-ctas">
            <button className="primary-button hero-cta" onClick={onStartBuilding}>
              <Sparkles size={15} /> Start Designing Free <ArrowRight size={15} />
            </button>
            <button className="secondary-button hero-secondary-cta" onClick={() => scrollToSection("examples")}>
              <Layers3 size={15} /> Explore 4 Prebuilt Demos
            </button>
          </div>

          <div className="stack-pills">
            <span><b className="pill-dot mongo" /> MongoDB</span>
            <span><b className="pill-dot express" /> Express.js</span>
            <span><b className="pill-dot react" /> React 18</span>
            <span><b className="pill-dot node" /> Node.js</span>
            <span><b className="pill-dot" style={{ background: "#8b7cff" }} /> OpenRouter</span>
            <span><b className="pill-dot" style={{ background: "#53d7f4" }} /> OpenAPI 3.1</span>
          </div>
        </div>

        {/* ─── Interactive Architecture Preview (Hero Centerpiece) ─────────── */}
        <div className="landing-preview-wrapper" id="preview">
          <div className="landing-preview-card">
            <div className="preview-card-header">
              <div className="preview-meta">
                <span className="preview-dot green" />
                <span className="preview-dot yellow" />
                <span className="preview-dot red" />
                <span className="preview-title">{currentDemo.name} Blueprint</span>
                <span className="status-pill ok">
                  <ShieldCheck size={11} /> 6/6 CHECKS PASS
                </span>
              </div>

              {/* Demo Preset Selector */}
              <div className="preview-preset-chips">
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}>Presets:</span>
                {DEMO_PROJECTS.map(d => (
                  <button
                    key={d.id}
                    className={`preview-preset-btn ${selectedDemoId === d.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedDemoId(d.id);
                      setSelectedNodeId("gateway");
                    }}
                    title={`Switch preview to ${d.name}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Section Tabs */}
            <div className="preview-card-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activePreviewTab === "architecture"}
                className={`preview-tab ${activePreviewTab === "architecture" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("architecture")}
              >
                <Workflow size={13} /> Architecture Flow
              </button>
              <button
                role="tab"
                aria-selected={activePreviewTab === "database"}
                className={`preview-tab ${activePreviewTab === "database" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("database")}
              >
                <Database size={13} /> MongoDB Models ({currentDemo.fixture.database?.tables?.length || 0})
              </button>
              <button
                role="tab"
                aria-selected={activePreviewTab === "apis"}
                className={`preview-tab ${activePreviewTab === "apis" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("apis")}
              >
                <Boxes size={13} /> REST Contracts ({currentDemo.fixture.apis?.length || 0})
              </button>
              <button
                role="tab"
                aria-selected={activePreviewTab === "scaffold"}
                className={`preview-tab ${activePreviewTab === "scaffold" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("scaffold")}
              >
                <Code2 size={13} /> MERN Scaffold ({currentDemo.fixture.scaffold?.length || 0})
              </button>
            </div>

            {/* Preview Card Body */}
            <div className="preview-card-body">
              {activePreviewTab === "architecture" && (
                <div className="preview-arch-canvas">
                  {/* Left: Interactive Node Graph with animated data packets */}
                  <div className="preview-arch-flow">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        CLICK A NODE TO INSPECT COMPONENT
                      </span>
                      <button
                        className="control-btn"
                        onClick={() => setSimulatingPacket(!simulatingPacket)}
                        title="Toggle data packet motion"
                        style={{ fontSize: 10, padding: "2px 7px" }}
                      >
                        <Radio size={11} color={simulatingPacket ? "var(--accent-cyan)" : "var(--text-muted)"} />
                        {simulatingPacket ? "Data Flow: Active" : "Data Flow: Paused"}
                      </button>
                    </div>

                    <div className="preview-flow-row">
                      {previewNodes.slice(0, 2).map((node, i) => (
                        <div
                          key={node.id || i}
                          className={`interactive-node-card ${selectedNodeId === node.id ? "selected" : ""} ${simulatingPacket ? "active-pulse" : ""}`}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          <span className="node-type-label">{node.type || "COMPONENT"}</span>
                          <h4 className="node-title">{node.label || node.name}</h4>
                          <span className="node-subtext">{node.tech || "Service Worker"}</span>
                        </div>
                      ))}
                    </div>

                    {/* Edge Connector */}
                    <div className="arch-flow-edge">
                      <div className="edge-line-glow">
                        {simulatingPacket && <div className="packet-dot" />}
                      </div>
                      <span>HTTPS / REST · JWT Auth</span>
                      <div className="edge-line-glow">
                        {simulatingPacket && <div className="packet-dot" style={{ animationDelay: "1.2s" }} />}
                      </div>
                    </div>

                    <div className="preview-flow-row">
                      {previewNodes.slice(2, 4).map((node, i) => (
                        <div
                          key={node.id || i}
                          className={`interactive-node-card ${selectedNodeId === node.id ? "selected" : ""}`}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          <span className="node-type-label">{node.type || "DATA LAYER"}</span>
                          <h4 className="node-title">{node.label || node.name}</h4>
                          <span className="node-subtext">{node.tech || "Storage Cluster"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Component Inspector */}
                  <div className="preview-node-inspector">
                    <div className="inspector-head">
                      <div>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          SELECTED COMPONENT
                        </span>
                        <h4 className="inspector-title">{activeNode.label || activeNode.name}</h4>
                      </div>
                      <span className="inspector-badge">{activeNode.type || "SERVICE"}</span>
                    </div>

                    <div className="inspector-field">
                      <label>Responsibilities</label>
                      <p>{activeNode.description || "Handles ingress traffic, request validation, and domain state."}</p>
                    </div>

                    <div className="inspector-field">
                      <label>Runtime Technology</label>
                      <code>{activeNode.tech || "Node.js 20 · Express · Mongoose"}</code>
                    </div>

                    <div className="inspector-field">
                      <label>Security Boundary</label>
                      <p>Authenticated via Bearer JWT, CORS restricted, rate-limited at 100 req/min.</p>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "database" && (
                <div className="schema-grid">
                  {(currentDemo.fixture.database?.tables || []).slice(0, 3).map((table, i) => (
                    <div className="schema-card" key={table.name || i}>
                      <div className="schema-card-head">
                        <div className="collection-icon"><Database size={14} /></div>
                        <h3>{table.name}</h3>
                        <span className="collection-index">{(table.columns || []).length} fields</span>
                      </div>
                      <div>
                        {(table.columns || []).slice(0, 4).map((col, j) => (
                          <div className="column-row" key={j}>
                            <span className="field-name">{col.name}</span>
                            {col.primaryKey && <span className="key-mark">PK</span>}
                            {col.foreignKey && <span className="tag">FK ➔ {col.references || "Ref"}</span>}
                            <span className="field-type">{col.type || "String"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activePreviewTab === "apis" && (
                <div className="api-list">
                  {(currentDemo.fixture.apis || []).slice(0, 3).map((api, i) => (
                    <div className="api-card" key={i}>
                      <div className="api-card-top">
                        <div className="api-route">
                          <span className={`method method-${(api.method || "GET").toLowerCase()}`}>{api.method}</span>
                          <code>{api.path}</code>
                        </div>
                        <span className="status-codes">Status: {(api.statusCodes || ["200 OK"]).join(", ")}</span>
                      </div>
                      <p>{api.description || "Handles idempotent transaction processing."}</p>
                    </div>
                  ))}
                </div>
              )}

              {activePreviewTab === "scaffold" && (
                <div className="bento-mini-preview" style={{ maxHeight: 220, overflow: "auto" }}>
                  <div style={{ color: "var(--accent-violet)", marginBottom: 8 }}>📁 Project Starter Architecture:</div>
                  {(currentDemo.fixture.scaffold || []).slice(0, 6).map((file, i) => (
                    <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <code>📄 {file.path}</code>
                      <span style={{ float: "right", color: "var(--text-muted)", fontSize: 10 }}>MERN Ready</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Card Footer */}
            <div className="preview-card-footer">
              <span>Try clicking the tabs or open the complete live demo workspace:</span>
              <button
                className="preview-footer-btn"
                onClick={() => onExploreDemo(currentDemo.id)}
              >
                Launch Full {currentDemo.name} Blueprint <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section C: Product Capability Strip ─────────────────────────────── */}
      <section className="capability-strip" aria-label="Core Capabilities">
        <div className="capability-strip-inner">
          <div className="capability-item">
            <span className="capability-icon"><Workflow size={16} /></span>
            <span>System Topologies</span>
          </div>
          <div className="capability-item">
            <span className="capability-icon"><Database size={16} /></span>
            <span>MongoDB Models</span>
          </div>
          <div className="capability-item">
            <span className="capability-icon"><Boxes size={16} /></span>
            <span>REST API Contracts</span>
          </div>
          <div className="capability-item">
            <span className="capability-icon"><Users size={16} /></span>
            <span>Roles & RBAC</span>
          </div>
          <div className="capability-item">
            <span className="capability-icon"><Layers3 size={16} /></span>
            <span>State Workflows</span>
          </div>
          <div className="capability-item">
            <span className="capability-icon"><Code2 size={16} /></span>
            <span>MERN Starters</span>
          </div>
        </div>
      </section>

      {/* ─── Section D: Interactive Prebuilt Demo Gallery ───────────────────── */}
      <section className="landing-section" id="examples">
        <div className="section-header-centered">
          <span className="section-kicker">BUNDLED FIXTURES · ZERO AI CALLS</span>
          <h2>Explore production blueprints across diverse domains</h2>
          <p>
            Browse real system designs with zero AI API costs or latency.
            Inspect topology diagrams, document schemas, and REST endpoints directly.
          </p>
        </div>

        <div className="demo-cards-grid">
          {DEMO_PROJECTS.map((demo) => {
            const nodeCount = demo.fixture.architecture?.nodes?.length || 4;
            const collectionCount = demo.fixture.database?.tables?.length || 3;
            const endpointCount = demo.fixture.apis?.length || 6;
            const fileCount = demo.fixture.scaffold?.length || 6;

            return (
              <div
                className="demo-card"
                key={demo.id}
                style={{ borderTop: `3px solid ${demo.color}` }}
              >
                <div className="demo-card-head">
                  <span className="demo-icon-bubble">{demo.icon}</span>
                  <div>
                    <h3>{demo.name}</h3>
                    <span className="demo-domain-tag">{demo.domain}</span>
                  </div>
                </div>

                <p className="demo-card-tagline">{demo.tagline}</p>
                <p className="demo-card-desc">{demo.description}</p>

                <div className="demo-stats-strip">
                  <div>
                    <strong>{nodeCount}</strong>
                    <span>Nodes</span>
                  </div>
                  <div>
                    <strong>{collectionCount}</strong>
                    <span>Models</span>
                  </div>
                  <div>
                    <strong>{endpointCount}</strong>
                    <span>APIs</span>
                  </div>
                  <div>
                    <strong>{fileCount}</strong>
                    <span>Files</span>
                  </div>
                </div>

                <div className="demo-card-actions">
                  <button
                    className="primary-button full-width"
                    onClick={() => onExploreDemo(demo.id)}
                  >
                    Explore Blueprint <ArrowRight size={13} />
                  </button>
                  {onUseAsTemplate && (
                    <button
                      className="secondary-button full-width"
                      onClick={() => onUseAsTemplate(demo)}
                      title="Copy specification to build your own version"
                    >
                      Use as Starting Point
                    </button>
                  )}
                </div>

                <div className="demo-zero-ai-note">
                  <ShieldCheck size={12} /> Static Fixture · 0 AI Requests
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section E: 4-Step Animated Pipeline ("How It Works") ───────────── */}
      <section className="landing-section" id="how-it-works">
        <div className="section-header-centered">
          <span className="section-kicker">ENGINEERING WORKFLOW</span>
          <h2>From concept to verifiable architecture in 4 steps</h2>
          <p>A structured pipeline that turns natural language into production specifications.</p>
        </div>

        <div className="steps-pipeline-grid">
          {steps.map((step, idx) => (
            <div
              className="step-card"
              key={idx}
              onClick={() => setActiveStep(idx)}
              style={{
                borderColor: activeStep === idx ? "var(--accent-violet)" : undefined,
                cursor: "pointer"
              }}
            >
              <div className="step-num">
                <span>{step.num}</span>
                <span className="status-pill info" style={{ fontSize: 9 }}>{step.artifact}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {step.details}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Section F: Feature Bento Grid ─────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="section-header-centered">
          <span className="section-kicker">THE FULL SPECIFICATION SUITE</span>
          <h2>Everything needed to plan serious applications</h2>
          <p>Precision developer artifacts designed for technical founders and engineering leads.</p>
        </div>

        <div className="features-bento-grid">
          <div className="bento-item span-2">
            <div className="bento-icon"><Workflow size={20} /></div>
            <h3>Deterministic System Topologies</h3>
            <p>
              Automated Mermaid.js architecture diagrams showing client apps, API gateways, microservices, caches, and database tiers with verified connection semantics.
            </p>
            <div className="bento-mini-preview">
              <code>flowchart LR: Client[React SPA] ➔ Gateway[Express API] ➔ Storage[(MongoDB)]</code>
            </div>
          </div>

          <div className="bento-item">
            <div className="bento-icon"><ShieldCheck size={20} /></div>
            <h3>Integrity Rule Checks</h3>
            <p>
              Automated client-side rule checks that flag orphaned nodes, missing foreign key targets, duplicate route signatures, and unauthenticated endpoints.
            </p>
            <div className="bento-mini-preview" style={{ color: "var(--status-success)" }}>
              ✓ 6/6 Architectural Integrity Checks Passing
            </div>
          </div>

          <div className="bento-item">
            <div className="bento-icon"><Database size={20} /></div>
            <h3>MongoDB Schema Design</h3>
            <p>
              Document models with primary keys, foreign key references, nullability constraints, and index recommendations.
            </p>
            <div className="bento-mini-preview">
              <code>Collection: User | Orders [1:N] | ObjectId refs</code>
            </div>
          </div>

          <div className="bento-item span-2">
            <div className="bento-icon"><Boxes size={20} /></div>
            <h3>REST Contracts & OpenAPI 3.1</h3>
            <p>
              Standardized HTTP methods, request bodies, expected responses, and status codes. One-click export to OpenAPI 3.1 for Postman and Swagger.
            </p>
            <div className="bento-mini-preview">
              <span className="method method-post" style={{ marginRight: 6 }}>POST</span>
              <code>/api/v1/orders ➔ 201 Created · Schema Verified</code>
            </div>
          </div>

          <div className="bento-item">
            <div className="bento-icon"><Code2 size={20} /></div>
            <h3>Downloadable MERN Starter</h3>
            <p>
              Generate a clean, modular repository with Express route handlers, Mongoose schemas, and client starter files in a downloadable ZIP.
            </p>
          </div>

          <div className="bento-item">
            <div className="bento-icon"><History size={20} /></div>
            <h3>Persistent Projects & Version Branches</h3>
            <p>
              Save blueprints to MongoDB, refine requirements over time, and maintain version history without overwriting previous designs.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section G: Engineering Workflow Preview ───────────────────────── */}
      <section className="landing-section">
        <div className="section-header-centered">
          <span className="section-kicker">CROSS-LAYER SPECIFICATION</span>
          <h2>How an idea transforms across technical layers</h2>
          <p>Every concept is systematically translated into coherent architecture, data models, and API endpoints.</p>
        </div>

        <div className="workflow-pipeline-view">
          <div className="workflow-row-item">
            <span className="workflow-layer-badge">01 · REQUIREMENT</span>
            <span className="workflow-layer-desc">"Customers can place idempotent orders and pay securely."</span>
            <span className="workflow-layer-status">Input Verified</span>
          </div>

          <div className="workflow-row-item">
            <span className="workflow-layer-badge">02 · TOPOLOGY</span>
            <span className="workflow-layer-desc">Gateway Router ➔ Orders Service ➔ Payment Gateway ➔ Database</span>
            <span className="workflow-layer-status">Diagram Ready</span>
          </div>

          <div className="workflow-row-item">
            <span className="workflow-layer-badge">03 · DATA MODEL</span>
            <span className="workflow-layer-desc">Order Schema (items, totalAmount, paymentStatus, sellerId)</span>
            <span className="workflow-layer-status">Indexes Assigned</span>
          </div>

          <div className="workflow-row-item">
            <span className="workflow-layer-badge">04 · REST CONTRACT</span>
            <span className="workflow-layer-desc">POST /api/v1/orders (Idempotency-Key header, payload validation)</span>
            <span className="workflow-layer-status">OpenAPI 3.1</span>
          </div>

          <div className="workflow-row-item">
            <span className="workflow-layer-badge">05 · SCAFFOLD TASK</span>
            <span className="workflow-layer-desc">Generate server/models/Order.js and server/routes/orders.js</span>
            <span className="workflow-layer-status">ZIP Ready</span>
          </div>
        </div>
      </section>

      {/* ─── Section H: FAQ Accordion & Final CTA ───────────────────────────── */}
      <section className="landing-section" id="faq">
        <div className="section-header-centered">
          <span className="section-kicker">FREQUENTLY ASKED QUESTIONS</span>
          <h2>Technical clarity for developers</h2>
        </div>

        <div className="faq-accordion-wrap">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div className="faq-item" key={idx}>
                <button
                  className="faq-question-btn"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="faq-answer-content">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Final CTA Banner ────────────────────────────────────────────────── */}
      <section className="landing-final-cta">
        <div className="final-cta-card">
          <span className="brand-mark large"><Boxes size={24} /></span>
          <h2>Ready to architect your next software system?</h2>
          <p>
            Start with your own application specification or browse the four prebuilt interactive examples.
            No credit card or complex setup required.
          </p>
          <div className="final-cta-buttons">
            <button className="primary-button hero-cta" onClick={onStartBuilding}>
              Launch Workspace Now <ArrowRight size={15} />
            </button>
            <button className="secondary-button" onClick={() => scrollToSection("examples")}>
              Browse Example Demos
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-top">
          <div className="footer-col brand-col">
            <div className="brand">
              <span className="brand-mark small"><Boxes size={16} /></span>
              <span>InfraMind<span className="brand-period">.</span></span>
            </div>
            <p>AI-powered system architecture and application planning platform for modern engineering teams.</p>
            <div className="stack-badges">
              <span>Node.js</span>
              <span>MongoDB</span>
              <span>React</span>
              <span>OpenRouter</span>
            </div>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>How It Works</a>
            <a href="#examples" onClick={(e) => { e.preventDefault(); scrollToSection("examples"); }}>Example Projects</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>Features</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onStartBuilding(); }}>Workspace</a>
          </div>

          <div className="footer-col">
            <h4>Prebuilt Demos</h4>
            {DEMO_PROJECTS.map(d => (
              <a
                key={d.id}
                href={`#demo-${d.id}`}
                onClick={(e) => { e.preventDefault(); onExploreDemo(d.id); }}
              >
                {d.name} ({d.domain})
              </a>
            ))}
          </div>

          <div className="footer-col">
            <h4>Account & Security</h4>
            {user ? (
              <a href="#" onClick={(e) => { e.preventDefault(); onStartBuilding(); }}>Signed in as {user.displayName || user.email}</a>
            ) : (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenAuth("signin"); }}>Sign In</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenAuth("signup"); }}>Create Account</a>
              </>
            )}
            <span className="footer-muted">HttpOnly JWT Auth</span>
            <span className="footer-muted">Server-Side API Key Protection</span>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} InfraMind. Made for developers who think in systems.</span>
          <span className="footer-badge">AI-Generated Designs · Review Before Production</span>
        </div>
      </footer>
    </div>
  );
}
