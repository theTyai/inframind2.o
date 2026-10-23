import { useEffect, useState, useRef, useCallback } from "react";
import mermaid from "mermaid";
import {
  ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2,
  Crosshair, AlertTriangle, Workflow
} from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#08090d",
    primaryColor: "#1a1f2c",
    primaryBorderColor: "#7c66f6",
    primaryTextColor: "#f3f5fa",
    lineColor: "#53d7f4",
    secondaryColor: "#121722",
    tertiaryColor: "#0d1017"
  },
  securityLevel: "strict",
  flowchart: { curve: "basis", htmlLabels: false, useMaxWidth: true }
});

function mermaidText(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/&/g, "#38;")
    .replace(/"/g, "#quot;")
    .replace(/'/g, "#39;")
    .replace(/\|/g, "#124;")
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;")
    .replace(/\{/g, "#123;")
    .replace(/\}/g, "#125;")
    .replace(/[<>]/g, " ")
    .replace(/`/g, "")
    .slice(0, 100);
}

export default function ArchitectureDiagram({ architecture }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const svgWrapRef = useRef(null);

  const nodes = Array.isArray(architecture?.nodes) ? architecture.nodes : [];
  const edges = Array.isArray(architecture?.edges) ? architecture.edges : [];

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        setError("");
        setSvg("");
        setPan({ x: 0, y: 0 });
        setZoom(1);
        if (!nodes.length) throw new Error("No architecture nodes were generated.");

        const ids = new Map(nodes.map((node, index) => [node.id, `mnode${index}`]));
        const lines = ["flowchart LR"];

        nodes.forEach((node, index) => {
          const label = mermaidText(node.label || node.type || node.id);
          const isDb = (node.type || "").toLowerCase().includes("db") ||
            (node.type || "").toLowerCase().includes("database") ||
            (node.label || "").toLowerCase().includes("db") ||
            (node.label || "").toLowerCase().includes("database");
          if (isDb) {
            lines.push(`mnode${index}[("${label}")]`);
          } else {
            lines.push(`mnode${index}["${label}"]`);
          }
        });

        edges.forEach(edge => {
          const from = ids.get(edge.from);
          const to = ids.get(edge.to);
          if (from && to) {
            const edgeLabel = mermaidText(edge.label || "");
            if (edgeLabel) {
              lines.push(`${from} -->|"${edgeLabel}"| ${to}`);
            } else {
              lines.push(`${from} --> ${to}`);
            }
          }
        });

        const rendered = await mermaid.render(
          `arch-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          lines.join("\n")
        );
        if (!cancelled) {
          setSvg(rendered.svg);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Diagram renderer could not parse this blueprint.");
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [architecture]);

  // After SVG renders, auto-fit it to the container
  const fitToView = useCallback(() => {
    if (!containerRef.current || !svgWrapRef.current) return;
    const svgEl = svgWrapRef.current.querySelector("svg");
    if (!svgEl) return;

    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    // Get the SVG's natural size from its viewBox or width/height attributes
    let svgW = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 800;
    let svgH = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 400;

    // Clamp to actual rendered size if viewBox is very large
    const bbox = svgEl.getBBox?.();
    if (bbox && bbox.width > 0) {
      svgW = bbox.width + 40;
      svgH = bbox.height + 40;
    }

    if (svgW <= 0 || svgH <= 0) return;

    const scaleX = (containerW - 40) / svgW;
    const scaleY = (containerH - 40) / svgH;
    const newZoom = Math.max(0.25, Math.min(1.5, Math.min(scaleX, scaleY)));

    const offsetX = Math.round((containerW - svgW * newZoom) / 2);
    const offsetY = Math.round((containerH - svgH * newZoom) / 2);

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.max(0, offsetX), y: Math.max(0, offsetY) });
  }, []);

  // Fit after SVG is injected
  useEffect(() => {
    if (!svg) return;
    const timer = setTimeout(fitToView, 80);
    return () => clearTimeout(timer);
  }, [svg, fitToView]);

  // Also fit when fullscreen changes
  useEffect(() => {
    const timer = setTimeout(fitToView, 60);
    return () => clearTimeout(timer);
  }, [fullscreen, fitToView]);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
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
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Number(Math.max(0.25, Math.min(2.5, z + delta)).toFixed(2)));
  }

  function handleExportSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `architecture-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const containerStyle = fullscreen ? {
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
    minHeight: 480,
    background: "#08090d",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.07)",
    overflow: "hidden"
  };

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div className="diagram-toolbar" style={{ flexShrink: 0 }}>
        <div>
          <strong>System Topology Flow</strong>
          <span>Derived from blueprint requirements ({nodes.length} components, {edges.length} connections)</span>
        </div>

        <div className="diagram-controls">
          <div className="diagram-key" style={{ marginRight: 8 }}>
            <i /> Service <i className="db-dot" /> Database
          </div>

          <button className="control-btn" onClick={() => setZoom(z => Math.max(0.25, Number((z - 0.15).toFixed(2))))} title="Zoom out">
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", minWidth: 36, textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="control-btn" onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))} title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button className="control-btn" onClick={fitToView} title="Fit to view">
            <Crosshair size={13} />
          </button>
          <button className="control-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset zoom">
            <RotateCcw size={13} />
          </button>

          {svg && (
            <button className="control-btn" onClick={handleExportSvg} title="Export diagram as SVG">
              <Download size={13} /> Export SVG
            </button>
          )}

          <button
            className="control-btn"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen view"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main viewport */}
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
          cursor: isDragging ? "grabbing" : svg ? "grab" : "default",
          background: "#08090d"
        }}
      >
        {error ? (
          /* Fallback table when Mermaid fails */
          <div className="diagram-fallback" style={{ overflowY: "auto", height: "100%" }}>
            <div className="fallback-heading">
              <span className="fallback-icon"><AlertTriangle size={18} /></span>
              <div>
                <strong>Mermaid renderer fallback</strong>
                <p>Showing structured topology: {error}</p>
              </div>
            </div>
            <div className="fallback-nodes">
              {nodes.map((node, index) => (
                <div className="fallback-node" key={`${node.id}-${index}`}>
                  <span className="fallback-node-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{node.label || node.id}</strong>
                    <p>{node.description || node.type || "System component"}</p>
                  </div>
                </div>
              ))}
            </div>
            {edges.length > 0 && (
              <div className="fallback-connections" style={{ marginTop: 18, borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
                <strong style={{ fontSize: 11, display: "block", marginBottom: 8 }}>Connections:</strong>
                {edges.map((edge, index) => (
                  <div key={`${edge.from}-${edge.to}-${index}`} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 11 }}>
                    <span>{nodes.find(n => n.id === edge.from)?.label || edge.from}</span>
                    <b style={{ color: "var(--accent-violet)" }}>→</b>
                    <span>{nodes.find(n => n.id === edge.to)?.label || edge.to}</span>
                    <small style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{edge.label}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !svg ? (
          /* Loading state */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--text-muted)", fontSize: 12 }}>
            <span className="spinner" /> Rendering Mermaid diagram…
          </div>
        ) : (
          /* Panned & zoomed SVG viewport */
          <div
            ref={svgWrapRef}
            style={{
              position: "absolute",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isDragging ? "none" : "transform 0.1s ease"
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {/* Component Quick Inspector Grid */}
      {nodes.length > 0 && !error && (
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border-subtle)", padding: "12px 16px", maxHeight: 200, overflowY: "auto", background: "#0d1017" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Components ({nodes.length}) · Click to inspect
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {nodes.map((node, i) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id || i}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  style={{
                    padding: "8px 10px",
                    background: isSelected ? "rgba(139, 124, 255, 0.1)" : "var(--bg-surface-2)",
                    border: `1px solid ${isSelected ? "var(--accent-violet)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all var(--duration-fast)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 11, color: "var(--text-primary)" }}>{node.label || node.id}</strong>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", background: "rgba(83, 215, 244, 0.08)", padding: "1px 5px", borderRadius: 3 }}>
                      {(node.type || "SVC").toUpperCase()}
                    </span>
                  </div>
                  {node.description && (
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {node.description.slice(0, 80)}{node.description.length > 80 ? "…" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
