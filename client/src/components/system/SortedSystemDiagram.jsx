import React, { useState, useMemo } from "react";
import {
  Globe, Server, Database, Sparkles, Cpu, ShieldCheck, ArrowRight,
  Layers, Lock, Zap, Clock, Key, CheckCircle2, ChevronRight,
  Code2, Users, HardDrive, Check, Play, RefreshCw, Radio, Workflow
} from "lucide-react";

// Blueprint-specific sorted flow definitions
const BLUEPRINT_FLOWS = {
  commerceflow: [
    {
      id: "checkout",
      name: "Customer Checkout Flow",
      icon: Zap,
      badge: "Idempotent Transaction",
      description: "Customer submits cart ➔ API Gateway validates JWT ➔ Order Service verifies stock ➔ Writes order in MongoDB & calls Stripe webhook",
      activeNodeIds: ["web_app", "api_gateway", "order_service", "mongodb", "payment_provider"],
      steps: [
        { label: "1. Storefront Cart Submission", node: "web_app", tier: "Client" },
        { label: "2. Gateway JWT & Rate Check", node: "api_gateway", tier: "Gateway" },
        { label: "3. Order State Machine Transition", node: "order_service", tier: "Service" },
        { label: "4. Atomic DB Write & Stripe Intent", node: "mongodb", tier: "Data & External" }
      ]
    },
    {
      id: "auth",
      name: "User Authentication Flow",
      icon: Key,
      badge: "Security Boundary",
      description: "User submits credentials ➔ Gateway routes request ➔ Auth Service hashes with bcrypt & queries MongoDB ➔ Issues signed HttpOnly JWT",
      activeNodeIds: ["web_app", "seller_portal", "api_gateway", "auth_service", "mongodb"],
      steps: [
        { label: "1. Login Request Submission", node: "web_app", tier: "Client" },
        { label: "2. Gateway Ingress Routing", node: "api_gateway", tier: "Gateway" },
        { label: "3. Bcrypt Password Verification", node: "auth_service", tier: "Service" },
        { label: "4. User Record & JWT Issuance", node: "mongodb", tier: "Data" }
      ]
    },
    {
      id: "catalog",
      name: "Product Catalog & Search",
      icon: Globe,
      badge: "Read Query",
      description: "Customer searches catalog ➔ Gateway validates query params ➔ Product Service reads indexed MongoDB collections ➔ Serves CDN image assets",
      activeNodeIds: ["web_app", "api_gateway", "product_service", "mongodb", "object_storage"],
      steps: [
        { label: "1. Search & Filter Input", node: "web_app", tier: "Client" },
        { label: "2. Gateway Request Proxy", node: "api_gateway", tier: "Gateway" },
        { label: "3. Category Taxonomy & Query", node: "product_service", tier: "Service" },
        { label: "4. Indexed Read & S3 CDN", node: "mongodb", tier: "Data & Storage" }
      ]
    },
    {
      id: "all",
      name: "Full Architecture Map",
      icon: Workflow,
      badge: "Complete Topology",
      description: "High-level sorted overview of all client apps, Express gateway, domain services, MongoDB data tier, and payment providers.",
      activeNodeIds: ["web_app", "seller_portal", "admin_panel", "api_gateway", "order_service", "product_service", "auth_service", "inventory_service", "mongodb", "payment_provider", "object_storage"],
      steps: []
    }
  ],
  slotwise: [
    {
      id: "booking",
      name: "Conflict-Free Slot Booking",
      icon: Zap,
      badge: "Atomic Reservation",
      description: "Client selects slot ➔ Gateway authorizes session ➔ Booking Service sets 10-minute hold lock ➔ Captures payment & writes to MongoDB",
      activeNodeIds: ["customer_app", "api_gateway", "booking_service", "mongodb", "payment_provider"],
      steps: [
        { label: "1. Slot Selection on Calendar", node: "customer_app", tier: "Client" },
        { label: "2. Gateway Session Check", node: "api_gateway", tier: "Gateway" },
        { label: "3. 10-Min Atomic TTL Hold", node: "booking_service", tier: "Service" },
        { label: "4. Confirmed Booking in DB", node: "mongodb", tier: "Data" }
      ]
    },
    {
      id: "availability",
      name: "Dynamic Availability Setup",
      icon: Clock,
      badge: "Provider Engine",
      description: "Provider defines recurring weekly slots ➔ Availability Engine computes calendar rules without pre-generating bloated records",
      activeNodeIds: ["provider_dashboard", "api_gateway", "availability_service", "mongodb"],
      steps: [
        { label: "1. Weekly Schedule Config", node: "provider_dashboard", tier: "Client" },
        { label: "2. Gateway Auth Check", node: "api_gateway", tier: "Gateway" },
        { label: "3. Dynamic Rule Calculation", node: "availability_service", tier: "Service" },
        { label: "4. Store Provider Schedule", node: "mongodb", tier: "Data" }
      ]
    },
    {
      id: "all",
      name: "Full Architecture Map",
      icon: Workflow,
      badge: "Complete Topology",
      description: "Appointment booking architecture with atomic slot locking, dynamic availability generation, and payment escrow.",
      activeNodeIds: ["customer_app", "provider_dashboard", "admin_panel", "api_gateway", "booking_service", "availability_service", "auth_service", "notification_service", "mongodb", "payment_provider"],
      steps: []
    }
  ],
  learnsphere: [
    {
      id: "course_flow",
      name: "Course Progress & Quiz Flow",
      icon: Zap,
      badge: "Auto-Grading State",
      description: "Student submits quiz answers ➔ Gateway routes payload ➔ Assessment Engine auto-grades results ➔ Idempotent certificate issuance",
      activeNodeIds: ["student_portal", "api_gateway", "assessment_service", "certificate_service", "mongodb"],
      steps: [
        { label: "1. Quiz Submission", node: "student_portal", tier: "Client" },
        { label: "2. Gateway Validation", node: "api_gateway", tier: "Gateway" },
        { label: "3. Auto-Grading Engine", node: "assessment_service", tier: "Service" },
        { label: "4. Record Grade & Certificate", node: "mongodb", tier: "Data" }
      ]
    },
    {
      id: "all",
      name: "Full Architecture Map",
      icon: Workflow,
      badge: "Complete Topology",
      description: "LMS architecture with protected video streaming, quiz scoring state machines, and certificate generation.",
      activeNodeIds: ["student_portal", "instructor_studio", "admin_console", "api_gateway", "course_service", "assessment_service", "certificate_service", "auth_service", "mongodb", "video_cdn", "payment_provider"],
      steps: []
    }
  ],
  pulseboard: [
    {
      id: "task_flow",
      name: "Kanban Task State Transition",
      icon: Zap,
      badge: "Multi-Tenant Scoped",
      description: "User drags task across board ➔ Gateway asserts tenantId scope ➔ Task Service executes transition & logs audit trail in MongoDB",
      activeNodeIds: ["web_client", "api_gateway", "board_service", "mongodb"],
      steps: [
        { label: "1. Drag-and-Drop Event", node: "web_client", tier: "Client" },
        { label: "2. Tenant Context Assertion", node: "api_gateway", tier: "Gateway" },
        { label: "3. State Transition Validation", node: "board_service", tier: "Service" },
        { label: "4. Scoped DB Mutation & Audit", node: "mongodb", tier: "Data" }
      ]
    },
    {
      id: "all",
      name: "Full Architecture Map",
      icon: Workflow,
      badge: "Complete Topology",
      description: "Multi-tenant project management SaaS with strict organization data isolation and role-based permissions.",
      activeNodeIds: ["web_client", "admin_portal", "api_gateway", "board_service", "tenant_service", "notification_service", "auth_service", "mongodb", "webhook_dispatcher"],
      steps: []
    }
  ]
};

// Node classification helper into 4 sorted tiers
function sortNodesIntoTiers(components = []) {
  const tiers = {
    clients: [],
    gateway: [],
    services: [],
    data: []
  };

  components.forEach((c) => {
    const type = (c.componentType || c.type || "").toLowerCase();
    const label = (c.label || c.name || "").toLowerCase();
    const tier = (c.tier || "").toLowerCase();

    if (tier === "frontend" || type.includes("front") || type.includes("client") || label.includes("app") || label.includes("portal") || label.includes("storefront") || label.includes("dashboard")) {
      tiers.clients.push(c);
    } else if (type.includes("gateway") || label.includes("gateway") || type.includes("ingress")) {
      tiers.gateway.push(c);
    } else if (tier === "database" || tier === "external" || type.includes("data") || type.includes("db") || type.includes("mongo") || type.includes("stripe") || type.includes("cdn") || type.includes("storage") || type.includes("external")) {
      tiers.data.push(c);
    } else {
      tiers.services.push(c);
    }
  });

  return tiers;
}

export default function SortedSystemDiagram({
  canonicalModel = {},
  selectedDemoId = "commerceflow",
  currentDemo = {},
  onSelectNode = () => {},
  selectedNodeId = null,
  onOpenIde = () => {}
}) {
  const flows = useMemo(() => {
    return BLUEPRINT_FLOWS[selectedDemoId] || BLUEPRINT_FLOWS.commerceflow;
  }, [selectedDemoId]);

  const [activeFlowId, setActiveFlowId] = useState(flows[0]?.id || "checkout");
  const currentFlow = useMemo(() => {
    return flows.find((f) => f.id === activeFlowId) || flows[0];
  }, [flows, activeFlowId]);

  const components = useMemo(() => {
    return Array.isArray(canonicalModel.components) && canonicalModel.components.length > 0
      ? canonicalModel.components
      : [];
  }, [canonicalModel]);

  const sortedTiers = useMemo(() => {
    return sortNodesIntoTiers(components);
  }, [components]);

  // Find currently active / highlighted node
  const activeNode = useMemo(() => {
    if (selectedNodeId) {
      return components.find((c) => c.id === selectedNodeId) || components[0] || null;
    }
    const gateway = sortedTiers.gateway[0];
    if (gateway) return gateway;
    return sortedTiers.services[0] || components[0] || null;
  }, [selectedNodeId, components, sortedTiers]);

  // Node is part of current flow?
  function isNodeInFlow(nodeId) {
    if (!currentFlow || currentFlow.id === "all") return true;
    return currentFlow.activeNodeIds?.includes(nodeId);
  }

  // Tier accent color helper
  function getTierColor(tierKey) {
    switch (tierKey) {
      case "clients": return { text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)", bg: "rgba(56, 189, 248, 0.08)", icon: Globe };
      case "gateway": return { text: "#8b7cff", border: "rgba(139, 124, 255, 0.5)", bg: "rgba(139, 124, 255, 0.12)", icon: ShieldCheck };
      case "services": return { text: "#c084fc", border: "rgba(192, 132, 252, 0.4)", bg: "rgba(192, 132, 252, 0.08)", icon: Cpu };
      case "data": return { text: "#34d399", border: "rgba(52, 211, 153, 0.4)", bg: "rgba(52, 211, 153, 0.08)", icon: Database };
      default: return { text: "#94a3b8", border: "rgba(255, 255, 255, 0.1)", bg: "rgba(255, 255, 255, 0.04)", icon: Layers };
    }
  }

  return (
    <div className="sorted-diagram-container" style={{ width: "100%", display: "flex", flexDirection: "column", background: "#0a0c13" }}>
      {/* ─── 1. Flow Switcher Bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "rgba(14, 18, 28, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            SELECT FLOW:
          </span>
          {flows.map((flow) => {
            const Icon = flow.icon || Zap;
            const isActive = flow.id === activeFlowId;
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => setActiveFlowId(flow.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "rgba(139, 124, 255, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  border: isActive ? "1px solid rgba(139, 124, 255, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={13} style={{ color: isActive ? "var(--ide-accent, #8b7cff)" : "#64748b" }} />
                <span>{flow.name}</span>
                {isActive && flow.badge && (
                  <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: "rgba(139, 124, 255, 0.3)", color: "#e2d9ff" }}>
                    {flow.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Flow Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#34d399" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", display: "inline-block" }} />
          <span>Active Request Tracing</span>
        </div>
      </div>

      {/* ─── 2. Flow Step Journey Breadcrumb ─────────────────────────────────── */}
      {currentFlow.steps && currentFlow.steps.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "9px 20px",
            background: "rgba(10, 14, 22, 0.8)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            fontSize: 11.5,
            color: "#cbd5e1",
            gap: 10,
            overflowX: "auto",
            whiteSpace: "nowrap"
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", textTransform: "uppercase" }}>
            TRANSACTION JOURNEY:
          </span>
          {currentFlow.steps.map((st, i) => (
            <React.Fragment key={i}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", background: "rgba(255, 255, 255, 0.04)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.07)" }}>
                <span style={{ color: "#38bdf8", fontWeight: 600 }}>{st.label}</span>
                <span style={{ fontSize: 9.5, color: "#64748b" }}>({st.tier})</span>
              </span>
              {i < currentFlow.steps.length - 1 && (
                <ChevronRight size={12} style={{ color: "#64748b", flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ─── 3. Main Sorted Swimlanes Diagram Canvas ─────────────────────────── */}
      <div
        style={{
          position: "relative",
          minHeight: 460,
          padding: "24px 20px 28px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1.3fr 1.1fr",
          gap: 20,
          background: "radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 22px 22px, #090c13",
          overflowX: "auto"
        }}
      >
        {/* Connection Pulse Overlay Lines (SVG) */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1
          }}
        >
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#8b7cff" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Clean Horizontal Cross-Tier Flow Buses */}
          <path
            d="M 230 140 C 270 140, 290 170, 340 170"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
            filter="url(#glow)"
            style={{ animation: "dashMove 20s linear infinite" }}
          />
          <path
            d="M 520 170 C 560 170, 580 140, 620 140"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
            filter="url(#glow)"
            style={{ animation: "dashMove 20s linear infinite" }}
          />
          <path
            d="M 520 170 C 560 170, 580 250, 620 250"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
            filter="url(#glow)"
            style={{ animation: "dashMove 20s linear infinite" }}
          />
          <path
            d="M 820 140 C 860 140, 880 150, 920 150"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
            filter="url(#glow)"
            style={{ animation: "dashMove 20s linear infinite" }}
          />
          <path
            d="M 820 140 C 860 140, 880 260, 920 260"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
            filter="url(#glow)"
            style={{ animation: "dashMove 20s linear infinite" }}
          />
        </svg>

        {/* ── Column 1: Clients & UI Tier ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(56, 189, 248, 0.2)", paddingBottom: 6 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                01 · CLIENT TIER
              </span>
              <h4 style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                Frontends & Portals
              </h4>
            </div>
            <Globe size={15} style={{ color: "#38bdf8" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedTiers.clients.map((comp) => {
              const inFlow = isNodeInFlow(comp.id);
              const isSelected = activeNode?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectNode(comp)}
                  style={{
                    background: isSelected ? "rgba(56, 189, 248, 0.14)" : (inFlow ? "rgba(18, 24, 38, 0.9)" : "rgba(18, 24, 38, 0.4)"),
                    border: isSelected ? "1.5px solid #38bdf8" : (inFlow ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)"),
                    boxShadow: isSelected ? "0 0 16px rgba(56, 189, 248, 0.25)" : (inFlow ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "none"),
                    borderRadius: 8,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    opacity: inFlow ? 1 : 0.45
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Globe size={14} style={{ color: "#38bdf8" }} />
                      <strong style={{ fontSize: 12.5, color: "#f8fafc" }}>{comp.label || comp.name}</strong>
                    </div>
                    <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: "rgba(56, 189, 248, 0.15)", color: "#7dd3fc", fontFamily: "monospace" }}>
                      CLIENT
                    </span>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#94a3b8", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {comp.description || "Consumer shopping and order tracking interface."}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#cbd5e1", background: "rgba(255, 255, 255, 0.05)", padding: "1px 6px", borderRadius: 3 }}>
                      React 18 · Vite
                    </span>
                    <span style={{ fontSize: 10, color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "1px 6px", borderRadius: 3 }}>
                      HTTPS REST
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Column 2: API Gateway Tier ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(139, 124, 255, 0.25)", paddingBottom: 6 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ide-accent, #8b7cff)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                02 · API GATEWAY
              </span>
              <h4 style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                Security &amp; Routing
              </h4>
            </div>
            <ShieldCheck size={15} style={{ color: "var(--ide-accent, #8b7cff)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", flex: 1 }}>
            {(sortedTiers.gateway.length > 0 ? sortedTiers.gateway : [{ id: "api_gateway", label: "API Gateway / Express", description: "Central Express server handling auth verification, rate limiting, and request validation." }]).map((comp) => {
              const inFlow = isNodeInFlow(comp.id);
              const isSelected = activeNode?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectNode(comp)}
                  style={{
                    background: isSelected ? "rgba(139, 124, 255, 0.18)" : (inFlow ? "rgba(22, 26, 42, 0.95)" : "rgba(22, 26, 42, 0.4)"),
                    border: isSelected ? "1.5px solid var(--ide-accent, #8b7cff)" : (inFlow ? "1px solid rgba(139, 124, 255, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)"),
                    boxShadow: isSelected ? "0 0 20px rgba(139, 124, 255, 0.35)" : (inFlow ? "0 4px 16px rgba(0, 0, 0, 0.4)" : "none"),
                    borderRadius: 8,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    opacity: inFlow ? 1 : 0.45
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Server size={15} style={{ color: "var(--ide-accent, #8b7cff)" }} />
                      <strong style={{ fontSize: 13, color: "#f8fafc" }}>{comp.label || comp.name}</strong>
                    </div>
                    <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "rgba(139, 124, 255, 0.2)", color: "#c4b8ff", fontFamily: "monospace" }}>
                      PORT 5000
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>
                    {comp.description || "Validates bearer tokens, applies rate limits, and routes to microservices."}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "#c4b8ff", background: "rgba(139, 124, 255, 0.1)", padding: "2px 6px", borderRadius: 3, textAlign: "center" }}>
                      JWT Guard
                    </span>
                    <span style={{ fontSize: 10, color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "2px 6px", borderRadius: 3, textAlign: "center" }}>
                      OpenAPI 3.1
                    </span>
                    <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", padding: "2px 6px", borderRadius: 3, textAlign: "center" }}>
                      100 req/min
                    </span>
                    <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251, 191, 36, 0.1)", padding: "2px 6px", borderRadius: 3, textAlign: "center" }}>
                      Zero CORS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Column 3: Domain Microservices ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(192, 132, 252, 0.25)", paddingBottom: 6 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#c084fc", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                03 · DOMAIN SERVICES
              </span>
              <h4 style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                Business State Machines
              </h4>
            </div>
            <Cpu size={15} style={{ color: "#c084fc" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedTiers.services.map((comp) => {
              const inFlow = isNodeInFlow(comp.id);
              const isSelected = activeNode?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectNode(comp)}
                  style={{
                    background: isSelected ? "rgba(192, 132, 252, 0.15)" : (inFlow ? "rgba(24, 20, 36, 0.9)" : "rgba(24, 20, 36, 0.4)"),
                    border: isSelected ? "1.5px solid #c084fc" : (inFlow ? "1px solid rgba(192, 132, 252, 0.45)" : "1px solid rgba(255, 255, 255, 0.06)"),
                    boxShadow: isSelected ? "0 0 16px rgba(192, 132, 252, 0.3)" : (inFlow ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "none"),
                    borderRadius: 8,
                    padding: "11px 13px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    opacity: inFlow ? 1 : 0.45
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Cpu size={13} style={{ color: "#c084fc" }} />
                      <strong style={{ fontSize: 12.5, color: "#f8fafc" }}>{comp.label || comp.name}</strong>
                    </div>
                    <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: "rgba(192, 132, 252, 0.15)", color: "#e9d5ff", fontFamily: "monospace" }}>
                      SERVICE
                    </span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "#94a3b8", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {comp.description || "Encapsulates transactional boundaries and model persistence."}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9.5, color: "#cbd5e1", background: "rgba(255, 255, 255, 0.05)", padding: "1px 5px", borderRadius: 3 }}>
                      Express Router
                    </span>
                    <span style={{ fontSize: 9.5, color: "#c084fc", background: "rgba(192, 132, 252, 0.1)", padding: "1px 5px", borderRadius: 3 }}>
                      Mongoose Schema
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Column 4: Persistence & External Tier ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(52, 211, 153, 0.25)", paddingBottom: 6 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                04 · PERSISTENCE &amp; APIS
              </span>
              <h4 style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                Databases &amp; Gateways
              </h4>
            </div>
            <Database size={15} style={{ color: "#34d399" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedTiers.data.map((comp) => {
              const inFlow = isNodeInFlow(comp.id);
              const isSelected = activeNode?.id === comp.id;
              const isDatabase = (comp.tier || "").toLowerCase() === "database" || (comp.type || "").toLowerCase().includes("data");
              const themeColor = isDatabase ? "#34d399" : "#fbbf24";

              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectNode(comp)}
                  style={{
                    background: isSelected ? (isDatabase ? "rgba(52, 211, 153, 0.15)" : "rgba(251, 191, 36, 0.15)") : (inFlow ? "rgba(18, 30, 26, 0.9)" : "rgba(18, 30, 26, 0.4)"),
                    border: isSelected ? `1.5px solid ${themeColor}` : (inFlow ? `1px solid ${isDatabase ? "rgba(52, 211, 153, 0.45)" : "rgba(251, 191, 36, 0.45)"}` : "1px solid rgba(255, 255, 255, 0.06)"),
                    boxShadow: isSelected ? `0 0 16px ${isDatabase ? "rgba(52, 211, 153, 0.3)" : "rgba(251, 191, 36, 0.3)"}` : (inFlow ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "none"),
                    borderRadius: 8,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    opacity: inFlow ? 1 : 0.45
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {isDatabase ? <Database size={14} style={{ color: "#34d399" }} /> : <Zap size={14} style={{ color: "#fbbf24" }} />}
                      <strong style={{ fontSize: 12.5, color: "#f8fafc" }}>{comp.label || comp.name}</strong>
                    </div>
                    <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: isDatabase ? "rgba(52, 211, 153, 0.15)" : "rgba(251, 191, 36, 0.15)", color: themeColor, fontFamily: "monospace" }}>
                      {isDatabase ? "DB 7.0" : "EXTERNAL"}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "#94a3b8", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {comp.description || "Primary persistence store with indexes and foreign key references."}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9.5, color: themeColor, background: isDatabase ? "rgba(52, 211, 153, 0.1)" : "rgba(251, 191, 36, 0.1)", padding: "1px 6px", borderRadius: 3 }}>
                      {isDatabase ? "Wire Protocol · Mongoose" : "Webhook Verified"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 4. Full-Width Bottom Inspector Dock (Spacious, No Horizontal Squish) ─ */}
      <div
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(14, 18, 28, 0.98)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 280, flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "rgba(139, 124, 255, 0.15)",
              border: "1px solid rgba(139, 124, 255, 0.3)",
              color: "var(--ide-accent, #8b7cff)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0
            }}
          >
            <Cpu size={20} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <strong style={{ fontSize: 15, color: "#f8fafc" }}>
                {activeNode?.label || activeNode?.name || "Component"}
              </strong>
              <span style={{ fontSize: 11, color: "var(--ide-cyan, #38bdf8)", fontFamily: "monospace", background: "rgba(56, 189, 248, 0.1)", padding: "1px 6px", borderRadius: 3 }}>
                {activeNode?.technology || "Node.js 20 · Express"}
              </span>
              <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", padding: "1px 6px", borderRadius: 3 }}>
                ✓ Architecture Verified
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5, maxWidth: 650 }}>
              {activeNode?.description || "Coordinates domain workflows and enforces security boundaries across connected tiers."}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="primary-button"
          onClick={onOpenIde}
          style={{
            height: 36,
            padding: "0 18px",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            flexShrink: 0
          }}
        >
          Open {currentDemo.name || "System"} in IDE <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
