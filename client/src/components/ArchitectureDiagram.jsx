import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2,
  Crosshair, Globe, Server, Database, Zap, Cpu, Workflow,
  Shield, Layers, CheckCircle2, ArrowRight, Activity, Sparkles,
  Info, ExternalLink
} from "lucide-react";

// Categorize architectural node for icon and styling
function getNodeTypeInfo(node) {
  const t = (node.type || "").toLowerCase();
  const l = (node.label || node.id || "").toLowerCase();

  if (t.includes("front") || t.includes("client") || t.includes("ui") || t.includes("web") || l.includes("interface") || l.includes("ui")) {
    return { category: "frontend", label: "FRONTEND TIER", icon: Globe, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)", border: "#38bdf8", glow: "rgba(56, 189, 248, 0.35)" };
  }
  if (t.includes("gateway") || t.includes("proxy") || t.includes("ingress") || l.includes("gateway")) {
    return { category: "gateway", label: "API GATEWAY", icon: Shield, color: "#818cf8", bg: "rgba(129, 140, 248, 0.12)", border: "#818cf8", glow: "rgba(129, 140, 248, 0.35)" };
  }
  if (t.includes("cache") || t.includes("redis") || l.includes("redis") || l.includes("cache")) {
    return { category: "cache", label: "IN-MEMORY CACHE", icon: Zap, color: "#53d7f4", bg: "rgba(83, 215, 244, 0.12)", border: "#53d7f4", glow: "rgba(83, 215, 244, 0.35)" };
  }
  if (t.includes("data") || t.includes("db") || t.includes("mongo") || t.includes("sql") || l.includes("store") || l.includes("database")) {
    return { category: "database", label: "PRIMARY DATABASE", icon: Database, color: "#42d6a4", bg: "rgba(66, 214, 164, 0.12)", border: "#42d6a4", glow: "rgba(66, 214, 164, 0.35)" };
  }
  if (t.includes("worker") || t.includes("queue") || t.includes("kafka") || t.includes("job")) {
    return { category: "worker", label: "ASYNC WORKER", icon: Workflow, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "#f59e0b", glow: "rgba(245, 158, 11, 0.35)" };
  }
  return { category: "service", label: "BACKEND SERVICE", icon: Cpu, color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)", border: "#a78bfa", glow: "rgba(167, 139, 250, 0.35)" };
}

export default function ArchitectureDiagram({ architecture }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimationRunning, setIsAnimationRunning] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState("normal"); // "normal" | "fast"
  const dragStartRef = useRef({ x: 0, y: 0 });

  const rawNodes = Array.isArray(architecture?.nodes) ? architecture.nodes : [];
  const rawEdges = Array.isArray(architecture?.edges) ? architecture.edges : [];

  // Compute multi-tier flowchart layout with generous spacing and distinct X tiers
  const { nodePositions, layoutEdges, bounds } = useMemo(() => {
    const nodeW = 236;
    const nodeH = 78;
    const positions = new Map();

    if (rawNodes.length === 0) {
      return { nodePositions: positions, layoutEdges: [], bounds: { minX: 0, minY: 0, width: 800, height: 400 } };
    }

    // Group nodes into topological tiers: Frontend -> Gateway -> Core Services -> Database/Cache
    const tiers = {
      frontend: [],
      gateway: [],
      service: [],
      database: []
    };

    rawNodes.forEach(node => {
      const info = getNodeTypeInfo(node);
      if (info.category === "frontend") tiers.frontend.push(node);
      else if (info.category === "gateway") tiers.gateway.push(node);
      else if (info.category === "database" || info.category === "cache") tiers.database.push(node);
      else tiers.service.push(node);
    });

    const activeTiers = [
      { key: "frontend", title: "Client Layer", nodes: tiers.frontend },
      { key: "gateway", title: "API Gateway", nodes: tiers.gateway },
      { key: "service", title: "Application Services", nodes: tiers.service },
      { key: "database", title: "Data & Storage Tier", nodes: tiers.database }
    ].filter(t => t.nodes.length > 0);

    let curX = 60;
    const colSpacing = 120;
    const rowSpacing = 114;
    let maxY = 420;

    activeTiers.forEach((tier) => {
      const startY = 80;
      tier.nodes.forEach((node, rowIdx) => {
        const y = startY + rowIdx * rowSpacing;
        positions.set(node.id, {
          x: curX,
          y,
          width: nodeW,
          height: nodeH,
          data: node,
          info: getNodeTypeInfo(node)
        });
        if (y + nodeH > maxY) maxY = y + nodeH;
      });
      curX += nodeW + colSpacing;
    });

    // Fallback if no tier matching happened
    if (positions.size === 0) {
      rawNodes.forEach((node, i) => {
        positions.set(node.id, {
          x: 60 + (i % 3) * 330,
          y: 80 + Math.floor(i / 3) * 130,
          width: nodeW,
          height: nodeH,
          data: node,
          info: getNodeTypeInfo(node)
        });
      });
    }

    // Map and calculate edge paths with smooth bezier curves
    const edgesWithCoords = rawEdges.map((e, idx) => {
      const src = positions.get(e.from);
      const tgt = positions.get(e.to);
      if (!src || !tgt) return null;

      // Start from right of source to left of target
      const x1 = src.x + src.width;
      const y1 = src.y + src.height / 2;
      const x2 = tgt.x;
      const y2 = tgt.y + tgt.height / 2;

      // Cubic bezier control points
      const dx = Math.abs(x2 - x1) * 0.5;
      const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      return {
        id: `topo-edge-${idx}`,
        from: e.from,
        to: e.to,
        label: e.label || "invokes",
        pathD,
        x1, y1, x2, y2,
        midX, midY,
        srcInfo: src.info,
        tgtInfo: tgt.info
      };
    }).filter(Boolean);

    const maxX = curX;
    return {
      nodePositions: positions,
      layoutEdges: edgesWithCoords,
      bounds: { minX: 40, minY: 40, width: Math.max(760, maxX + 60), height: Math.max(460, maxY + 100) }
    };
  }, [rawNodes, rawEdges]);

  // Mathematically Symmetrical Fit-to-View with healthy minimum zoom
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const graphW = bounds.width;
    const graphH = bounds.height;

    const scaleX = (clientWidth - 70) / graphW;
    const scaleY = (clientHeight - 70) / graphH;
    const newZoom = Math.max(0.72, Math.min(1.15, Math.min(scaleX, scaleY)));

    const offsetX = Math.round((clientWidth - graphW * newZoom) / 2);
    const offsetY = Math.round((clientHeight - graphH * newZoom) / 2);

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.max(20, offsetX), y: Math.max(20, offsetY) });
  }, [bounds]);

  useEffect(() => {
    const timer = setTimeout(fitToView, 80);
    return () => clearTimeout(timer);
  }, [fitToView]);

  // Drag canvas handlers
  function handleMouseDown(e) {
    if (e.target.closest("button") || e.target.closest(".topo-node-card")) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(z => Number(Math.max(0.3, Math.min(2.0, z + delta)).toFixed(2)));
  }

  const selectedNode = selectedNodeId ? nodePositions.get(selectedNodeId) : null;

  return (
    <div
      style={fullscreen ? {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#08090d",
        display: "flex",
        flexDirection: "column"
      } : {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 520,
        background: "radial-gradient(ellipse at top, #111522 0%, #07090e 100%)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* ─── Slim Interactive Header ────────────────────────────────────────── */}
      <div style={{
        height: 42,
        padding: "0 14px",
        background: "rgba(10, 12, 18, 0.96)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        zIndex: 10,
        userSelect: "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 4,
            background: "rgba(83, 215, 244, 0.15)",
            color: "#53d7f4",
            border: "1px solid rgba(83, 215, 244, 0.3)"
          }}>
            <Activity size={12} className={isAnimationRunning ? "pulse-anim" : ""} />
            ANIMATED FLOWCHART TOPOLOGY
          </span>
          <strong style={{ fontSize: 13, color: "#f3f5fa" }}>
            Component Topology ({rawNodes.length} services, {rawEdges.length} connections)
          </strong>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setIsAnimationRunning(!isAnimationRunning)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 6,
              background: isAnimationRunning ? "rgba(66, 214, 164, 0.15)" : "rgba(255,255,255,0.04)",
              color: isAnimationRunning ? "#42d6a4" : "var(--ide-text-muted)",
              border: isAnimationRunning ? "1px solid rgba(66, 214, 164, 0.3)" : "1px solid rgba(255,255,255,0.08)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer"
            }}
            title="Toggle Live Particle Pulse Flow"
          >
            <Sparkles size={11} />
            <span>{isAnimationRunning ? "Flow Animation: ON" : "Flow Animation: OFF"}</span>
          </button>

          {isAnimationRunning && (
            <button
              onClick={() => setAnimationSpeed(s => s === "normal" ? "fast" : "normal")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(83, 215, 244, 0.12)",
                color: "#53d7f4",
                border: "1px solid rgba(83, 215, 244, 0.25)",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer"
              }}
              title="Toggle animation speed"
            >
              <Activity size={10} />
              <span>Speed: {animationSpeed === "normal" ? "1x" : "2x"}</span>
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 2 }}>
            <button
              onClick={() => setZoom(z => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-muted)", padding: "3px 6px", cursor: "pointer" }}
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 10, color: "var(--ide-text-dim)", minWidth: 32, textAlign: "center", fontFamily: "var(--ide-font-mono)" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-muted)", padding: "3px 6px", cursor: "pointer" }}
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={fitToView}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-muted)", padding: "3px 6px", cursor: "pointer" }}
              title="Fit to view"
            >
              <Crosshair size={13} />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 60, y: 60 }); }}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-muted)", padding: "3px 6px", cursor: "pointer" }}
              title="Reset"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: "var(--ide-text-muted)",
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ─── Main Flowchart Canvas with Animated SVG Connectors ─────────────── */}
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
          cursor: isDragging ? "grabbing" : "grab"
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ display: "block", position: "absolute", inset: 0 }}
        >
          <defs>
            {/* Grid background */}
            <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.05)" />
            </pattern>

            {/* Standard Arrow Marker */}
            <marker id="topo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#53d7f4" />
            </marker>
            <marker id="topo-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#8b7cff" />
            </marker>

            {/* Glowing Flow Filter */}
            <filter id="topo-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Scaled & Panned Viewport */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Dot grid */}
            <rect
              x={bounds.minX - 1000}
              y={bounds.minY - 1000}
              width={bounds.width + 2000}
              height={bounds.height + 2000}
              fill="url(#topo-grid)"
            />

            {/* ─── Animated Connecting Flow Lines ───────────────────────────── */}
            {layoutEdges.map(edge => {
              const isConnectedToSelected = selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);
              const strokeColor = isConnectedToSelected ? "#8b7cff" : "rgba(83, 215, 244, 0.45)";
              const strokeWidth = isConnectedToSelected ? 2.6 : 1.8;
              const flowDuration = animationSpeed === "fast" ? "1.2s" : "2.2s";
              const halfDuration = animationSpeed === "fast" ? "-0.6s" : "-1.1s";

              return (
                <g key={edge.id} className="topo-edge-group">
                  {/* Base Glow Line */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isAnimationRunning ? "6 6" : "none"}
                    className={isAnimationRunning ? (animationSpeed === "fast" ? "flow-marching-ants-fast" : "flow-marching-ants") : ""}
                    markerEnd={isConnectedToSelected ? "url(#topo-arrow-active)" : "url(#topo-arrow)"}
                  />

                  {/* Flowing Glowing Light Pulse Particles - Dual Wave */}
                  {isAnimationRunning && (
                    <g>
                      {/* Wave 1 */}
                      <circle r="5" fill={isConnectedToSelected ? "#ff737d" : "#53d7f4"} filter="url(#topo-glow)">
                        <animateMotion
                          path={edge.pathD}
                          dur={flowDuration}
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle r="2.2" fill="#ffffff">
                        <animateMotion
                          path={edge.pathD}
                          dur={flowDuration}
                          repeatCount="indefinite"
                        />
                      </circle>

                      {/* Wave 2 (offset) */}
                      <circle r="4" fill={isConnectedToSelected ? "#ff737d" : "#53d7f4"} opacity={0.7} filter="url(#topo-glow)">
                        <animateMotion
                          path={edge.pathD}
                          dur={flowDuration}
                          begin={halfDuration}
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle r="1.8" fill="#ffffff">
                        <animateMotion
                          path={edge.pathD}
                          dur={flowDuration}
                          begin={halfDuration}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  )}

                  {/* Connection Label Pill */}
                  <g transform={`translate(${edge.midX}, ${edge.midY})`}>
                    <rect
                      x={-34}
                      y={-10}
                      width={68}
                      height={20}
                      rx={5}
                      fill="#0c0f17"
                      stroke={strokeColor}
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={4}
                      fill="#f3f5fa"
                      fontSize="9"
                      fontFamily="var(--ide-font-mono)"
                      fontWeight="650"
                      textAnchor="middle"
                    >
                      {edge.label?.slice(0, 12)}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* ─── Graphical Flowchart Node Cards with Icons ─────────────────── */}
            {Array.from(nodePositions.values()).map(node => {
              const isSelected = selectedNodeId === node.data.id;
              const Icon = node.info.icon;

              return (
                <g
                  key={node.data.id}
                  className="topo-node-card"
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.data.id)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer Glow on Selected */}
                  {isSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={node.width + 8}
                      height={node.height + 8}
                      rx={10}
                      fill="none"
                      stroke="var(--ide-accent)"
                      strokeWidth={2}
                      filter="url(#topo-glow)"
                    />
                  )}

                  {/* Card Body */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={8}
                    fill="#111520"
                    stroke={isSelected ? "var(--ide-accent)" : node.info.border}
                    strokeWidth={isSelected ? 2 : 1.2}
                    filter="drop-shadow(0 4px 14px rgba(0,0,0,0.5))"
                  />

                  {/* Live Status indicator in top right */}
                  <circle cx={node.width - 18} cy={18} r={3.5} fill="#42d6a4" className="pulse-anim" />
                  <circle cx={node.width - 18} cy={18} r={7} fill="none" stroke="#42d6a4" strokeWidth={0.8} opacity={0.6} />
                  <text x={node.width - 28} y={21} fill="#42d6a4" fontSize="8" fontWeight="800" textAnchor="end">LIVE</text>

                  {/* Icon Badge container on Left */}
                  <rect
                    x={8}
                    y={12}
                    width={50}
                    height={50}
                    rx={6}
                    fill={node.info.bg}
                    stroke={node.info.border}
                    strokeWidth={0.8}
                  />

                  {/* Render Icon via foreignObject */}
                  <foreignObject x={8} y={12} width={50} height={50}>
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: node.info.color }}>
                      <Icon size={24} />
                    </div>
                  </foreignObject>

                  {/* Tier Category Eyebrow */}
                  <text
                    x={68}
                    y={26}
                    fill={node.info.color}
                    fontSize="9"
                    fontWeight="800"
                    letterSpacing="0.08em"
                    textTransform="uppercase"
                  >
                    {node.info.label}
                  </text>

                  {/* Component Title */}
                  <text
                    x={68}
                    y={43}
                    fill="#f3f5fa"
                    fontSize="13"
                    fontWeight="700"
                  >
                    {node.data.label?.length > 17 ? `${node.data.label.slice(0, 16)}…` : node.data.label}
                  </text>

                  {/* Component ID / Subtitle */}
                  <text
                    x={68}
                    y={58}
                    fill="var(--ide-text-dim)"
                    fontSize="10"
                    fontFamily="var(--ide-font-mono)"
                  >
                    {node.data.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ─── Selected Node Deep Dive Inspector (Overlay) ────────────────── */}
        {selectedNode && (
          <div style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            background: "rgba(13, 16, 24, 0.94)",
            border: "1px solid rgba(139, 124, 255, 0.4)",
            borderRadius: 8,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            zIndex: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: selectedNode.info.bg,
                color: selectedNode.info.color,
                display: "grid",
                placeItems: "center"
              }}>
                <selectedNode.info.icon size={18} />
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 14, color: "#f3f5fa" }}>{selectedNode.data.label}</strong>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: selectedNode.info.bg, color: selectedNode.info.color, fontWeight: 700 }}>
                    {selectedNode.info.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--ide-text-secondary)" }}>
                  {selectedNode.data.description || "Active architectural component."}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedNodeId(null)}
              style={{ background: "transparent", border: "none", color: "var(--ide-text-dim)", cursor: "pointer", fontSize: 12 }}
            >
              Close ✕
            </button>
          </div>
        )}
      </div>

      {/* ─── Bottom Component Ledger Strip ─────────────────────────────────── */}
      <div style={{
        padding: "8px 14px",
        background: "rgba(8, 10, 15, 0.98)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        overflowX: "auto",
        flexShrink: 0,
        fontSize: 11
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ide-text-dim)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          COMPONENTS ({rawNodes.length}):
        </span>
        {rawNodes.map(node => {
          const info = getNodeTypeInfo(node);
          const isSelected = selectedNodeId === node.id;
          const Icon = info.icon;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                borderRadius: 4,
                background: isSelected ? info.bg : "rgba(255,255,255,0.03)",
                border: isSelected ? `1px solid ${info.border}` : "1px solid rgba(255,255,255,0.06)",
                color: isSelected ? info.color : "var(--ide-text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              <Icon size={12} />
              <span>{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
