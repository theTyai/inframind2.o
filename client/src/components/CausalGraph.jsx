import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Filter,
  Layers, Cpu, Database, Zap, Workflow, CheckSquare, Users,
  Maximize2, Crosshair, AlertTriangle, Info, Table, LayoutGrid, ChevronDown, Check
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
  const [viewMode, setViewMode] = useState("graph"); // "graph" | "table"
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

  // Selected node inspection neighborhood
  const selectedNeighborhood = useMemo(() => {
    if (!selectedNodeId) return null;
    return inspectNodeNeighborhood(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  // Focus Mode: connected set for dimming non-relevant nodes
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set([selectedNodeId]);
    if (selectedNeighborhood) {
      (selectedNeighborhood.directUpstream || []).forEach(n => set.add(n.id));
      (selectedNeighborhood.directDownstream || []).forEach(n => set.add(n.id));
      (selectedNeighborhood.transitiveDownstream || []).forEach(n => set.add(n.id));
    }
    return set;
  }, [selectedNodeId, selectedNeighborhood]);

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

        {/* Right: Layout Dropdown & Table View Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Layout Mode Selector */}
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

          {/* Graph / Table View Toggle */}
          <div style={{
            display: "inline-flex",
            background: "var(--ide-bg-canvas)",
            border: "1px solid var(--ide-border)",
            borderRadius: "var(--ide-radius-sm)",
            padding: 2
          }}>
            <button
              onClick={() => setViewMode("graph")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: "var(--ide-font-xs)",
                fontWeight: viewMode === "graph" ? 600 : 400,
                border: "none",
                borderRadius: "var(--ide-radius-xs)",
                cursor: "pointer",
                background: viewMode === "graph" ? "var(--ide-accent-subtle)" : "transparent",
                color: viewMode === "graph" ? "var(--ide-accent)" : "var(--ide-text-muted)"
              }}
              title="Interactive Graph View"
            >
              <LayoutGrid size={11} />
              <span>Graph</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: "var(--ide-font-xs)",
                fontWeight: viewMode === "table" ? 600 : 400,
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

      {/* ─── Main Viewport: SVG Canvas or Synchronized Table ─────────────────── */}
      <div style={{ display: "flex", flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        {viewMode === "graph" ? (
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

                  const isDownstream = selectedNodeId && (edge.source === selectedNodeId || selectedNeighborhood?.directDownstream.some(n => n.id === edge.target));
                  const isUpstream = selectedNodeId && (edge.target === selectedNodeId || selectedNeighborhood?.directUpstream.some(n => n.id === edge.source));
                  const isDimmed = selectedNodeId && !isDownstream && !isUpstream;
                  const isHovered = hoveredEdgeId === edge.id;

                  let strokeColor = "var(--ide-border)";
                  let marker = "url(#causal-arrow)";
                  let strokeWidth = 1.2;

                  if (isDownstream) {
                    strokeColor = "var(--ide-red)";
                    marker = "url(#causal-arrow-downstream)";
                    strokeWidth = 2.2;
                  } else if (isUpstream) {
                    strokeColor = "var(--ide-accent)";
                    marker = "url(#causal-arrow-upstream)";
                    strokeWidth = 2.2;
                  } else if (isDimmed) {
                    strokeColor = "rgba(255, 255, 255, 0.03)";
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
                        markerEnd={marker}
                      />
                      {/* Hover-only relationship pill label */}
                      {(isHovered || isDownstream || isUpstream) && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={18}
                            rx={4}
                            fill="var(--ide-bg-chrome)"
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            fill="var(--ide-text-primary)"
                            fontSize="9"
                            fontFamily="var(--ide-font-mono)"
                            textAnchor="middle"
                            fontWeight="600"
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
                      onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      style={{
                        cursor: "pointer",
                        opacity: isDimmed ? 0.18 : 1.0,
                        transition: "opacity 160ms ease"
                      }}
                    >
                      {/* Node Container Card */}
                      <rect
                        width={pos.width}
                        height={pos.height}
                        rx={6}
                        fill="var(--ide-bg-panels)"
                        stroke={borderColor}
                        strokeWidth={borderWidth}
                      />

                      {/* Accent Left Edge Strip */}
                      <rect
                        x={0}
                        y={0}
                        width={4}
                        height={pos.height}
                        rx={2}
                        fill={colorInfo.border}
                      />

                      {/* Semantic Node Content */}
                      {isSemanticCompact ? (
                        /* Compact view when zoomed out (< 0.65) */
                        <text
                          x={14}
                          y={32}
                          fill="var(--ide-text-primary)"
                          fontSize="12"
                          fontWeight="600"
                        >
                          {node.label?.length > 20 ? `${node.label.slice(0, 18)}…` : node.label}
                        </text>
                      ) : (
                        /* Detailed view when zoomed in (>= 0.65) */
                        <>
                          <text
                            x={14}
                            y={22}
                            fill="var(--ide-text-primary)"
                            fontSize="12"
                            fontWeight="600"
                          >
                            {node.label?.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                          </text>

                          <text
                            x={14}
                            y={40}
                            fill="var(--ide-text-muted)"
                            fontSize="10"
                            fontFamily="var(--ide-font-mono)"
                          >
                            {node.id}
                          </text>

                          {/* Centrality / Degree Badge */}
                          <g transform={`translate(${pos.width - 32}, 16)`}>
                            <rect
                              width={22}
                              height={16}
                              rx={3}
                              fill="var(--ide-bg-canvas)"
                              stroke="var(--ide-border)"
                            />
                            <text
                              x={11}
                              y={12}
                              fill="var(--ide-text-secondary)"
                              fontSize="9"
                              fontWeight="700"
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
