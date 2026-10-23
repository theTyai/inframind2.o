import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Download, Crosshair, Globe, Server, Database,
  Zap, Cpu, Workflow, Shield, Layers, CheckCircle2, AlertTriangle, AlertCircle,
  ArrowRight, Search, Filter, Eye, EyeOff, Table as TableIcon, Network, Sparkles
} from "lucide-react";

// Categorize architectural component into canonical tier
function getComponentTierInfo(comp) {
  const t = (comp.componentType || comp.type || "").toLowerCase();
  const l = (comp.label || comp.name || comp.id || "").toLowerCase();
  const tier = comp.tier || "";

  if (tier === "frontend" || t.includes("front") || t.includes("client") || t.includes("ui") || t.includes("web") || l.includes("interface") || l.includes("ui")) {
    return {
      tierKey: "frontend",
      tierLabel: "Client / Frontend",
      typeLabel: "FRONTEND TIER",
      icon: Globe,
      accentColor: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.08)",
      border: "rgba(56, 189, 248, 0.35)",
      glow: "rgba(56, 189, 248, 0.25)"
    };
  }
  if (tier === "gateway" || t.includes("gateway") || t.includes("proxy") || t.includes("ingress") || l.includes("gateway")) {
    return {
      tierKey: "gateway",
      tierLabel: "API Gateway / HTTP Routes",
      typeLabel: "API GATEWAY",
      icon: Shield,
      accentColor: "#818cf8",
      bg: "rgba(129, 140, 248, 0.08)",
      border: "rgba(129, 140, 248, 0.35)",
      glow: "rgba(129, 140, 248, 0.25)"
    };
  }
  if (tier === "database" || t.includes("data") || t.includes("db") || t.includes("mongo") || t.includes("sql") || l.includes("store") || l.includes("database")) {
    return {
      tierKey: "database",
      tierLabel: "Data Stores",
      typeLabel: "PRIMARY DATABASE",
      icon: Database,
      accentColor: "#42d6a4",
      bg: "rgba(66, 214, 164, 0.08)",
      border: "rgba(66, 214, 164, 0.35)",
      glow: "rgba(66, 214, 164, 0.25)"
    };
  }
  if (tier === "worker" || t.includes("worker") || t.includes("queue") || t.includes("kafka") || t.includes("job")) {
    return {
      tierKey: "worker",
      tierLabel: "Background Jobs",
      typeLabel: "ASYNC WORKER",
      icon: Workflow,
      accentColor: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.35)",
      glow: "rgba(245, 158, 11, 0.25)"
    };
  }
  if (tier === "external" || t.includes("external") || t.includes("ai") || t.includes("llm") || l.includes("llm") || l.includes("openai") || l.includes("anthropic")) {
    return {
      tierKey: "external",
      tierLabel: "External Integrations",
      typeLabel: "EXTERNAL AI / API",
      icon: Sparkles,
      accentColor: "#ec4899",
      bg: "rgba(236, 72, 153, 0.08)",
      border: "rgba(236, 72, 153, 0.35)",
      glow: "rgba(236, 72, 153, 0.25)"
    };
  }
  return {
    tierKey: "service",
    tierLabel: "Backend Services",
    typeLabel: "BACKEND SERVICE",
    icon: Cpu,
    accentColor: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.08)",
    border: "rgba(167, 139, 250, 0.35)",
    glow: "rgba(167, 139, 250, 0.25)"
  };
}

export default function SystemMap({
  canonicalModel = {},
  compilerFindings = [],
  selectedNodeId,
  onSelectNode,
  onSelectForImpact
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isAnimationRunning, setIsAnimationRunning] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("canvas"); // "canvas" | "table"
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const rawComponents = Array.isArray(canonicalModel.components) ? canonicalModel.components : [];
  const rawEdges = Array.isArray(canonicalModel.dependencies) ? canonicalModel.dependencies : [];

  // Filter components to genuine architectural nodes (exclude API / Entity nodes from topology map if raw)
  const components = useMemo(() => {
    return rawComponents.filter((c) => {
      if (typeFilter !== "ALL") {
        const info = getComponentTierInfo(c);
        if (info.tierKey !== typeFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = (c.label || "").toLowerCase().includes(q);
        const matchesId = (c.id || "").toLowerCase().includes(q);
        const matchesDesc = (c.description || "").toLowerCase().includes(q);
        return matchesLabel || matchesId || matchesDesc;
      }
      return true;
    });
  }, [rawComponents, typeFilter, searchQuery]);

  // Compute Degree Map & Real Health Status from compiler findings
  const { degreeMap, healthMap } = useMemo(() => {
    const degrees = new Map();
    const health = new Map();

    rawComponents.forEach((c) => {
      degrees.set(c.id, { inDegree: 0, outDegree: 0, upstream: new Set(), downstream: new Set() });
      
      // Match compiler findings for this component
      const relatedFindings = compilerFindings.filter(
        (f) => f.affectedArtifacts?.includes(c.id) || f.artifact?.id === c.id
      );
      const errors = relatedFindings.filter((f) => f.severity === "error").length;
      const warnings = relatedFindings.filter((f) => f.severity === "warning").length;

      if (errors > 0) {
        health.set(c.id, { status: "error", label: `${errors} Error${errors > 1 ? "s" : ""}`, color: "#f87171" });
      } else if (warnings > 0) {
        health.set(c.id, { status: "warning", label: `${warnings} Warning${warnings > 1 ? "s" : ""}`, color: "#fbbf24" });
      } else {
        health.set(c.id, { status: "healthy", label: "Healthy (0 issues)", color: "#4ade80" });
      }
    });

    rawEdges.forEach((e) => {
      const src = degrees.get(e.source || e.from);
      const tgt = degrees.get(e.target || e.to);
      if (src && tgt) {
        src.outDegree++;
        src.downstream.add(e.target || e.to);
        tgt.inDegree++;
        tgt.upstream.add(e.source || e.from);
      }
    });

    return { degreeMap: degrees, healthMap: health };
  }, [rawComponents, rawEdges, compilerFindings]);

  // Compute Deterministic Multi-Tier Flowchart Layout
  const { nodePositions, layoutEdges, bounds } = useMemo(() => {
    const nodeW = 240;
    const nodeH = 92;
    const positions = new Map();

    if (components.length === 0) {
      return { nodePositions: positions, layoutEdges: [], bounds: { minX: 0, minY: 0, width: 800, height: 400 } };
    }

    // Logical left-to-right tiers
    const tiers = {
      frontend: [],
      gateway: [],
      service: [],
      database: [],
      external: [],
      worker: []
    };

    components.forEach((c) => {
      const info = getComponentTierInfo(c);
      if (tiers[info.tierKey]) tiers[info.tierKey].push(c);
      else tiers.service.push(c);
    });

    const activeTiers = [
      { key: "frontend", title: "Client / Frontend", nodes: tiers.frontend },
      { key: "gateway", title: "API Gateway", nodes: tiers.gateway },
      { key: "service", title: "Backend Services", nodes: tiers.service },
      { key: "database", title: "Data Stores", nodes: tiers.database },
      { key: "external", title: "External AI & APIs", nodes: tiers.external },
      { key: "worker", title: "Background Jobs", nodes: tiers.worker }
    ].filter((t) => t.nodes.length > 0);

    let curX = 60;
    const colSpacing = 140;
    let maxY = 0;

    activeTiers.forEach((tierGroup) => {
      const count = tierGroup.nodes.length;
      const totalColHeight = count * nodeH + (count - 1) * 36;
      let startY = Math.max(50, 160 - totalColHeight / 2);

      tierGroup.nodes.forEach((node, idx) => {
        const y = startY + idx * (nodeH + 36);
        positions.set(node.id, {
          x: curX,
          y,
          w: nodeW,
          h: nodeH,
          tierTitle: tierGroup.title,
          isFirstInTier: idx === 0
        });
        if (y + nodeH > maxY) maxY = y + nodeH;
      });

      curX += nodeW + colSpacing;
    });

    const maxX = curX - colSpacing + 60;

    // Filter valid edges connecting displayed nodes
    const compIds = new Set(components.map((c) => c.id));
    const edges = rawEdges
      .filter((e) => {
        const s = e.source || e.from;
        const t = e.target || e.to;
        return compIds.has(s) && compIds.has(t);
      })
      .map((e, idx) => {
        const s = e.source || e.from;
        const t = e.target || e.to;
        const fromPos = positions.get(s);
        const toPos = positions.get(t);
        const label = e.description || e.label || "communicates with";

        // Classify edge relationship style
        const lower = label.toLowerCase();
        let edgeCategory = "sync"; // sync | async | data
        if (lower.includes("event") || lower.includes("publish") || lower.includes("queue") || lower.includes("async")) {
          edgeCategory = "async";
        } else if (lower.includes("read") || lower.includes("write") || lower.includes("store") || lower.includes("query") || lower.includes("db")) {
          edgeCategory = "data";
        }

        return {
          id: e.id || `edge-${idx}`,
          from: s,
          to: t,
          label,
          edgeCategory,
          fromPos,
          toPos
        };
      });

    return {
      nodePositions: positions,
      layoutEdges: edges,
      bounds: { minX: 0, minY: 0, width: Math.max(900, maxX), height: Math.max(460, maxY + 60) }
    };
  }, [components, rawEdges]);

  // Auto-fit function with sensible viewport clamping
  const handleFitToView = useCallback(() => {
    if (!containerRef.current || bounds.width <= 0 || bounds.height <= 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const pad = 60;
    const scaleX = (clientWidth - pad * 2) / bounds.width;
    const scaleY = (clientHeight - pad * 2) / bounds.height;
    const rawScale = Math.min(scaleX, scaleY);
    // Clamp to readable floor so nodes never shrink into unreadable specks
    const fitZoom = Math.min(1.2, Math.max(0.72, Number(rawScale.toFixed(2))));

    const panX = Math.round((clientWidth - bounds.width * fitZoom) / 2);
    const panY = Math.round((clientHeight - bounds.height * fitZoom) / 2);

    setZoom(fitZoom);
    setPan({ x: Math.max(20, panX), y: Math.max(20, panY) });
  }, [bounds]);

  useEffect(() => {
    const timer = setTimeout(handleFitToView, 60);
    return () => clearTimeout(timer);
  }, [handleFitToView]);

  // Handle Drag / Pan
  const handleMouseDown = (e) => {
    if (e.target.closest(".system-node-card") || e.target.closest(".canvas-control-btn")) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Selected node upstream / downstream dependency sets
  const selectedRelations = useMemo(() => {
    if (!selectedNodeId) return null;
    const deg = degreeMap.get(selectedNodeId);
    if (!deg) return null;
    return {
      upstream: deg.upstream,
      downstream: deg.downstream
    };
  }, [selectedNodeId, degreeMap]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 520,
        background: "radial-gradient(ellipse at 50% 20%, rgba(13, 20, 36, 0.95) 0%, #07090e 100%)",
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        userSelect: isDragging ? "none" : "auto"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ─── Top Control Toolbar ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "8px 14px",
          background: "rgba(10, 14, 22, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          gap: 10,
          zIndex: 10,
          backdropFilter: "blur(8px)"
        }}
      >
        {/* Left: Search & Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 6,
              padding: "3px 8px",
              width: 170
            }}
          >
            <Search size={12} color="#737e92" />
            <input
              type="text"
              placeholder="Search component…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f3f5fa",
                fontSize: 11,
                width: "100%"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)", textTransform: "uppercase" }}>Tier:</span>
            {["ALL", "Frontend", "Gateway", "Service", "Database", "External"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                style={{
                  height: 22,
                  padding: "0 7px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: typeFilter === t ? 700 : 500,
                  background: typeFilter === t ? "rgba(139, 124, 255, 0.25)" : "transparent",
                  color: typeFilter === t ? "#f3f5fa" : "var(--ide-text-muted)",
                  border: typeFilter === t ? "1px solid rgba(139, 124, 255, 0.4)" : "1px solid transparent",
                  cursor: "pointer"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Canvas Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* View Mode Toggle: Canvas vs Table */}
          <button
            type="button"
            className="canvas-control-btn"
            onClick={() => setViewMode(viewMode === "canvas" ? "table" : "canvas")}
            title={viewMode === "canvas" ? "Switch to Component Table List" : "Switch to Architecture Canvas"}
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              background: viewMode === "table" ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: viewMode === "table" ? "#38bdf8" : "#94a3b8",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer"
            }}
          >
            {viewMode === "canvas" ? <TableIcon size={12} /> : <Network size={12} />}
            {viewMode === "canvas" ? "List View" : "Canvas"}
          </button>

          {/* Toggle Labels */}
          <button
            type="button"
            className="canvas-control-btn"
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? "Hide Edge Labels" : "Show Edge Labels"}
            style={{
              height: 26,
              width: 26,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: showLabels ? "#38bdf8" : "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            {showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Flow Animation Toggle */}
          <button
            type="button"
            className="canvas-control-btn"
            onClick={() => setIsAnimationRunning(!isAnimationRunning)}
            title={isAnimationRunning ? "Pause Motion" : "Resume Flow Motion"}
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              background: isAnimationRunning ? "rgba(66, 214, 164, 0.15)" : "rgba(255, 255, 255, 0.04)",
              border: isAnimationRunning ? "1px solid rgba(66, 214, 164, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
              color: isAnimationRunning ? "#42d6a4" : "#94a3b8",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer"
            }}
          >
            <Zap size={12} />
            {isAnimationRunning ? "Flow ON" : "Flow OFF"}
          </button>

          {/* Zoom Controls */}
          <button
            type="button"
            className="canvas-control-btn"
            onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            style={{
              height: 26,
              width: 26,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <ZoomIn size={12} />
          </button>

          <button
            type="button"
            className="canvas-control-btn"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            style={{
              height: 26,
              width: 26,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <ZoomOut size={12} />
          </button>

          <button
            type="button"
            className="canvas-control-btn"
            onClick={handleFitToView}
            title="Fit to View"
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer"
            }}
          >
            <Crosshair size={12} /> Fit
          </button>
        </div>
      </div>

      {/* ─── Main Body: Table View or SVG/DOM Canvas ─────────────────────── */}
      {viewMode === "table" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#737e92" }}>
                <th style={{ padding: "8px 12px" }}>COMPONENT</th>
                <th style={{ padding: "8px 12px" }}>TIER</th>
                <th style={{ padding: "8px 12px" }}>HEALTH STATUS</th>
                <th style={{ padding: "8px 12px" }}>IN / OUT DEGREES</th>
                <th style={{ padding: "8px 12px" }}>DESCRIPTION</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => {
                const info = getComponentTierInfo(c);
                const health = healthMap.get(c.id) || { label: "Healthy", color: "#4ade80" };
                const deg = degreeMap.get(c.id) || { inDegree: 0, outDegree: 0 };
                const Icon = info.icon;
                const isSelected = selectedNodeId === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectNode(c)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: isSelected ? "rgba(139, 124, 255, 0.12)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#f3f5fa" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: info.accentColor }}><Icon size={14} /></span>
                        <span>{c.label || c.name || c.id}</span>
                        <code style={{ fontSize: 10, color: "#737e92" }}>{c.id}</code>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: info.bg,
                          color: info.accentColor,
                          border: `1px solid ${info.border}`
                        }}
                      >
                        {info.tierLabel}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, color: health.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: health.color }} />
                        {health.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#94a3b8" }}>
                      ↓ {deg.inDegree} in &nbsp; ↑ {deg.outDegree} out
                    </td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.description || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectForImpact) onSelectForImpact(c);
                        }}
                        style={{
                          fontSize: 10,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#cbd5e1",
                          cursor: "pointer"
                        }}
                      >
                        Simulate Impact
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Canvas View */
        <div
          style={{
            flex: 1,
            position: "relative",
            cursor: isDragging ? "grabbing" : "grab",
            overflow: "hidden"
          }}
        >
          {/* Zoom & Pan Container */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: bounds.width,
              height: bounds.height,
              transition: isDragging ? "none" : "transform 0.1s ease-out"
            }}
          >
            {/* SVG Layer for Edges, Directed Arrows & Particles */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: bounds.width,
                height: bounds.height,
                pointerEvents: "none"
              }}
            >
              <defs>
                <marker
                  id="sysmap-arrow-sync"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
                </marker>
                <marker
                  id="sysmap-arrow-async"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="sysmap-arrow-data"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#42d6a4" />
                </marker>
                <marker
                  id="sysmap-arrow-selected"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Render Connections */}
              {layoutEdges.map((edge) => {
                if (!edge.fromPos || !edge.toPos) return null;
                const isSelected = selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);
                const isDimmed = selectedNodeId && !isSelected;

                const startX = edge.fromPos.x + edge.fromPos.w;
                const startY = edge.fromPos.y + edge.fromPos.h / 2;
                const endX = edge.toPos.x;
                const endY = edge.toPos.y + edge.toPos.h / 2;

                const dx = Math.max(40, (endX - startX) * 0.45);
                const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                let strokeColor = "#818cf8";
                let markerId = "sysmap-arrow-sync";
                let strokeDash = "none";

                if (edge.edgeCategory === "async") {
                  strokeColor = "#f59e0b";
                  markerId = "sysmap-arrow-async";
                  strokeDash = "5 4";
                } else if (edge.edgeCategory === "data") {
                  strokeColor = "#42d6a4";
                  markerId = "sysmap-arrow-data";
                }

                if (isSelected) {
                  strokeColor = "#38bdf8";
                  markerId = "sysmap-arrow-selected";
                }

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                return (
                  <g key={edge.id} opacity={isDimmed ? 0.15 : 1} style={{ transition: "opacity 0.2s ease" }}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.6}
                      strokeDasharray={strokeDash}
                      markerEnd={`url(#${markerId})`}
                    />

                    {/* Animated Flow Particles */}
                    {isAnimationRunning && !isDimmed && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 3 : 2}
                        strokeDasharray="6 30"
                        className="flow-marching-ants"
                        opacity={0.8}
                      />
                    )}

                    {/* Meaningful Edge Operation Label */}
                    {showLabels && !isDimmed && (
                      <g transform={`translate(${midX}, ${midY - 8})`}>
                        <rect
                          x={-Math.min(90, edge.label.length * 3.4 + 8)}
                          y={-9}
                          width={Math.min(180, edge.label.length * 6.8 + 16)}
                          height={18}
                          rx={4}
                          fill="rgba(10, 14, 22, 0.9)"
                          stroke={isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.12)"}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill={isSelected ? "#f3f5fa" : "#94a3b8"}
                          fontSize={9.5}
                          fontFamily="sans-serif"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* DOM Layer for Component Nodes */}
            {components.map((comp) => {
              const pos = nodePositions.get(comp.id);
              if (!pos) return null;

              const info = getComponentTierInfo(comp);
              const Icon = info.icon;
              const isSelected = selectedNodeId === comp.id;
              const health = healthMap.get(comp.id) || { label: "Healthy", color: "#4ade80" };
              const deg = degreeMap.get(comp.id) || { inDegree: 0, outDegree: 0 };

              // Determine dimming
              let isDimmed = false;
              let isUpstream = false;
              let isDownstream = false;

              if (selectedRelations) {
                if (comp.id === selectedNodeId) {
                  // Primary active
                } else if (selectedRelations.upstream.has(comp.id)) {
                  isUpstream = true;
                } else if (selectedRelations.downstream.has(comp.id)) {
                  isDownstream = true;
                } else {
                  isDimmed = true;
                }
              }

              return (
                <div
                  key={comp.id}
                  className={`system-node-card ${isSelected ? "node-active-glow" : ""}`}
                  onClick={() => onSelectNode(comp)}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    width: pos.w,
                    minHeight: pos.h,
                    background: isSelected
                      ? "rgba(18, 24, 38, 0.96)"
                      : isUpstream || isDownstream
                      ? "rgba(15, 20, 32, 0.94)"
                      : "rgba(10, 14, 22, 0.9)",
                    border: `1.5px solid ${
                      isSelected
                        ? "#38bdf8"
                        : isUpstream
                        ? "#818cf8"
                        : isDownstream
                        ? "#42d6a4"
                        : info.border
                    }`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    boxShadow: isSelected
                      ? `0 0 20px ${info.glow}`
                      : "0 4px 12px rgba(0, 0, 0, 0.35)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    opacity: isDimmed ? 0.25 : 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  {/* Top Bar: Icon + Type Badge + Degree */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: info.accentColor }}>
                        <Icon size={14} />
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: info.accentColor,
                          letterSpacing: "0.04em"
                        }}
                      >
                        {info.typeLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        title={`Incoming: ${deg.inDegree}, Outgoing: ${deg.outDegree}`}
                        style={{
                          fontSize: 9.5,
                          fontFamily: "monospace",
                          color: "#737e92",
                          background: "rgba(255, 255, 255, 0.04)",
                          padding: "1px 5px",
                          borderRadius: 3
                        }}
                      >
                        ↓{deg.inDegree} ↑{deg.outDegree}
                      </span>
                    </div>
                  </div>

                  {/* Component Title & Artifact ID */}
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f3f5fa",
                        lineHeight: 1.2
                      }}
                    >
                      {comp.label || comp.name || comp.id}
                    </h4>
                    <span style={{ fontSize: 9.5, fontFamily: "monospace", color: "#64748b" }}>
                      {comp.id}
                    </span>
                  </div>

                  {/* Bottom: Health Indicator & Description */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 4,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)"
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        color: health.color,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: health.color }} />
                      {health.label}
                    </span>

                    {(isUpstream || isDownstream) && (
                      <span
                        style={{
                          fontSize: 8.5,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: isUpstream ? "rgba(129, 140, 248, 0.2)" : "rgba(66, 214, 164, 0.2)",
                          color: isUpstream ? "#818cf8" : "#42d6a4",
                          fontFamily: "monospace"
                        }}
                      >
                        {isUpstream ? "UPSTREAM" : "DOWNSTREAM"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Bottom-Left Legend ─────────────────────────────────────── */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 12px",
              background: "rgba(10, 14, 22, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 6,
              fontSize: 10,
              color: "#94a3b8",
              backdropFilter: "blur(6px)",
              zIndex: 5
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2, background: "#818cf8", display: "inline-block" }} />
              <span>Synchronous HTTP</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2, borderTop: "2px dashed #f59e0b", display: "inline-block" }} />
              <span>Async Event / Queue</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2, background: "#42d6a4", display: "inline-block" }} />
              <span>Database Query / Persist</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
