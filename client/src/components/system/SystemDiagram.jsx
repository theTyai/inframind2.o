import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Globe, Server, Database, Sparkles, Cpu, Shield, Workflow,
  AlertTriangle, AlertCircle, ArrowRight
} from "lucide-react";

// Categorize architectural component into canonical trust boundary & tier
function getComponentTier(comp = {}) {
  const t = (comp.componentType || comp.type || "").toLowerCase();
  const l = (comp.label || comp.name || comp.id || "").toLowerCase();
  const tier = comp.tier || "";

  if (tier === "frontend" || t.includes("front") || t.includes("client") || t.includes("ui") || t.includes("web") || l.includes("interface") || l.includes("ui")) {
    return {
      boundaryKey: "client",
      boundaryLabel: "Client (Untrusted)",
      icon: Globe,
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.08)",
      border: "rgba(56, 189, 248, 0.35)"
    };
  }
  if (tier === "database" || t.includes("data") || t.includes("db") || t.includes("mongo") || t.includes("sql") || l.includes("store") || l.includes("database")) {
    return {
      boundaryKey: "data",
      boundaryLabel: "Data Tier (Restricted)",
      icon: Database,
      color: "#42d6a4",
      bg: "rgba(66, 214, 164, 0.08)",
      border: "rgba(66, 214, 164, 0.35)"
    };
  }
  if (tier === "external" || t.includes("external") || t.includes("ai") || t.includes("llm") || l.includes("llm") || l.includes("openai") || l.includes("anthropic")) {
    return {
      boundaryKey: "external",
      boundaryLabel: "External AI & APIs",
      icon: Sparkles,
      color: "#ec4899",
      bg: "rgba(236, 72, 153, 0.08)",
      border: "rgba(236, 72, 153, 0.35)"
    };
  }
  return {
    boundaryKey: "server",
    boundaryLabel: "Your Server (Trusted Private Network)",
    icon: Cpu,
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.08)",
    border: "rgba(167, 139, 250, 0.35)"
  };
}

export default function SystemDiagram({
  canonicalModel = {},
  compilerFindings = [],
  selectedNodeId = null,
  onSelectNode = () => {},
  activeFlowPath = null, // array of node IDs participating in active request trace
  zoom = 1,
  setZoom = () => {},
  pan = { x: 40, y: 40 },
  setPan = () => {}
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const rawComponents = Array.isArray(canonicalModel.components) ? canonicalModel.components : [];
  const rawEdges = Array.isArray(canonicalModel.dependencies) ? canonicalModel.dependencies : [];
  const apis = Array.isArray(canonicalModel.apis) ? canonicalModel.apis : [];
  const entities = Array.isArray(canonicalModel.entities) ? canonicalModel.entities : [];

  // Identify problems for each component: SILENCE MEANS HEALTHY (show badge only if error/warning!)
  const problemMap = useMemo(() => {
    const problems = new Map();
    rawComponents.forEach((c) => {
      const related = compilerFindings.filter(
        (f) => f.affectedArtifacts?.includes(c.id) || f.artifact?.id === c.id
      );
      const errors = related.filter((f) => f.severity === "error").length;
      const warnings = related.filter((f) => f.severity === "warning").length;

      if (errors > 0) {
        problems.set(c.id, { severity: "error", label: `${errors} issue${errors > 1 ? "s" : ""}`, color: "#f87171" });
      } else if (warnings > 0) {
        problems.set(c.id, { severity: "warning", label: `${warnings} warning${warnings > 1 ? "s" : ""}`, color: "#fbbf24" });
      }
    });
    return problems;
  }, [rawComponents, compilerFindings]);

  // Compute Hub-and-Spoke Layout with Trust Boundaries
  // Client (left) -> API Server (center hub) -> DB (right top) & LLM/External (right bottom)
  const { nodePositions, layoutEdges, boundaryRegions, bounds } = useMemo(() => {
    const nodeW = 240;
    const nodeH = 92;
    const positions = new Map();

    if (rawComponents.length === 0) {
      return {
        nodePositions: positions,
        layoutEdges: [],
        boundaryRegions: [],
        bounds: { width: 800, height: 450 }
      };
    }

    const clientNodes = [];
    const serverNodes = [];
    const dataNodes = [];
    const externalNodes = [];

    rawComponents.forEach((c) => {
      const info = getComponentTier(c);
      if (info.boundaryKey === "client") clientNodes.push(c);
      else if (info.boundaryKey === "data") dataNodes.push(c);
      else if (info.boundaryKey === "external") externalNodes.push(c);
      else serverNodes.push(c);
    });

    // Positions layout:
    // Column 1: Client UI (x = 80)
    // Column 2: API Server (x = 420)
    // Column 3: Data Store (top) & LLM (bottom) (x = 760)
    const clientX = 80;
    const serverX = 420;
    const spokeX = 760;

    let startY = 100;

    clientNodes.forEach((c, i) => {
      positions.set(c.id, { x: clientX, y: startY + i * 140, w: nodeW, h: nodeH, boundary: "client" });
    });

    serverNodes.forEach((c, i) => {
      positions.set(c.id, { x: serverX, y: startY + i * 140, w: nodeW, h: nodeH, boundary: "server" });
    });

    dataNodes.forEach((c, i) => {
      positions.set(c.id, { x: spokeX, y: startY + i * 140, w: nodeW, h: nodeH, boundary: "data" });
    });

    const externalStartY = startY + dataNodes.length * 140;
    externalNodes.forEach((c, i) => {
      positions.set(c.id, { x: spokeX, y: externalStartY + i * 140, w: nodeW, h: nodeH, boundary: "external" });
    });

    // Fallback for any unpositioned node
    rawComponents.forEach((c, idx) => {
      if (!positions.has(c.id)) {
        positions.set(c.id, { x: 420, y: startY + idx * 140, w: nodeW, h: nodeH, boundary: "server" });
      }
    });

    // Compute bounding boxes for visual trust boundaries
    const regions = [
      { key: "client", label: "Client", x: clientX - 24, y: startY - 36, w: nodeW + 48, h: Math.max(160, clientNodes.length * 140 + 20), color: "#38bdf8" },
      { key: "server", label: "Your Server", x: serverX - 24, y: startY - 36, w: nodeW + 48, h: Math.max(160, serverNodes.length * 140 + 20), color: "#a78bfa" },
      { key: "data_ext", label: "Data & External", x: spokeX - 24, y: startY - 36, w: nodeW + 48, h: Math.max(220, (dataNodes.length + externalNodes.length) * 140 + 20), color: "#42d6a4" }
    ];

    // Build directed edges with meaningful protocols & purpose
    const compIds = new Set(rawComponents.map((c) => c.id));
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

        // Derive real protocol & purpose
        const srcComp = rawComponents.find((c) => c.id === s);
        const tgtComp = rawComponents.find((c) => c.id === t);
        const tgtTier = getComponentTier(tgtComp);

        let protocolLabel = "HTTPS · REST";
        if (tgtTier.boundaryKey === "data") {
          protocolLabel = "Mongoose · Document Query & Write";
        } else if (tgtTier.boundaryKey === "external") {
          protocolLabel = "LLM API · Prompt & Stream";
        } else if (e.description && e.description !== "communicates with") {
          protocolLabel = e.description;
        }

        return {
          id: e.id || `edge-${idx}`,
          from: s,
          to: t,
          label: protocolLabel,
          fromPos,
          toPos
        };
      });

    const maxX = spokeX + nodeW + 100;
    const maxY = Math.max(startY + 320, (Math.max(clientNodes.length, serverNodes.length, dataNodes.length + externalNodes.length) * 140) + 120);

    return {
      nodePositions: positions,
      layoutEdges: edges,
      boundaryRegions: regions,
      bounds: { width: Math.max(1050, maxX), height: Math.max(500, maxY) }
    };
  }, [rawComponents, rawEdges]);

  // Fit to View that SCALES UP as well as down!
  // Ensures a 4-node system fills at least 70% of the canvas.
  const handleFitToView = useCallback(() => {
    if (!containerRef.current || bounds.width <= 0 || bounds.height <= 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const pad = 40;
    const scaleX = (clientWidth - pad * 2) / bounds.width;
    const scaleY = (clientHeight - pad * 2) / bounds.height;
    const rawScale = Math.min(scaleX, scaleY);

    // Scale up for small graphs to fill >= 70% of canvas! (Clamped between 0.85 and 1.6)
    const fitZoom = Number(Math.min(1.5, Math.max(0.85, rawScale)).toFixed(2));
    const panX = Math.round((clientWidth - bounds.width * fitZoom) / 2);
    const panY = Math.round((clientHeight - bounds.height * fitZoom) / 2);

    setZoom(fitZoom);
    setPan({ x: Math.max(16, panX), y: Math.max(16, panY) });
  }, [bounds, setZoom, setPan]);

  useEffect(() => {
    const timer = setTimeout(handleFitToView, 60);
    return () => clearTimeout(timer);
  }, [handleFitToView]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest(".system-node-card")) return;
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

  // Selection focus
  const selectedConnectedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set([selectedNodeId]);
    layoutEdges.forEach((e) => {
      if (e.from === selectedNodeId) set.add(e.to);
      if (e.to === selectedNodeId) set.add(e.from);
    });
    return set;
  }, [selectedNodeId, layoutEdges]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 520,
        background: "#080a0f",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: isDragging ? "none" : "auto"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: bounds.width,
          height: bounds.height,
          transition: isDragging ? "none" : "transform 0.12s ease-out"
        }}
      >
        {/* Visual Trust Boundaries */}
        {boundaryRegions.map((r) => (
          <div
            key={r.key}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderRadius: 12,
              border: "1px dashed rgba(255, 255, 255, 0.09)",
              background: "rgba(255, 255, 255, 0.012)",
              pointerEvents: "none"
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 12,
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                letterSpacing: "0.02em"
              }}
            >
              {r.label}
            </span>
          </div>
        ))}

        {/* SVG Connections Layer */}
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
              id="edge-arrow"
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
              id="edge-arrow-highlight"
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

          {layoutEdges.map((edge) => {
            if (!edge.fromPos || !edge.toPos) return null;

            const isFlowActive =
              activeFlowPath &&
              activeFlowPath.includes(edge.from) &&
              activeFlowPath.includes(edge.to);

            const isSelected =
              selectedNodeId &&
              (edge.from === selectedNodeId || edge.to === selectedNodeId);

            const isDimmed =
              (selectedConnectedIds && !isSelected) ||
              (activeFlowPath && !isFlowActive && !selectedNodeId);

            const startX = edge.fromPos.x + edge.fromPos.w;
            const startY = edge.fromPos.y + edge.fromPos.h / 2;
            const endX = edge.toPos.x;
            const endY = edge.toPos.y + edge.toPos.h / 2;

            const dx = Math.max(40, (endX - startX) * 0.45);
            const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

            const strokeColor = isFlowActive || isSelected ? "#38bdf8" : "#818cf8";
            const markerId = isFlowActive || isSelected ? "edge-arrow-highlight" : "edge-arrow";

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <g key={edge.id} opacity={isDimmed ? 0.18 : 1} style={{ transition: "opacity 0.2s ease" }}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isFlowActive || isSelected ? 2.5 : 1.6}
                  markerEnd={`url(#${markerId})`}
                />

                {/* Protocol Label */}
                <g transform={`translate(${midX}, ${midY - 10})`}>
                  <rect
                    x={-Math.min(95, edge.label.length * 3.6 + 8)}
                    y={-10}
                    width={Math.min(190, edge.label.length * 7.2 + 16)}
                    height={20}
                    rx={4}
                    fill="#0d111a"
                    stroke={isFlowActive || isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.12)"}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={3.5}
                    textAnchor="middle"
                    fill={isFlowActive || isSelected ? "#f3f5fa" : "#94a3b8"}
                    fontSize={11}
                    fontFamily="sans-serif"
                  >
                    {edge.label}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* DOM Node Cards */}
        {rawComponents.map((comp) => {
          const pos = nodePositions.get(comp.id);
          if (!pos) return null;

          const info = getComponentTier(comp);
          const Icon = info.icon;
          const isSelected = selectedNodeId === comp.id;
          const isConnected = selectedConnectedIds?.has(comp.id);
          const isFlowStep = activeFlowPath?.includes(comp.id);
          const isDimmed =
            (selectedConnectedIds && !isConnected) ||
            (activeFlowPath && !isFlowStep && !selectedNodeId);

          const problem = problemMap.get(comp.id);

          // Compute count of endpoints or collections
          const compApis = apis.filter((a) => a.path && (comp.tier === "service" || comp.tier === "gateway"));
          const compEntities = entities.filter((e) => comp.tier === "database");

          let countBadge = null;
          if (info.boundaryKey === "server" && compApis.length > 0) {
            countBadge = `${compApis.length} endpoint${compApis.length > 1 ? "s" : ""}`;
          } else if (info.boundaryKey === "data" && compEntities.length > 0) {
            countBadge = `${compEntities.length} collection${compEntities.length > 1 ? "s" : ""}`;
          }

          return (
            <div
              key={comp.id}
              className="system-node-card"
              onClick={() => onSelectNode(comp)}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: pos.w,
                minHeight: pos.h,
                background: isSelected
                  ? "rgba(18, 24, 38, 0.98)"
                  : "#0f131c",
                border: `1.5px solid ${
                  isSelected
                    ? "#38bdf8"
                    : isFlowStep
                    ? "#38bdf8"
                    : problem
                    ? problem.color
                    : "rgba(255, 255, 255, 0.1)"
                }`,
                borderRadius: 8,
                padding: "10px 14px",
                cursor: "pointer",
                transition: "opacity 0.18s ease, border-color 0.18s ease",
                opacity: isDimmed ? 0.25 : 1,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              {/* Header: Icon + Name + Problem Badge (Only when problem exists!) */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: info.color }}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f3f5fa",
                        lineHeight: 1.2
                      }}
                    >
                      {comp.label || comp.name || comp.id}
                    </h3>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {comp.id}
                    </span>
                  </div>
                </div>

                {/* Show badge ONLY when there's an actual problem! Silence means healthy. */}
                {problem && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: problem.color,
                      background: "rgba(239, 68, 68, 0.15)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <AlertTriangle size={11} />
                    {problem.label}
                  </span>
                )}
              </div>

              {/* Description / One-line Role */}
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#94a3b8",
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {comp.description || `${info.boundaryLabel} component.`}
              </p>

              {/* Footer: Tech Chip + Count */}
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
                    fontSize: 10.5,
                    color: info.color,
                    background: info.bg,
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: `1px solid ${info.border}`
                  }}
                >
                  {comp.componentType || "service"}
                </span>

                {countBadge && (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {countBadge}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
