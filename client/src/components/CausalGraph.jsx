import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Filter,
  Layers, Cpu, Database, Zap, Workflow, CheckSquare, Users,
  Maximize2, Crosshair, AlertTriangle, Info, Table, LayoutGrid, ChevronDown, Check,
  Globe, ArrowRight, Sparkles, PlayCircle, ShieldCheck, Activity, CheckCircle2, Shield
} from "lucide-react";
import { buildGraphIndex, inspectNodeNeighborhood } from "../lib/graphAnalysis.js";

const TYPE_CONFIG = {
  requirement: { bg: "rgba(167, 139, 250, 0.12)", border: "var(--cat-requirement)", text: "#ddd6fe", dot: "var(--cat-requirement)", icon: Layers, label: "Requirement" },
  actor: { bg: "rgba(251, 191, 36, 0.12)", border: "var(--cat-actor)", text: "#fef3c7", dot: "var(--cat-actor)", icon: Users, label: "Actor / Role" },
  component: { bg: "rgba(56, 189, 248, 0.12)", border: "var(--cat-component)", text: "#e0f2fe", dot: "var(--cat-component)", icon: Cpu, label: "Component" },
  entity: { bg: "rgba(52, 211, 153, 0.12)", border: "var(--cat-entity)", text: "#d1fae5", dot: "var(--cat-entity)", icon: Database, label: "Entity" },
  api: { bg: "rgba(96, 165, 250, 0.12)", border: "var(--cat-api)", text: "#dbeafe", dot: "var(--cat-api)", icon: Zap, label: "API" },
  workflow: { bg: "rgba(249, 115, 22, 0.12)", border: "var(--cat-workflow)", text: "#ffedd5", dot: "var(--cat-workflow)", icon: Workflow, label: "Workflow" },
  test: { bg: "rgba(45, 212, 191, 0.12)", border: "var(--cat-test)", text: "#ccfbf1", dot: "var(--cat-test)", icon: CheckSquare, label: "Verification" }
};

// ─── Animated SVG Horizontal Flow Rail Between Stages ────────────────────────
function StageConnector({ label }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: 58,
      flexShrink: 0,
      alignSelf: "center",
      padding: "0 2px",
      gap: 5
    }}>
      <div style={{ width: "100%", height: 20, position: "relative" }}>
        <svg width="100%" height="20" style={{ overflow: "visible" }}>
          <defs>
            <marker id="pipe-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#53d7f4" />
            </marker>
          </defs>
          <path
            d="M 2 10 L 46 10"
            fill="none"
            stroke="rgba(83, 215, 244, 0.45)"
            strokeWidth={2}
            strokeDasharray="5 4"
            className="flow-marching-ants"
            markerEnd="url(#pipe-arrow)"
          />
          <circle r="3.5" fill="#53d7f4" filter="drop-shadow(0 0 4px #53d7f4)">
            <animateMotion path="M 2 10 L 46 10" dur="1.3s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill="#ffffff">
            <animateMotion path="M 2 10 L 46 10" dur="1.3s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 750, color: "var(--ide-text-dim)", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap" }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Interactive Animated Flowchart Pipeline View ────────────────────────────
function FlowchartPipelineView({
  canonicalModel,
  graph,
  selectedRoleId,
  setSelectedRoleId,
  selectedNodeId,
  setSelectedNodeId,
  roleJourneyData,
  onSelectForImpact
}) {
  const actors = canonicalModel?.actors || [];
  const components = canonicalModel?.components || [];
  const apis = canonicalModel?.apis || [];
  const entities = canonicalModel?.entities || [];
  const workflows = canonicalModel?.workflows || [];
  const tests = canonicalModel?.tests || [];

  const frontendComponents = components.filter(c => {
    const t = (c.type || "").toLowerCase();
    const l = (c.label || "").toLowerCase();
    return t.includes("front") || t.includes("client") || t.includes("ui") || l.includes("interface") || l.includes("ui");
  });
  const backendComponents = components.filter(c => !frontendComponents.includes(c));

  const activeIds = roleJourneyData ? roleJourneyData.connectedIds : null;

  return (
    <div style={{
      flex: 1,
      width: "100%",
      height: "100%",
      overflowX: "auto",
      overflowY: "auto",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      background: "radial-gradient(ellipse at top, #111522 0%, #07090e 100%)"
    }}>
      {/* Interactive Guidance Bar */}
      <div style={{
        padding: "8px 14px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 4,
            background: "rgba(83, 215, 244, 0.15)",
            color: "#53d7f4",
            border: "1px solid rgba(83, 215, 244, 0.3)"
          }}>
            <Sparkles size={11} className="pulse-anim" /> ANIMATED SYSTEM FLOWCHART
          </span>
          <span style={{ fontSize: 12, color: "var(--ide-text-secondary)" }}>
            Sequential execution pipeline from user action to data persistence & verification
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>
            {selectedRoleId ? "Active role path highlighted" : "Click any role or card to trace data flow"}
          </span>
        </div>
      </div>

      {/* 5-Stage Animated Horizontal Pipeline */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        minWidth: 1180,
        flex: 1
      }}>
        {/* ─── STAGE 1: ACTORS / ROLES ────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(251, 191, 36, 0.12)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={13} /> 1. ACTORS & ROLES
            </span>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({actors.length})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {actors.map(actor => {
              const isSelected = selectedRoleId === actor.id || selectedNodeId === actor.id;
              return (
                <div
                  key={actor.id}
                  onClick={() => {
                    setSelectedRoleId(selectedRoleId === actor.id ? null : actor.id);
                    setSelectedNodeId(selectedNodeId === actor.id ? null : actor.id);
                  }}
                  style={{
                    background: isSelected ? "rgba(251, 191, 36, 0.14)" : "#11141e",
                    border: `1px solid ${isSelected ? "#fbbf24" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 8,
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: isSelected ? "0 0 16px rgba(251, 191, 36, 0.25)" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "rgba(251, 191, 36, 0.15)",
                        color: "#fbbf24",
                        display: "grid",
                        placeItems: "center"
                      }}>
                        <Users size={15} />
                      </span>
                      <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{actor.name}</strong>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.2)", padding: "1px 5px", borderRadius: 3 }}>
                        TRACING
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ide-text-dim)", lineHeight: 1.4 }}>
                    {actor.description || "System actor interacting with UI services"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CONNECTOR 1 -> 2 ───────────────────────────────────────────── */}
        <StageConnector label="UI Action" />

        {/* ─── STAGE 2: CLIENT INTERFACE ──────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={13} /> 2. CLIENT UI
            </span>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({frontendComponents.length || 1})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {(frontendComponents.length > 0 ? frontendComponents : [{ id: "ui-default", label: "User Interface", description: "React 18 / Vite Client SPA" }]).map(cmp => {
              const isSelected = selectedNodeId === cmp.id;
              const isDimmed = activeIds && !activeIds.has(cmp.id);
              return (
                <div
                  key={cmp.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : cmp.id)}
                  style={{
                    background: isSelected ? "rgba(56, 189, 248, 0.14)" : "#11141e",
                    border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 8,
                    padding: "12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: isSelected ? "0 0 16px rgba(56, 189, 248, 0.25)" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      display: "grid",
                      placeItems: "center"
                    }}>
                      <Globe size={15} />
                    </span>
                    <div>
                      <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>{cmp.label}</strong>
                      <span style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>REACT 18 · SPA</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ide-text-dim)", lineHeight: 1.4 }}>
                    {cmp.description || "Captures user input and renders conversational responses"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CONNECTOR 2 -> 3 ───────────────────────────────────────────── */}
        <StageConnector label="REST Call" />

        {/* ─── STAGE 3: API CONTRACTS ─────────────────────────────────────── */}
        <div style={{ flex: 1.2, minWidth: 230, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(96, 165, 250, 0.12)",
            border: "1px solid rgba(96, 165, 250, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa", display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={13} /> 3. REST APIS & ROUTES
            </span>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({apis.length})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {apis.map(api => {
              const isSelected = selectedNodeId === api.id;
              const isDimmed = activeIds && !activeIds.has(api.id);
              const isPost = (api.method || "").toUpperCase() === "POST";
              return (
                <div
                  key={api.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : api.id)}
                  style={{
                    background: isSelected ? "rgba(96, 165, 250, 0.14)" : "#11141e",
                    border: `1px solid ${isSelected ? "#60a5fa" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    boxShadow: isSelected ? "0 0 16px rgba(96, 165, 250, 0.25)" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: isPost ? "rgba(66, 214, 164, 0.18)" : "rgba(83, 215, 244, 0.18)",
                      color: isPost ? "#42d6a4" : "#53d7f4",
                      fontFamily: "var(--ide-font-mono)"
                    }}>
                      {api.method || "GET"}
                    </span>
                    <strong style={{ fontSize: 12, color: "#f3f5fa", fontFamily: "var(--ide-font-mono)" }}>
                      {api.path}
                    </strong>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>
                    {api.description || "Routed via Express controller"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CONNECTOR 3 -> 4 ───────────────────────────────────────────── */}
        <StageConnector label="Backend Logic" />

        {/* ─── STAGE 4: SERVICES & DATABASE ───────────────────────────────── */}
        <div style={{ flex: 1.2, minWidth: 230, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(167, 139, 250, 0.12)",
            border: "1px solid rgba(167, 139, 250, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={13} /> 4. SERVICES & MONGODB
            </span>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({backendComponents.length + entities.length})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {backendComponents.map(cmp => {
              const isSelected = selectedNodeId === cmp.id;
              const isDimmed = activeIds && !activeIds.has(cmp.id);
              const isDb = (cmp.type || "").toLowerCase().includes("data") || (cmp.label || "").toLowerCase().includes("store");
              const Icon = isDb ? Database : Cpu;
              const col = isDb ? "#42d6a4" : "#a78bfa";
              return (
                <div
                  key={cmp.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : cmp.id)}
                  style={{
                    background: isSelected ? `${col}18` : "#11141e",
                    border: `1px solid ${isSelected ? col : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    boxShadow: isSelected ? `0 0 16px ${col}44` : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      background: `${col}22`,
                      color: col,
                      display: "grid",
                      placeItems: "center"
                    }}>
                      <Icon size={13} />
                    </span>
                    <strong style={{ fontSize: 12, color: "#f3f5fa" }}>{cmp.label}</strong>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>
                    {cmp.description || (isDb ? "MongoDB collections & persistence" : "Core backend orchestration")}
                  </span>
                </div>
              );
            })}

            {/* Entity collections */}
            {entities.map(ent => {
              const isSelected = selectedNodeId === ent.id;
              const isDimmed = activeIds && !activeIds.has(ent.id);
              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : ent.id)}
                  style={{
                    background: isSelected ? "rgba(66, 214, 164, 0.15)" : "#0e131b",
                    border: `1px solid ${isSelected ? "#42d6a4" : "rgba(66, 214, 164, 0.25)"}`,
                    borderRadius: 8,
                    padding: "9px 12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Database size={13} style={{ color: "#42d6a4" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#d1fae5" }}>{ent.name}</span>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#42d6a4", background: "rgba(66,214,164,0.12)", padding: "1px 5px", borderRadius: 3 }}>
                    COLLECTION
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CONNECTOR 4 -> 5 ───────────────────────────────────────────── */}
        <StageConnector label="Workflow State" />

        {/* ─── STAGE 5: WORKFLOWS & TESTS ─────────────────────────────────── */}
        <div style={{ flex: 1.2, minWidth: 230, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(249, 115, 22, 0.12)",
            border: "1px solid rgba(249, 115, 22, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316", display: "flex", alignItems: "center", gap: 6 }}>
              <Workflow size={13} /> 5. WORKFLOWS & TESTS
            </span>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({workflows.length + tests.length})</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {workflows.map(wf => {
              const isSelected = selectedNodeId === wf.id;
              const isDimmed = activeIds && !activeIds.has(wf.id);
              return (
                <div
                  key={wf.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : wf.id)}
                  style={{
                    background: isSelected ? "rgba(249, 115, 22, 0.16)" : "#11141e",
                    border: `1px solid ${isSelected ? "#f97316" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    boxShadow: isSelected ? "0 0 16px rgba(249, 115, 22, 0.25)" : "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Workflow size={13} style={{ color: "#f97316" }} />
                      <strong style={{ fontSize: 12, color: "#f3f5fa" }}>{wf.name}</strong>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.15)", padding: "1px 5px", borderRadius: 3 }}>
                      WORKFLOW
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>
                    {wf.description || "State machine transition"}
                  </span>
                </div>
              );
            })}

            {/* Test verifications */}
            {tests.slice(0, 3).map(test => {
              const isSelected = selectedNodeId === test.id;
              const isDimmed = activeIds && !activeIds.has(test.id);
              return (
                <div
                  key={test.id}
                  onClick={() => setSelectedNodeId(isSelected ? null : test.id)}
                  style={{
                    background: isSelected ? "rgba(45, 212, 191, 0.15)" : "#0d1417",
                    border: `1px solid ${isSelected ? "#2dd4bf" : "rgba(45, 212, 191, 0.25)"}`,
                    borderRadius: 8,
                    padding: "9px 12px",
                    cursor: "pointer",
                    opacity: isDimmed ? 0.35 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={13} style={{ color: "#2dd4bf" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ccfbf1" }}>{test.title}</span>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#2dd4bf", background: "rgba(45,212,191,0.12)", padding: "1px 5px", borderRadius: 3 }}>
                    VERIFIED
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CausalGraph({
  canonicalModel,
  onSelectForImpact,
  selectedNodeId: externalSelectedNodeId,
  onSelectNode
}) {
  const containerRef = useRef(null);
  const filterPopoverRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState(null);
  const selectedNodeId = externalSelectedNodeId !== undefined ? externalSelectedNodeId : internalSelectedNodeId;

  const setSelectedNodeId = useCallback((id) => {
    setInternalSelectedNodeId(id);
    if (onSelectNode) {
      const node = graph.nodes.find(n => n.id === id);
      onSelectNode(node || (id ? { id, label: id, type: "component" } : null));
    }
  }, [onSelectNode]);

  const [layoutMode, setLayoutMode] = useState("lr"); // "lr" | "tb" | "cluster"
  const [viewMode, setViewMode] = useState("flowchart"); // "flowchart" | "graph" | "table"
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const [activeTypeFilters, setActiveTypeFilters] = useState(new Set([
    "requirement", "actor", "component", "entity", "api", "workflow", "test"
  ]));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const graph = useMemo(() => buildGraphIndex(canonicalModel), [canonicalModel]);

  // Close filter popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isFilterOpen]);

  // Filter nodes based on active type filters
  const filteredNodes = useMemo(() => {
    return graph.nodes.filter(node => activeTypeFilters.has(node.type));
  }, [graph.nodes, activeTypeFilters]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return graph.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [graph.edges, filteredNodeIds]);

  const [selectedRoleId, setSelectedRoleId] = useState(null);

  // Available Actor/Role nodes
  const actorNodes = useMemo(() => graph.nodes.filter(n => n.type === "actor"), [graph.nodes]);

  // Active Role Node & Neighborhood
  const activeActorNode = useMemo(() => {
    if (!selectedRoleId) return null;
    return graph.nodes.find(n => n.id === selectedRoleId && n.type === "actor") || null;
  }, [selectedRoleId, graph.nodes]);

  const activeRoleNeighborhood = useMemo(() => {
    if (!selectedRoleId) return null;
    return inspectNodeNeighborhood(graph, selectedRoleId);
  }, [selectedRoleId, graph]);

  // End-to-end data processing journey for the selected role
  const roleJourneyData = useMemo(() => {
    if (!activeActorNode || !activeRoleNeighborhood) return null;

    const connectedIds = new Set([
      activeActorNode.id,
      ...(activeRoleNeighborhood.directUpstream || []).map(n => n.id),
      ...(activeRoleNeighborhood.directDownstream || []).map(n => n.id),
      ...(activeRoleNeighborhood.transitiveDownstream || []).map(n => n.id)
    ]);

    const connectedNodes = graph.nodes.filter(n => connectedIds.has(n.id));
    const requirements = connectedNodes.filter(n => n.type === "requirement");
    const components = connectedNodes.filter(n => n.type === "component");
    const apis = connectedNodes.filter(n => n.type === "api");
    const entities = connectedNodes.filter(n => n.type === "entity");
    const workflows = connectedNodes.filter(n => n.type === "workflow");
    const tests = connectedNodes.filter(n => n.type === "test");

    return {
      actor: activeActorNode,
      requirements,
      components,
      apis,
      entities,
      workflows,
      tests,
      connectedIds
    };
  }, [activeActorNode, activeRoleNeighborhood, graph.nodes]);

  // Selected node inspection neighborhood
  const selectedNeighborhood = useMemo(() => {
    if (!selectedNodeId) return null;
    return inspectNodeNeighborhood(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  // Focus Mode: connected set for dimming non-relevant nodes (respects selected role or selected node)
  const connectedNodeIds = useMemo(() => {
    if (selectedRoleId && roleJourneyData) {
      return roleJourneyData.connectedIds;
    }
    if (!selectedNodeId) return null;
    const set = new Set([selectedNodeId]);
    if (selectedNeighborhood) {
      (selectedNeighborhood.directUpstream || []).forEach(n => set.add(n.id));
      (selectedNeighborhood.directDownstream || []).forEach(n => set.add(n.id));
      (selectedNeighborhood.transitiveDownstream || []).forEach(n => set.add(n.id));
    }
    return set;
  }, [selectedRoleId, roleJourneyData, selectedNodeId, selectedNeighborhood]);

  // ─── Precise Multi-Layout Calculation Engine ──────────────────────────────
  const { nodePositions, boundingBox, columnHeaders } = useMemo(() => {
    const positions = new Map();
    const headers = [];
    const nodeW = 200;
    const nodeH = 54;

    if (filteredNodes.length === 0) {
      return {
        nodePositions: positions,
        boundingBox: { minX: 0, minY: 0, maxX: 600, maxY: 400, width: 600, height: 400 },
        columnHeaders: []
      };
    }

    if (layoutMode === "lr") {
      // Layered Left-to-Right by Architectural Role
      const columns = {
        requirement: [],
        actor: [],
        component: [],
        api: [],
        entity: [],
        workflow: [],
        test: []
      };

      filteredNodes.forEach(node => {
        if (columns[node.type]) columns[node.type].push(node);
        else columns.component.push(node);
      });

      const colOrder = ["requirement", "actor", "component", "api", "entity", "workflow", "test"];
      let curX = 40;
      const colSpacing = 64;
      const rowSpacing = 68;

      colOrder.forEach(type => {
        const list = columns[type] || [];
        if (list.length === 0) return;

        const startY = 56;
        headers.push({
          type,
          label: TYPE_CONFIG[type]?.label?.toUpperCase() || type.toUpperCase(),
          x: curX + nodeW / 2,
          y: 28,
          count: list.length
        });

        list.forEach((node, rowIdx) => {
          positions.set(node.id, {
            x: curX,
            y: startY + rowIdx * rowSpacing,
            width: nodeW,
            height: nodeH
          });
        });

        curX += nodeW + colSpacing;
      });

    } else if (layoutMode === "tb") {
      // Top-to-Bottom Hierarchical Tree
      const tiers = {
        tier1: { label: "SPECIFICATION & ROLES", nodes: [] },
        tier2: { label: "CORE SERVICES & COMPONENTS", nodes: [] },
        tier3: { label: "REST CONTRACTS & APIS", nodes: [] },
        tier4: { label: "DATA PERSISTENCE & SCHEMAS", nodes: [] },
        tier5: { label: "WORKFLOWS & VERIFICATION", nodes: [] }
      };

      filteredNodes.forEach(node => {
        if (node.type === "actor" || node.type === "requirement") tiers.tier1.nodes.push(node);
        else if (node.type === "component") tiers.tier2.nodes.push(node);
        else if (node.type === "api") tiers.tier3.nodes.push(node);
        else if (node.type === "entity") tiers.tier4.nodes.push(node);
        else tiers.tier5.nodes.push(node);
      });

      let curY = 48;
      const tierSpacing = 90;
      const colSpacing = 220;

      Object.keys(tiers).forEach(tierKey => {
        const tier = tiers[tierKey];
        if (tier.nodes.length === 0) return;

        headers.push({
          label: tier.label,
          x: 40,
          y: curY - 14,
          count: tier.nodes.length
        });

        tier.nodes.forEach((node, idx) => {
          positions.set(node.id, {
            x: 40 + idx * colSpacing,
            y: curY,
            width: nodeW,
            height: nodeH
          });
        });

        curY += nodeH + tierSpacing;
      });

    } else {
      // Clustered View with 2D Layout
      const groups = {};
      filteredNodes.forEach(node => {
        if (!groups[node.type]) groups[node.type] = [];
        groups[node.type].push(node);
      });

      const groupKeys = Object.keys(groups);
      const cols = Math.min(3, Math.max(1, groupKeys.length));
      const groupWidth = 260;
      const colGap = 40;

      groupKeys.forEach((gKey, gIdx) => {
        const colIdx = gIdx % cols;
        const rowIdx = Math.floor(gIdx / cols);
        const gx = 40 + colIdx * (groupWidth + colGap);
        const gy = 40 + rowIdx * 300;
        const list = groups[gKey];

        headers.push({
          label: `${TYPE_CONFIG[gKey]?.label?.toUpperCase() || gKey.toUpperCase()} TIER`,
          x: gx + groupWidth / 2,
          y: gy + 14,
          count: list.length
        });

        list.forEach((node, nIdx) => {
          positions.set(node.id, {
            x: gx + 10,
            y: gy + 32 + nIdx * 64,
            width: nodeW,
            height: nodeH
          });
        });
      });
    }

    // Accurate bounding box calculated strictly from node positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    });

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 600; maxY = 400;
    }

    const realW = Math.max(100, maxX - minX);
    const realH = Math.max(100, maxY - minY);

    return {
      nodePositions: positions,
      boundingBox: {
        minX,
        minY,
        maxX,
        maxY,
        width: realW,
        height: realH
      },
      columnHeaders: headers
    };
  }, [filteredNodes, layoutMode]);

  // ─── Mathematically Symmetrical Fit-to-View ───────────────────────────────
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const graphW = boundingBox.width;
    const graphH = boundingBox.height;

    // Use 48px padding around graph
    const padding = 48;
    const scaleX = (clientWidth - padding * 2) / graphW;
    const scaleY = (clientHeight - padding * 2) / graphH;

    // Zoom clamped strictly between 0.15 and 1.25 to prevent tiny thumbnail or clipping
    const newZoom = Math.max(0.15, Math.min(1.25, Math.min(scaleX, scaleY)));

    // Exact centering: subtract minX * newZoom and minY * newZoom so the first node starts with equal margins!
    const offsetX = (clientWidth - graphW * newZoom) / 2 - boundingBox.minX * newZoom;
    const offsetY = (clientHeight - graphH * newZoom) / 2 - boundingBox.minY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(offsetX), y: Math.round(offsetY) });
  }, [boundingBox]);

  // Auto-fit using ResizeObserver triggered when container has painted dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const immediate = setTimeout(fitToView, 40);
    const ro = new ResizeObserver(() => {
      clearTimeout(immediate);
      fitToView();
    });
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(immediate);
      ro.disconnect();
    };
  }, [fitToView, layoutMode]);

  // Wheel zoom on the SVG canvas
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(z => Number(Math.max(0.15, Math.min(2.0, z + delta)).toFixed(2)));
  }

  // ─── Center on Selected Node ───────────────────────────────────────────────
  const centerNode = useCallback((nodeId) => {
    const pos = nodePositions.get(nodeId);
    if (!pos || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;

    const targetX = clientWidth / 2 - (pos.x + pos.width / 2) * zoom;
    const targetY = clientHeight / 2 - (pos.y + pos.height / 2) * zoom;

    setPan({ x: Math.round(targetX), y: Math.round(targetY) });
  }, [nodePositions, zoom]);

  useEffect(() => {
    if (externalSelectedNodeId) {
      const timer = setTimeout(() => centerNode(externalSelectedNodeId), 60);
      return () => clearTimeout(timer);
    }
  }, [externalSelectedNodeId, centerNode]);

  function toggleTypeFilter(type) {
    setActiveTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // Canvas Pan Drag Handlers
  function handleMouseDown(e) {
    if (e.target.closest("button") || e.target.closest(".graph-node-group")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Semantic Zoom Threshold: At < 0.65, render compact view; at >= 0.65, render detailed view
  const isSemanticCompact = zoom < 0.65;

  return (
    <div className="causal-graph-wrapper" style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      background: "var(--ide-bg-canvas)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* ─── Slim Canvas Toolbar (36px) ────────────────────────────────────── */}
      <div className="canvas-slim-toolbar" style={{
        height: 36,
        padding: "0 12px",
        background: "var(--ide-bg-chrome)",
        borderBottom: "1px solid var(--ide-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        zIndex: 15,
        userSelect: "none"
      }}>
        {/* Left: Type Filter Popover Trigger */}
        <div style={{ position: "relative" }} ref={filterPopoverRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--ide-bg-panels)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-sm)",
              padding: "3px 8px",
              color: "var(--ide-text-secondary)",
              fontSize: "var(--ide-font-xs)",
              fontWeight: 500,
              cursor: "pointer"
            }}
            title="Filter visible artifact types"
          >
            <Filter size={12} style={{ color: "var(--ide-accent)" }} />
            <span>Filter Types</span>
            <span style={{
              fontSize: 10,
              background: "var(--ide-accent-subtle)",
              color: "var(--ide-accent)",
              padding: "1px 5px",
              borderRadius: "var(--ide-radius-pill)"
            }}>
              {activeTypeFilters.size}/{Object.keys(TYPE_CONFIG).length}
            </span>
            <ChevronDown size={11} />
          </button>

          {/* Filter Popover Menu */}
          {isFilterOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              width: 210,
              background: "var(--ide-bg-panels)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-md)",
              boxShadow: "var(--ide-shadow-popover)",
              padding: "4px",
              zIndex: "var(--ide-z-popover)"
            }}>
              <div style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "var(--ide-text-muted)", textTransform: "uppercase" }}>
                Filter Artifact Types
              </div>
              {Object.keys(TYPE_CONFIG).map(type => {
                const conf = TYPE_CONFIG[type];
                const active = activeTypeFilters.has(type);
                const count = graph.nodes.filter(n => n.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      borderRadius: "var(--ide-radius-xs)",
                      background: active ? "var(--ide-bg-hover)" : "transparent",
                      border: "none",
                      color: active ? "var(--ide-text-primary)" : "var(--ide-text-muted)",
                      fontSize: "var(--ide-font-xs)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: conf.dot }} />
                      <span>{conf.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--ide-text-dim)" }}>({count})</span>
                      {active && <Check size={12} style={{ color: "var(--ide-accent)" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Layout Dropdown & View Mode Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Layout Mode Selector (visible when in graph mode) */}
          {viewMode === "graph" && (
            <div style={{
              display: "inline-flex",
              background: "var(--ide-bg-canvas)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-sm)",
              padding: 2
            }}>
              {[
                { id: "lr", label: "Layered (L→R)" },
                { id: "tb", label: "Hierarchical (T↓B)" },
                { id: "cluster", label: "Clustered" }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setLayoutMode(m.id)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "var(--ide-font-xs)",
                    fontWeight: layoutMode === m.id ? 600 : 400,
                    border: "none",
                    borderRadius: "var(--ide-radius-xs)",
                    cursor: "pointer",
                    background: layoutMode === m.id ? "var(--ide-accent-subtle)" : "transparent",
                    color: layoutMode === m.id ? "var(--ide-accent)" : "var(--ide-text-muted)"
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* View Mode Switcher: Flowchart | Graph | Table */}
          <div style={{
            display: "inline-flex",
            background: "var(--ide-bg-canvas)",
            border: "1px solid var(--ide-border)",
            borderRadius: "var(--ide-radius-sm)",
            padding: 2,
            gap: 2
          }}>
            <button
              onClick={() => setViewMode("flowchart")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                fontSize: "var(--ide-font-xs)",
                fontWeight: viewMode === "flowchart" ? 700 : 500,
                border: "none",
                borderRadius: "var(--ide-radius-xs)",
                cursor: "pointer",
                background: viewMode === "flowchart" ? "rgba(83, 215, 244, 0.18)" : "transparent",
                color: viewMode === "flowchart" ? "#53d7f4" : "var(--ide-text-muted)"
              }}
              title="Animated Flowchart View"
            >
              <Sparkles size={11} className={viewMode === "flowchart" ? "pulse-anim" : ""} />
              <span>Animated Flowchart</span>
            </button>
            <button
              onClick={() => setViewMode("graph")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: "var(--ide-font-xs)",
                fontWeight: viewMode === "graph" ? 700 : 500,
                border: "none",
                borderRadius: "var(--ide-radius-xs)",
                cursor: "pointer",
                background: viewMode === "graph" ? "var(--ide-accent-subtle)" : "transparent",
                color: viewMode === "graph" ? "var(--ide-accent)" : "var(--ide-text-muted)"
              }}
              title="Interactive Full Matrix Graph"
            >
              <LayoutGrid size={11} />
              <span>Full Matrix</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: "var(--ide-font-xs)",
                fontWeight: viewMode === "table" ? 700 : 500,
                border: "none",
                borderRadius: "var(--ide-radius-xs)",
                cursor: "pointer",
                background: viewMode === "table" ? "var(--ide-accent-subtle)" : "transparent",
                color: viewMode === "table" ? "var(--ide-accent)" : "var(--ide-text-muted)"
              }}
              title="Artifact Table View"
            >
              <Table size={11} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Role Persona Journey Filter Bar ───────────────────────────────── */}
      <div className="role-journey-selector-bar" style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        background: "rgba(10, 12, 16, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        flexWrap: "wrap"
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#fbbf24",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 5
        }}>
          <Users size={12} /> TRACE ROLE JOURNEY:
        </span>

        <button
          type="button"
          onClick={() => setSelectedRoleId(null)}
          style={{
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: selectedRoleId === null ? 700 : 500,
            borderRadius: 4,
            border: selectedRoleId === null ? "1px solid rgba(139,124,255,0.4)" : "1px solid transparent",
            background: selectedRoleId === null ? "rgba(139,124,255,0.18)" : "transparent",
            color: selectedRoleId === null ? "#d8d2ff" : "var(--ide-text-muted)",
            cursor: "pointer"
          }}
        >
          All System Paths
        </button>

        {actorNodes.map(actor => {
          const isActiveRole = selectedRoleId === actor.id;
          return (
            <button
              key={actor.id}
              type="button"
              onClick={() => setSelectedRoleId(isActiveRole ? null : actor.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: isActiveRole ? 700 : 500,
                borderRadius: 4,
                border: isActiveRole ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.08)",
                background: isActiveRole ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.03)",
                color: isActiveRole ? "#fef3c7" : "var(--ide-text-secondary)",
                cursor: "pointer"
              }}
            >
              <span>👤 {actor.label}</span>
              {isActiveRole && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24" }} />}
            </button>
          );
        })}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ide-text-dim)" }}>
          {selectedRoleId
            ? "Highlighting end-to-end data processing for selected role"
            : "Click any role to see how data and actions are saved & processed"}
        </span>
      </div>

      {/* ─── Role Data & Processing Lifecycle Panel (When Role Active) ──────── */}
      {selectedRoleId && roleJourneyData && (
        <div className="role-lifecycle-card" style={{
          background: "linear-gradient(135deg, #121520 0%, #0d0f17 100%)",
          borderBottom: "1px solid rgba(251, 191, 36, 0.3)",
          padding: "12px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flexShrink: 0,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "rgba(251, 191, 36, 0.2)",
                color: "#fbbf24",
                display: "grid",
                placeItems: "center"
              }}>
                <Users size={15} />
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 13, color: "#fef3c7" }}>Role Journey: {roleJourneyData.actor.label}</strong>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>
                    ACTIVE ROLE TRACE
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--ide-text-secondary)" }}>
                  {roleJourneyData.actor.data?.purpose || "System stakeholder and user participant"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRoleId(null)}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-dim)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
            >
              Close Trace ✕
            </button>
          </div>

          {/* 4 Informational Blocks: Who does what, Components/APIs, DB Storage, Verification */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, fontSize: 11 }}>
            {/* 1. Who Does What */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#ddd6fe", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                1. WHO DOES WHAT:
              </span>
              <span style={{ color: "#f3f5fa", fontWeight: 600, display: "block" }}>
                {roleJourneyData.requirements.map(r => r.label).slice(0, 2).join(", ") || "Core User Actions"}
              </span>
              <span style={{ color: "var(--ide-text-dim)", fontSize: 10 }}>
                Triggers {roleJourneyData.workflows.length} workflow transitions
              </span>
            </div>

            {/* 2. Components & APIs */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                2. COMPONENTS & APIS USED:
              </span>
              <span style={{ color: "#f3f5fa", fontWeight: 600, display: "block" }}>
                {roleJourneyData.apis.map(a => a.label).slice(0, 2).join(", ") || "REST Endpoints"}
              </span>
              <span style={{ color: "var(--ide-text-dim)", fontSize: 10 }}>
                Routed via {roleJourneyData.components.map(c => c.label).slice(0, 2).join(" ➔ ") || "Services"}
              </span>
            </div>

            {/* 3. Where Data is Saved */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#42d6a4", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                3. HOW DATA IS SAVED:
              </span>
              <span style={{ color: "#42d6a4", fontWeight: 700, display: "block" }}>
                {roleJourneyData.entities.length ? roleJourneyData.entities.map(e => `MongoDB: ${e.label}`).join(", ") : "MongoDB Documents"}
              </span>
              <span style={{ color: "var(--ide-text-dim)", fontSize: 10 }}>
                Persisted with indexes & schema validation
              </span>
            </div>

            {/* 4. Processing & Verification */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                4. VERIFICATION & SAFETY:
              </span>
              <span style={{ color: "#f3f5fa", fontWeight: 600, display: "block" }}>
                {roleJourneyData.tests.length ? `${roleJourneyData.tests.length} Automated Verifications` : "Enforced by RBAC"}
              </span>
              <span style={{ color: "var(--ide-text-dim)", fontSize: 10 }}>
                {roleJourneyData.actor.data?.restrictions?.[0] || "Least privilege access enforced"}
              </span>
            </div>
          </div>

          {/* 5-Step Visual Lifecycle Timeline */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.05)"
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ide-text-dim)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Data Pipeline:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, fontSize: 10, overflowX: "auto" }}>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(251,191,36,0.15)", color: "#fef3c7" }}>
                1. Action in UI
              </span>
              <span style={{ color: "var(--ide-text-dim)" }}>➔</span>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(96,165,250,0.15)", color: "#93c5fd" }}>
                2. REST Call
              </span>
              <span style={{ color: "var(--ide-text-dim)" }}>➔</span>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(167,139,250,0.15)", color: "#ddd6fe" }}>
                3. Backend Logic
              </span>
              <span style={{ color: "var(--ide-text-dim)" }}>➔</span>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(66,214,164,0.15)", color: "#42d6a4", fontWeight: 700 }}>
                4. Persist in MongoDB
              </span>
              <span style={{ color: "var(--ide-text-dim)" }}>➔</span>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(83,215,244,0.15)", color: "#53d7f4" }}>
                5. Response 200 OK
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Viewport: Animated Flowchart, SVG Canvas, or Synchronized Table ─── */}
      <div style={{ display: "flex", flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        {viewMode === "flowchart" ? (
          <FlowchartPipelineView
            canonicalModel={canonicalModel}
            graph={graph}
            selectedRoleId={selectedRoleId}
            setSelectedRoleId={setSelectedRoleId}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            roleJourneyData={roleJourneyData}
            onSelectForImpact={onSelectForImpact}
          />
        ) : viewMode === "graph" ? (
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              overflow: "hidden",
              position: "relative",
              cursor: isDragging ? "grabbing" : "grab",
              background: "var(--ide-bg-canvas)"
            }}
          >
            <svg
              width="100%"
              height="100%"
              style={{ display: "block" }}
            >
              <defs>
                <marker id="causal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ide-text-dim)" />
                </marker>
                <marker id="causal-arrow-downstream" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ide-red)" />
                </marker>
                <marker id="causal-arrow-upstream" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ide-accent)" />
                </marker>
                <marker id="causal-arrow-role" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24" />
                </marker>
                <filter id="causal-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Scaled & Panned Group */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Subtle Canvas Dot Grid */}
                <pattern id="canvas-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.05)" />
                </pattern>
                <rect
                  x={boundingBox.minX - 1000}
                  y={boundingBox.minY - 1000}
                  width={boundingBox.width + 2000}
                  height={boundingBox.height + 2000}
                  fill="url(#canvas-grid)"
                />

                {/* Column Headers in Layered L→R mode */}
                {columnHeaders.map((hdr, hIdx) => (
                  <g key={hIdx}>
                    <text
                      x={hdr.x}
                      y={hdr.y}
                      fill="var(--ide-text-muted)"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                      letterSpacing="0.8"
                    >
                      {hdr.label} ({hdr.count})
                    </text>
                  </g>
                ))}

                {/* Dependency Edges */}
                {filteredEdges.map(edge => {
                  const src = nodePositions.get(edge.source);
                  const tgt = nodePositions.get(edge.target);
                  if (!src || !tgt) return null;

                  let x1, y1, x2, y2, pathD, midX, midY;

                  if (layoutMode === "tb") {
                    x1 = src.x + src.width / 2;
                    y1 = src.y + src.height;
                    x2 = tgt.x + tgt.width / 2;
                    y2 = tgt.y;
                    const dy = Math.abs(y2 - y1) * 0.5;
                    pathD = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
                    midX = (x1 + x2) / 2;
                    midY = (y1 + y2) / 2;
                  } else {
                    x1 = src.x + src.width;
                    y1 = src.y + src.height / 2;
                    x2 = tgt.x;
                    y2 = tgt.y + tgt.height / 2;
                    const dx = Math.abs(x2 - x1) * 0.5;
                    pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    midX = (x1 + x2) / 2;
                    midY = (y1 + y2) / 2;
                  }

                  const isRoleEdge = selectedRoleId && roleJourneyData?.connectedIds.has(edge.source) && roleJourneyData?.connectedIds.has(edge.target);
                  const isDownstream = selectedNodeId && (edge.source === selectedNodeId || selectedNeighborhood?.directDownstream.some(n => n.id === edge.target));
                  const isUpstream = selectedNodeId && (edge.target === selectedNodeId || selectedNeighborhood?.directUpstream.some(n => n.id === edge.source));
                  const isDimmed = (selectedRoleId && !isRoleEdge) || (selectedNodeId && !isDownstream && !isUpstream);
                  const isHovered = hoveredEdgeId === edge.id;
                  const isHighlighted = isRoleEdge || isDownstream || isUpstream;

                  let strokeColor = "var(--ide-border)";
                  let marker = "url(#causal-arrow)";
                  let strokeWidth = 1.2;

                  if (isRoleEdge) {
                    strokeColor = "#fbbf24";
                    marker = "url(#causal-arrow-role)";
                    strokeWidth = 2.4;
                  } else if (isDownstream) {
                    strokeColor = "var(--ide-red)";
                    marker = "url(#causal-arrow-downstream)";
                    strokeWidth = 2.2;
                  } else if (isUpstream) {
                    strokeColor = "var(--ide-accent)";
                    marker = "url(#causal-arrow-upstream)";
                    strokeWidth = 2.2;
                  } else if (isDimmed) {
                    strokeColor = "rgba(255, 255, 255, 0.04)";
                  }

                  return (
                    <g
                      key={edge.id}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isHighlighted ? "6 6" : "none"}
                        className={isHighlighted ? "flow-marching-ants" : ""}
                        markerEnd={marker}
                      />

                      {/* Animated moving particle along highlighted path */}
                      {isHighlighted && (
                        <g>
                          <circle r="4" fill={strokeColor} filter="url(#causal-glow)">
                            <animateMotion path={pathD} dur="1.8s" repeatCount="indefinite" />
                          </circle>
                          <circle r="1.8" fill="#ffffff">
                            <animateMotion path={pathD} dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      )}

                      {/* Hover-only relationship pill label */}
                      {(isHovered || isDownstream || isUpstream || isRoleEdge) && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={18}
                            rx={4}
                            fill="#0c0f17"
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            fill="#f3f5fa"
                            fontSize="9"
                            fontFamily="var(--ide-font-mono)"
                            textAnchor="middle"
                            fontWeight="650"
                          >
                            {edge.type || "calls"}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Graph Nodes */}
                {filteredNodes.map(node => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const colorInfo = TYPE_CONFIG[node.type] || TYPE_CONFIG.component;
                  const Icon = colorInfo.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isDimmed = connectedNodeIds && !connectedNodeIds.has(node.id);
                  const isUpstream = selectedNeighborhood?.directUpstream.some(n => n.id === node.id);
                  const isDownstream = selectedNeighborhood?.directDownstream.some(n => n.id === node.id);

                  let borderColor = colorInfo.border;
                  let borderWidth = 1;
                  if (isSelected) {
                    borderColor = "var(--ide-accent)";
                    borderWidth = 2.5;
                  } else if (isUpstream) {
                    borderColor = "var(--ide-accent)";
                    borderWidth = 2;
                  } else if (isDownstream) {
                    borderColor = "var(--ide-red)";
                    borderWidth = 2;
                  }

                  return (
                    <g
                      key={node.id}
                      className="graph-node-group"
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => {
                        if (node.type === "actor") {
                          setSelectedRoleId(selectedRoleId === node.id ? null : node.id);
                        }
                        setSelectedNodeId(isSelected ? null : node.id);
                      }}
                      style={{
                        cursor: "pointer",
                        opacity: isDimmed ? 0.2 : 1.0,
                        transition: "opacity 160ms ease"
                      }}
                    >
                      {/* Node Container Card */}
                      <rect
                        width={pos.width}
                        height={pos.height}
                        rx={8}
                        fill="#111522"
                        stroke={borderColor}
                        strokeWidth={borderWidth}
                        filter={isSelected ? "url(#causal-glow)" : "drop-shadow(0 2px 8px rgba(0,0,0,0.4))"}
                      />

                      {/* Icon Badge container on Left */}
                      <rect
                        x={7}
                        y={8}
                        width={36}
                        height={38}
                        rx={6}
                        fill={colorInfo.bg}
                        stroke={colorInfo.border}
                        strokeWidth={0.8}
                      />

                      {/* Render Icon via foreignObject */}
                      <foreignObject x={7} y={8} width={36} height={38}>
                        <div style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          color: colorInfo.border
                        }}>
                          <Icon size={18} />
                        </div>
                      </foreignObject>

                      {/* Semantic Node Content */}
                      {isSemanticCompact ? (
                        /* Compact view when zoomed out (< 0.65) */
                        <text
                          x={49}
                          y={32}
                          fill="var(--ide-text-primary)"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {node.label?.length > 17 ? `${node.label.slice(0, 15)}…` : node.label}
                        </text>
                      ) : (
                        /* Detailed view when zoomed in (>= 0.65) */
                        <>
                          <text
                            x={49}
                            y={22}
                            fill="var(--ide-text-primary)"
                            fontSize="12"
                            fontWeight="700"
                          >
                            {node.label?.length > 16 ? `${node.label.slice(0, 14)}…` : node.label}
                          </text>

                          <text
                            x={49}
                            y={38}
                            fill={colorInfo.border}
                            fontSize="9"
                            fontWeight="800"
                            letterSpacing="0.04em"
                            textTransform="uppercase"
                          >
                            {colorInfo.label}
                          </text>

                          {/* Centrality / Degree Badge */}
                          <g transform={`translate(${pos.width - 24}, 18)`}>
                            <circle
                              cx={0}
                              cy={0}
                              r={8}
                              fill="rgba(0,0,0,0.5)"
                              stroke={colorInfo.border}
                              strokeWidth={0.8}
                            />
                            <text
                              x={0}
                              y={3}
                              fill="var(--ide-text-secondary)"
                              fontSize="8"
                              fontWeight="800"
                              textAnchor="middle"
                            >
                              {node.centrality || 1}
                            </text>
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* ─── Pinned Floating Legend (Bottom-Left) ────────────────────── */}
            <div style={{
              position: "absolute",
              bottom: 14,
              left: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--ide-bg-chrome)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-pill)",
              padding: "4px 12px",
              boxShadow: "var(--ide-shadow-sm)",
              fontSize: 10,
              color: "var(--ide-text-muted)",
              zIndex: 10,
              userSelect: "none"
            }}>
              {Object.keys(TYPE_CONFIG).slice(0, 5).map(t => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_CONFIG[t].dot }} />
                  <span>{TYPE_CONFIG[t].label}</span>
                </span>
              ))}
            </div>

            {/* ─── Pinned Floating Zoom & Fit Controls (Bottom-Right) ──────── */}
            <div style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "var(--ide-bg-chrome)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-md)",
              padding: 2,
              boxShadow: "var(--ide-shadow-md)",
              zIndex: 10
            }}>
              <button
                onClick={() => setZoom(z => Math.min(Number((z + 0.12).toFixed(2)), 2.0))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ide-text-secondary)",
                  padding: "5px 7px",
                  cursor: "pointer",
                  borderRadius: "var(--ide-radius-xs)"
                }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(Number((z - 0.12).toFixed(2)), 0.15))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ide-text-secondary)",
                  padding: "5px 7px",
                  cursor: "pointer",
                  borderRadius: "var(--ide-radius-xs)"
                }}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ide-text-secondary)",
                  padding: "5px 7px",
                  cursor: "pointer",
                  borderRadius: "var(--ide-radius-xs)"
                }}
                title="Reset Zoom & Pan"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={fitToView}
                style={{
                  background: "var(--ide-accent-subtle)",
                  border: "none",
                  color: "var(--ide-accent)",
                  padding: "5px 8px",
                  cursor: "pointer",
                  borderRadius: "var(--ide-radius-xs)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 600
                }}
                title="Fit to view"
              >
                <Maximize2 size={12} />
                <span>Fit</span>
              </button>
            </div>
          </div>
        ) : (
          /* Synchronized Table View */
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ide-font-xs)", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ide-border)", color: "var(--ide-text-muted)" }}>
                  <th style={{ padding: "8px 12px" }}>ARTIFACT</th>
                  <th style={{ padding: "8px 12px" }}>TYPE</th>
                  <th style={{ padding: "8px 12px" }}>ID</th>
                  <th style={{ padding: "8px 12px" }}>CENTRALITY</th>
                  <th style={{ padding: "8px 12px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map(node => (
                  <tr key={node.id} style={{ borderBottom: "1px solid var(--ide-border-subtle)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--ide-text-primary)", fontWeight: 600 }}>{node.label}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "var(--ide-radius-xs)",
                        background: TYPE_CONFIG[node.type]?.bg || "var(--ide-bg-hover)",
                        color: TYPE_CONFIG[node.type]?.border || "var(--ide-text-primary)",
                        fontSize: 10,
                        fontWeight: 600
                      }}>
                        {node.type}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "var(--ide-font-mono)", color: "var(--ide-text-muted)" }}>{node.id}</td>
                    <td style={{ padding: "8px 12px", color: "var(--ide-text-secondary)" }}>{node.centrality || 1}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        onClick={() => setSelectedNodeId(node.id)}
                        style={{
                          background: "var(--ide-bg-hover)",
                          border: "1px solid var(--ide-border)",
                          color: "var(--ide-text-primary)",
                          padding: "3px 8px",
                          borderRadius: "var(--ide-radius-xs)",
                          cursor: "pointer",
                          fontSize: 11
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
