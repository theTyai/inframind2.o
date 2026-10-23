import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Search, Filter, ShieldAlert,
  ChevronRight, ArrowRight, Activity, Zap, Layers, Cpu, Database,
  Workflow, CheckSquare, Users, FileCode, Maximize2, Crosshair,
  Grid, ListFilter, AlertTriangle, Info, Table, LayoutGrid
} from "lucide-react";
import { buildGraphIndex, inspectNodeNeighborhood } from "../lib/graphAnalysis.js";

const TYPE_CONFIG = {
  requirement: { bg: "rgba(139, 124, 255, 0.15)", border: "#8b7cff", text: "#c2b9ff", icon: Layers, label: "Requirement" },
  actor: { bg: "rgba(243, 185, 107, 0.15)", border: "#f3b96b", text: "#f8d5a8", icon: Users, label: "Actor / Role" },
  component: { bg: "rgba(83, 215, 244, 0.15)", border: "#53d7f4", text: "#9be8f9", icon: Cpu, label: "Component" },
  entity: { bg: "rgba(66, 214, 164, 0.15)", border: "#42d6a4", text: "#96ebd0", icon: Database, label: "Entity" },
  api: { bg: "rgba(99, 179, 237, 0.15)", border: "#63b3ed", text: "#bee3f8", icon: Zap, label: "API" },
  workflow: { bg: "rgba(246, 173, 85, 0.15)", border: "#f6ad55", text: "#fbd38d", icon: Workflow, label: "Workflow" },
  test: { bg: "rgba(79, 209, 197, 0.15)", border: "#4fd1c5", text: "#b2f5ea", icon: CheckSquare, label: "Verification" }
};

export default function CausalGraph({
  canonicalModel,
  onSelectForImpact,
  selectedNodeId: externalSelectedNodeId,
  onSelectNode
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [searchQuery, setSearchQuery] = useState("");
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState(null);
  const selectedNodeId = externalSelectedNodeId !== undefined ? externalSelectedNodeId : internalSelectedNodeId;

  const setSelectedNodeId = (id) => {
    setInternalSelectedNodeId(id);
    if (onSelectNode) {
      const node = graph.nodes.find(n => n.id === id);
      onSelectNode(node || (id ? { id, label: id, type: "component" } : null));
    }
  };
  const [layoutMode, setLayoutMode] = useState("lr"); // "lr" | "tb" | "cluster"
  const [viewMode, setViewMode] = useState("graph"); // "graph" | "table"
  const [activeTypeFilters, setActiveTypeFilters] = useState(new Set([
    "requirement", "actor", "component", "entity", "api", "workflow", "test"
  ]));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const graph = useMemo(() => buildGraphIndex(canonicalModel), [canonicalModel]);

  // Filter nodes based on search and active type filters
  const filteredNodes = useMemo(() => {
    return graph.nodes.filter(node => {
      if (!activeTypeFilters.has(node.type)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (node.label && node.label.toLowerCase().includes(q)) ||
          (node.id && node.id.toLowerCase().includes(q)) ||
          (node.type && node.type.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [graph.nodes, activeTypeFilters, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return graph.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [graph.edges, filteredNodeIds]);

  // Selected node inspection
  const selectedNeighborhood = useMemo(() => {
    if (!selectedNodeId) return null;
    return inspectNodeNeighborhood(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  // ─── Multi-Layout Calculation Engine ──────────────────────────────────────
  const { nodePositions, boundingBox, clusters } = useMemo(() => {
    const positions = new Map();
    const clusterBounds = [];
    const nodeW = 210;
    const nodeH = 62;

    if (filteredNodes.length === 0) {
      return {
        nodePositions: positions,
        boundingBox: { minX: 0, minY: 0, maxX: 600, maxY: 400, width: 600, height: 400 },
        clusters: []
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
      let curX = 60;
      const colSpacing = 90;
      const rowSpacing = 80;

      colOrder.forEach(type => {
        const list = columns[type] || [];
        if (list.length === 0) return;

        let curY = 60;
        const startY = curY;

        list.forEach((node, rowIdx) => {
          positions.set(node.id, {
            x: curX,
            y: curY + rowIdx * rowSpacing,
            width: nodeW,
            height: nodeH
          });
        });

        const clusterHeight = list.length * rowSpacing + 20;
        clusterBounds.push({
          type,
          x: curX - 16,
          y: startY - 24,
          width: nodeW + 32,
          height: clusterHeight,
          count: list.length
        });

        curX += nodeW + colSpacing;
      });

    } else if (layoutMode === "tb") {
      // Top-to-Bottom Hierarchical Tree
      const tiers = {
        tier1: [], // Actors & Requirements
        tier2: [], // Components
        tier3: [], // APIs
        tier4: [], // Entities
        tier5: []  // Workflows & Tests
      };

      filteredNodes.forEach(node => {
        if (node.type === "actor" || node.type === "requirement") tiers.tier1.push(node);
        else if (node.type === "component") tiers.tier2.push(node);
        else if (node.type === "api") tiers.tier3.push(node);
        else if (node.type === "entity") tiers.tier4.push(node);
        else tiers.tier5.push(node);
      });

      let curY = 60;
      const tierSpacing = 110;
      const colSpacing = 240;

      Object.keys(tiers).forEach(tierKey => {
        const list = tiers[tierKey];
        if (list.length === 0) return;

        list.forEach((node, idx) => {
          positions.set(node.id, {
            x: 60 + idx * colSpacing,
            y: curY,
            width: nodeW,
            height: nodeH
          });
        });

        curY += nodeH + tierSpacing;
      });

    } else {
      // Grouped / Clustered View with 2D Layout
      const groups = {};
      filteredNodes.forEach(node => {
        if (!groups[node.type]) groups[node.type] = [];
        groups[node.type].push(node);
      });

      const groupKeys = Object.keys(groups);
      const cols = Math.min(3, Math.max(1, groupKeys.length));
      const groupWidth = 320;
      const rowGap = 40;
      const colGap = 50;

      groupKeys.forEach((gKey, gIdx) => {
        const colIdx = gIdx % cols;
        const rowIdx = Math.floor(gIdx / cols);
        const gx = 60 + colIdx * (groupWidth + colGap);
        const gy = 60 + rowIdx * 340;
        const list = groups[gKey];

        list.forEach((node, nIdx) => {
          const itemX = gx + 16;
          const itemY = gy + 36 + nIdx * 76;
          positions.set(node.id, {
            x: itemX,
            y: itemY,
            width: nodeW,
            height: nodeH
          });
        });

        clusterBounds.push({
          type: gKey,
          x: gx,
          y: gy,
          width: groupWidth,
          height: Math.max(120, 48 + list.length * 76),
          count: list.length
        });
      });
    }

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    });

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 800; maxY = 500;
    }

    return {
      nodePositions: positions,
      boundingBox: {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(800, maxX - minX + 160),
        height: Math.max(500, maxY - minY + 160)
      },
      clusters: clusterBounds
    };
  }, [filteredNodes, layoutMode]);

  // ─── Fit to View Callback ──────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const graphW = boundingBox.width;
    const graphH = boundingBox.height;

    // Calculate scale with 60px padding
    const scaleX = (clientWidth - 80) / graphW;
    const scaleY = (clientHeight - 80) / graphH;
    const newZoom = Math.max(0.3, Math.min(1.0, Math.min(scaleX, scaleY)));

    // Center offset
    const offsetX = Math.max(20, (clientWidth - graphW * newZoom) / 2);
    const offsetY = Math.max(20, (clientHeight - graphH * newZoom) / 2);

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(offsetX), y: Math.round(offsetY) });
  }, [boundingBox]);

  // Auto-fit using ResizeObserver so we trigger only when the container has a real size
  useEffect(() => {
    if (!containerRef.current) return;
    // Immediate attempt
    const immediate = setTimeout(fitToView, 50);
    // ResizeObserver as fallback for when the container size changes after mount
    const ro = new ResizeObserver(() => {
      clearTimeout(immediate);
      fitToView();
    });
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(immediate);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToView, layoutMode]);

  // Wheel zoom on the SVG canvas
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Number(Math.max(0.2, Math.min(2.5, z + delta)).toFixed(2)));
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

  // Center when externalSelectedNodeId changes
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

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
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

  // Node highlighting state
  function getNodeState(nodeId) {
    if (!selectedNodeId) return "normal";
    if (nodeId === selectedNodeId) return "selected";
    if (selectedNeighborhood?.directUpstream.some(n => n.id === nodeId)) return "upstream";
    if (selectedNeighborhood?.directDownstream.some(n => n.id === nodeId)) return "downstream";
    if (selectedNeighborhood?.transitiveDownstream.some(n => n.id === nodeId)) return "transitive";
    return "dimmed";
  }

  return (
    <div className="causal-graph-wrapper" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 620, background: "#08090d", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      {/* ─── Compact Top Control Toolbar ────────────────────────────────────── */}
      <div className="graph-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0d1017", flexWrap: "wrap", gap: 10 }}>
        {/* Left: Search & Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#121722", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 10px", width: 200 }}>
            <Search size={13} style={{ color: "#737e92", marginRight: 6 }} />
            <input
              type="text"
              placeholder="Search artifacts or IDs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#f3f5fa", fontSize: 12, outline: "none", width: "100%" }}
            />
          </div>

          {/* Type Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {Object.keys(TYPE_CONFIG).map(type => {
              const active = activeTypeFilters.has(type);
              const colorInfo = TYPE_CONFIG[type];
              const count = graph.nodes.filter(n => n.type === type).length;
              if (count === 0) return null;

              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${active ? colorInfo.border : "rgba(255,255,255,0.1)"}`,
                    background: active ? colorInfo.bg : "transparent",
                    color: active ? colorInfo.text : "#737e92",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease"
                  }}
                  title={`Filter ${colorInfo.label}`}
                >
                  <span>{colorInfo.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.75 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Layout Switcher, View Mode, Zoom & Fit Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Layout Orientation Switcher */}
          <div style={{ display: "flex", background: "#121722", borderRadius: 6, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setLayoutMode("lr")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: layoutMode === "lr" ? "rgba(139, 124, 255, 0.25)" : "transparent",
                color: layoutMode === "lr" ? "#c2b9ff" : "#737e92"
              }}
              title="Layered Left-to-Right Architecture"
            >
              Layered (L→R)
            </button>
            <button
              onClick={() => setLayoutMode("tb")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: layoutMode === "tb" ? "rgba(139, 124, 255, 0.25)" : "transparent",
                color: layoutMode === "tb" ? "#c2b9ff" : "#737e92"
              }}
              title="Top-to-Bottom Dependency Tree"
            >
              Hierarchical (T↓B)
            </button>
            <button
              onClick={() => setLayoutMode("cluster")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: layoutMode === "cluster" ? "rgba(139, 124, 255, 0.25)" : "transparent",
                color: layoutMode === "cluster" ? "#c2b9ff" : "#737e92"
              }}
              title="Clustered System Boundaries"
            >
              Clustered
            </button>
          </div>

          {/* View Mode Toggle: Graph vs Synchronized Table */}
          <div style={{ display: "flex", background: "#121722", borderRadius: 6, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setViewMode("graph")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: viewMode === "graph" ? "rgba(83, 215, 244, 0.2)" : "transparent",
                color: viewMode === "graph" ? "#53d7f4" : "#737e92"
              }}
              title="Graph View"
            >
              <LayoutGrid size={12} /> Graph
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: viewMode === "table" ? "rgba(83, 215, 244, 0.2)" : "transparent",
                color: viewMode === "table" ? "#53d7f4" : "#737e92"
              }}
              title="Synchronized Artifact Table"
            >
              <Table size={12} /> Table
            </button>
          </div>

          {/* Graph Zoom & Fit Tools */}
          {viewMode === "graph" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={fitToView}
                style={{ padding: "5px 8px", background: "#121722", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f3f5fa", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
                title="Fit all nodes to view"
              >
                <Maximize2 size={13} /> Fit
              </button>
              {selectedNodeId && (
                <button
                  onClick={() => centerNode(selectedNodeId)}
                  style={{ padding: "5px 8px", background: "rgba(83, 215, 244, 0.15)", border: "1px solid rgba(83, 215, 244, 0.3)", borderRadius: 6, color: "#53d7f4", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
                  title="Center Selected Node"
                >
                  <Crosshair size={13} /> Center
                </button>
              )}
              <button
                onClick={() => setZoom(z => Math.min(Number((z + 0.15).toFixed(2)), 2.2))}
                style={{ padding: "5px 8px", background: "#121722", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f3f5fa", cursor: "pointer" }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(Number((z - 0.15).toFixed(2)), 0.3))}
                style={{ padding: "5px 8px", background: "#121722", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f3f5fa", cursor: "pointer" }}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); setSelectedNodeId(null); setSearchQuery(""); }}
                style={{ padding: "5px 8px", background: "#121722", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f3f5fa", cursor: "pointer" }}
                title="Reset View"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Warning / Empty State Banners ──────────────────────────────────── */}
      {filteredNodes.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#a2abbd" }}>
          <AlertTriangle size={32} style={{ color: "#f3b96b", margin: "0 auto 12px" }} />
          <h4 style={{ color: "#f3f5fa", margin: "0 0 6px" }}>No Artifacts Match the Active Filter</h4>
          <p style={{ fontSize: 13, margin: 0 }}>
            {graph.nodes.length === 0
              ? "This project has no canonical components or endpoints compiled yet. Run a synthesis or reload a blueprint."
              : "Try enabling more artifact types in the filter bar or clearing your search query."}
          </p>
        </div>
      )}

      {filteredNodes.length > 0 && filteredEdges.length === 0 && graph.edges.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(243, 185, 107, 0.12)", borderBottom: "1px solid rgba(243, 185, 107, 0.25)", color: "#f3b96b", fontSize: 12 }}>
          <Info size={14} />
          <span>Nodes exist but no explicit relationship edges are registered between these artifacts.</span>
        </div>
      )}

      {/* ─── Main Viewport: SVG Canvas or Synchronized Table ─────────────────── */}
      {filteredNodes.length > 0 && (
        <div style={{ display: "flex", flex: 1, position: "relative", minHeight: 520, overflow: "hidden" }}>
          {viewMode === "graph" ? (
            /* Interactive Canvas */
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{
                flex: 1,
                overflow: "hidden",
                position: "relative",
                cursor: isDragging ? "grabbing" : "grab",
                background: "#08090d"
              }}
            >
              <svg
                width="100%"
                height="100%"
                style={{ display: "block" }}
              >
                <defs>
                  <marker id="causal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#53d7f4" />
                  </marker>
                  <marker id="causal-arrow-downstream" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#ff737d" />
                  </marker>
                  <marker id="causal-arrow-upstream" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#8b7cff" />
                  </marker>
                </defs>

                {/* Scaled & Panned Group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Background Grid Pattern */}
                  <pattern id="canvas-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" />
                  </pattern>
                  <rect
                    x={-500}
                    y={-500}
                    width={boundingBox.width + 1000}
                    height={boundingBox.height + 1000}
                    fill="url(#canvas-grid)"
                  />

                  {/* Cluster Boundaries (Clustered or Layered Mode) */}
                  {clusters.map((cluster, cIdx) => (
                    <g key={cIdx}>
                      <rect
                        x={cluster.x}
                        y={cluster.y}
                        width={cluster.width}
                        height={cluster.height}
                        rx={12}
                        fill="rgba(18, 23, 34, 0.35)"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={cluster.x + 12}
                        y={cluster.y + 16}
                        fill="#737e92"
                        fontSize="10"
                        fontWeight="700"
                        letterSpacing="0.8"
                        textTransform="uppercase"
                      >
                        {cluster.type} tier ({cluster.count})
                      </text>
                    </g>
                  ))}

                  {/* Dependency Edges */}
                  {filteredEdges.map(edge => {
                    const src = nodePositions.get(edge.source);
                    const tgt = nodePositions.get(edge.target);
                    if (!src || !tgt) return null;

                    let x1, y1, x2, y2, pathD;

                    if (layoutMode === "tb") {
                      // Top to Bottom routing
                      x1 = src.x + src.width / 2;
                      y1 = src.y + src.height;
                      x2 = tgt.x + tgt.width / 2;
                      y2 = tgt.y;
                      const dy = Math.abs(y2 - y1) * 0.5;
                      pathD = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
                    } else {
                      // Left to Right routing
                      x1 = src.x + src.width;
                      y1 = src.y + src.height / 2;
                      x2 = tgt.x;
                      y2 = tgt.y + tgt.height / 2;
                      const dx = Math.abs(x2 - x1) * 0.5;
                      pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                    }

                    const isDownstream = selectedNodeId && (edge.source === selectedNodeId || selectedNeighborhood?.directDownstream.some(n => n.id === edge.target));
                    const isUpstream = selectedNodeId && (edge.target === selectedNodeId || selectedNeighborhood?.directUpstream.some(n => n.id === edge.source));
                    const isDimmed = selectedNodeId && !isDownstream && !isUpstream;

                    let strokeColor = "rgba(83, 215, 244, 0.35)";
                    let marker = "url(#causal-arrow)";
                    let strokeWidth = 1.5;

                    if (isDownstream) {
                      strokeColor = "#ff737d";
                      marker = "url(#causal-arrow-downstream)";
                      strokeWidth = 2.5;
                    } else if (isUpstream) {
                      strokeColor = "#8b7cff";
                      marker = "url(#causal-arrow-upstream)";
                      strokeWidth = 2.5;
                    } else if (isDimmed) {
                      strokeColor = "rgba(255, 255, 255, 0.04)";
                    }

                    return (
                      <g key={edge.id}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd={marker}
                          strokeDasharray={edge.critical ? "none" : "3 3"}
                        />
                      </g>
                    );
                  })}

                  {/* Graph Nodes */}
                  {filteredNodes.map(node => {
                    const pos = nodePositions.get(node.id);
                    if (!pos) return null;

                    const colorInfo = TYPE_CONFIG[node.type] || TYPE_CONFIG.component;
                    const nodeState = getNodeState(node.id);

                    let borderColor = colorInfo.border;
                    let bgColor = colorInfo.bg;
                    let opacity = 1;
                    let shadow = "none";

                    if (nodeState === "selected") {
                      borderColor = "#53d7f4";
                      bgColor = "rgba(83, 215, 244, 0.28)";
                      shadow = "0 0 16px rgba(83, 215, 244, 0.5)";
                    } else if (nodeState === "downstream") {
                      borderColor = "#ff737d";
                      bgColor = "rgba(255, 115, 125, 0.22)";
                      shadow = "0 0 12px rgba(255, 115, 125, 0.4)";
                    } else if (nodeState === "upstream") {
                      borderColor = "#8b7cff";
                      bgColor = "rgba(139, 124, 255, 0.22)";
                      shadow = "0 0 12px rgba(139, 124, 255, 0.4)";
                    } else if (nodeState === "transitive") {
                      borderColor = "rgba(255, 115, 125, 0.6)";
                      bgColor = "rgba(255, 115, 125, 0.12)";
                    } else if (nodeState === "dimmed") {
                      opacity = 0.25;
                    }

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                        }}
                        style={{ cursor: "pointer", opacity, transition: "opacity 0.15s ease" }}
                      >
                        <rect
                          width={pos.width}
                          height={pos.height}
                          rx={8}
                          fill={bgColor}
                          stroke={borderColor}
                          strokeWidth={nodeState === "selected" ? 2 : 1}
                          style={{ filter: shadow }}
                        />

                        {/* Top Chip: Type */}
                        <rect x="8" y="8" width="62" height="15" rx="3" fill="rgba(0,0,0,0.5)" />
                        <text x="12" y="19" fill={colorInfo.text} fontSize="9" fontWeight="700" letterSpacing="0.4">
                          {node.type.toUpperCase()}
                        </text>

                        {/* Blast Radius Badge */}
                        {node.blastRadius > 0 && (
                          <g transform={`translate(${pos.width - 66}, 8)`}>
                            <rect width="58" height="15" rx="3" fill="rgba(0,0,0,0.5)" stroke="rgba(255,115,125,0.3)" />
                            <text x="6" y="11" fill="#ff737d" fontSize="8.5" fontWeight="600">
                              ⚡ {node.blastRadius} blast
                            </text>
                          </g>
                        )}

                        {/* Main Label */}
                        <text x="10" y="44" fill="#f3f5fa" fontSize="11.5" fontWeight="600">
                          {node.label.length > 21 ? `${node.label.slice(0, 19)}…` : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            /* Synchronized Structured Artifact Table */
            <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#08090d" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#737e92" }}>
                    <th style={{ padding: "8px 12px" }}>ARTIFACT NAME</th>
                    <th style={{ padding: "8px 12px" }}>STABLE ID</th>
                    <th style={{ padding: "8px 12px" }}>TYPE</th>
                    <th style={{ padding: "8px 12px" }}>CENTRALITY</th>
                    <th style={{ padding: "8px 12px" }}>BLAST RADIUS</th>
                    <th style={{ padding: "8px 12px" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map(node => {
                    const isSelected = node.id === selectedNodeId;
                    const colorInfo = TYPE_CONFIG[node.type] || TYPE_CONFIG.component;
                    return (
                      <tr
                        key={node.id}
                        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: isSelected ? "rgba(83, 215, 244, 0.12)" : "transparent",
                          cursor: "pointer"
                        }}
                      >
                        <td style={{ padding: "10px 12px", color: "#f3f5fa", fontWeight: 600 }}>{node.label}</td>
                        <td style={{ padding: "10px 12px", color: "#737e92", fontFamily: "monospace" }}>{node.id}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: colorInfo.bg, color: colorInfo.text, border: `1px solid ${colorInfo.border}` }}>
                            {node.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#53d7f4", fontWeight: 600 }}>{node.centrality}</td>
                        <td style={{ padding: "10px 12px", color: node.blastRadius > 0 ? "#ff737d" : "#737e92", fontWeight: 600 }}>
                          {node.blastRadius > 0 ? `⚡ ${node.blastRadius}` : "0"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                              setViewMode("graph");
                              setTimeout(() => centerNode(node.id), 80);
                            }}
                            className="secondary-button"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                          >
                            Inspect in Graph
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── Collapsible Contextual Inspector Panel ─────────────────────── */}
          {selectedNeighborhood ? (
            <div
              className="causal-inspector-panel"
              style={{
                width: 320,
                background: "#0d1017",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflowY: "auto",
                boxShadow: "-8px 0 24px rgba(0,0,0,0.4)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#53d7f4", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  ARTIFACT INSPECTOR
                </span>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  style={{ background: "transparent", border: "none", color: "#737e92", cursor: "pointer", fontSize: 12 }}
                >
                  ✕ Close
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f3f5fa", margin: "0 0 6px 0" }}>
                  {selectedNeighborhood.node.label}
                </h3>
                <span style={{ fontSize: 11, color: "#737e92", fontFamily: "monospace" }}>
                  ID: {selectedNeighborhood.node.id} · Type: {selectedNeighborhood.node.type}
                </span>
              </div>

              {/* Impact Metric Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#121722", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 11, color: "#737e92", display: "block" }}>Downstream Blast</span>
                  <strong style={{ fontSize: 18, color: "#ff737d", fontWeight: 700 }}>
                    {selectedNeighborhood.blastRadius}
                  </strong>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block" }}>affected artifacts</span>
                </div>
                <div style={{ background: "#121722", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 11, color: "#737e92", display: "block" }}>Centrality</span>
                  <strong style={{ fontSize: 18, color: "#53d7f4", fontWeight: 700 }}>
                    {selectedNeighborhood.node.centrality}
                  </strong>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block" }}>graph weight</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => centerNode(selectedNeighborhood.node.id)}
                  className="secondary-button"
                  style={{ width: "100%", justifyContent: "center", padding: "7px 12px", fontSize: 11 }}
                >
                  <Crosshair size={13} /> Center Node in Canvas
                </button>

                {onSelectForImpact && (
                  <button
                    onClick={() => onSelectForImpact(selectedNeighborhood.node)}
                    className="primary-button"
                    style={{ width: "100%", justifyContent: "center", padding: "8px 12px", fontSize: 12 }}
                  >
                    <Zap size={14} /> Open in Change Impact
                  </button>
                )}
              </div>

              {/* Direct Upstream Dependencies */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#8b7cff", display: "block", marginBottom: 6 }}>
                  UPSTREAM DEPENDENCIES ({selectedNeighborhood.directUpstream.length})
                </span>
                {selectedNeighborhood.directUpstream.length === 0 ? (
                  <span style={{ fontSize: 12, color: "#737e92" }}>Root artifact (no upstream dependencies)</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedNeighborhood.directUpstream.map(up => (
                      <div
                        key={up.id}
                        onClick={() => setSelectedNodeId(up.id)}
                        style={{ padding: "6px 10px", background: "#121722", borderRadius: 6, border: "1px solid rgba(139,124,255,0.2)", cursor: "pointer", fontSize: 12 }}
                      >
                        <strong style={{ color: "#f3f5fa" }}>{up.label}</strong>
                        <span style={{ display: "block", fontSize: 10, color: "#737e92" }}>{up.type} · {up.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Downstream Dependents */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#ff737d", display: "block", marginBottom: 6 }}>
                  DOWNSTREAM DEPENDENTS ({selectedNeighborhood.directDownstream.length})
                </span>
                {selectedNeighborhood.directDownstream.length === 0 ? (
                  <span style={{ fontSize: 12, color: "#737e92" }}>Terminal artifact (no downstream dependents)</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedNeighborhood.directDownstream.map(down => (
                      <div
                        key={down.id}
                        onClick={() => setSelectedNodeId(down.id)}
                        style={{ padding: "6px 10px", background: "#121722", borderRadius: 6, border: "1px solid rgba(255,115,125,0.2)", cursor: "pointer", fontSize: 12 }}
                      >
                        <strong style={{ color: "#f3f5fa" }}>{down.label}</strong>
                        <span style={{ display: "block", fontSize: 10, color: "#737e92" }}>{down.type} · {down.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(13,16,23,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#737e92" }}>
              Click any node in the graph to inspect upstream and downstream dependencies.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
