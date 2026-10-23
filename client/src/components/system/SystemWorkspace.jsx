import { useState, useMemo } from "react";
import { ZoomIn, ZoomOut, Maximize2, Layers, Database, Workflow } from "lucide-react";
import SystemDiagram from "./SystemDiagram.jsx";
import DataErView from "./DataErView.jsx";
import { deriveJourneysAndTraces } from "../../lib/traceEngine.js";

export default function SystemWorkspace({
  canonicalModel = {},
  compilerFindings = [],
  selectedArtifact = null,
  setSelectedArtifact = () => {},
  setIsInspectorOpen = () => {},
  onSelectFlow = () => {}
}) {
  const [activeLens, setActiveLens] = useState("components"); // "components" | "data"
  const [selectedFlowId, setSelectedFlowId] = useState("none");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });

  // Compile real journeys and execution flows from the canonical model
  const { journeys } = useMemo(() => {
    return deriveJourneysAndTraces(canonicalModel);
  }, [canonicalModel]);

  const activeJourney = useMemo(() => {
    if (selectedFlowId === "none") return null;
    return journeys.find((j) => j.id === selectedFlowId) || null;
  }, [selectedFlowId, journeys]);

  // Extract participating component node IDs for active flow path
  const activeFlowPath = useMemo(() => {
    if (!activeJourney) return null;
    const ids = [];
    activeJourney.steps.forEach((s) => {
      if (s.artifactId) ids.push(s.artifactId);
    });
    return ids;
  }, [activeJourney]);

  // When user picks a flow from dropdown
  const handleFlowChange = (e) => {
    const flowId = e.target.value;
    setSelectedFlowId(flowId);
    if (flowId === "none") {
      onSelectFlow(null);
    } else {
      const journey = journeys.find((j) => j.id === flowId);
      if (journey) {
        setSelectedArtifact(null);
        onSelectFlow(journey);
        setIsInspectorOpen(true);
      }
    }
  };

  const handleSelectNode = (comp) => {
    if (!comp) return;
    setSelectedArtifact({
      id: comp.id,
      label: comp.label || comp.name || comp.id,
      type: "component",
      raw: comp
    });
    setIsInspectorOpen(true);
  };

  return (
    <div
      className="system-workspace"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        position: "relative"
      }}
    >
      {/* ─── Compact Lens & Flow Toolbar (Only 1 bar above content) ───────── */}
      <div
        className="system-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "8px 14px",
          background: "rgba(10, 14, 22, 0.9)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          gap: 12,
          flexShrink: 0,
          zIndex: 10
        }}
      >
        {/* Left: Lens Switcher [Components | Data] */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(0, 0, 0, 0.4)",
              padding: 2,
              borderRadius: 6,
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          >
            <button
              type="button"
              onClick={() => setActiveLens("components")}
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: activeLens === "components" ? 700 : 500,
                background: activeLens === "components" ? "rgba(139, 124, 255, 0.22)" : "transparent",
                color: activeLens === "components" ? "#f3f5fa" : "#94a3b8",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Layers size={13} />
              <span>Components</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens("data")}
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: activeLens === "data" ? 700 : 500,
                background: activeLens === "data" ? "rgba(66, 214, 164, 0.2)" : "transparent",
                color: activeLens === "data" ? "#42d6a4" : "#94a3b8",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Database size={13} />
              <span>Data (ER)</span>
            </button>
          </div>

          {/* Request Flow Highlighter Dropdown */}
          {activeLens === "components" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="flow-selector" style={{ fontSize: 12, color: "#94a3b8" }}>
                Flow:
              </label>
              <select
                id="flow-selector"
                value={selectedFlowId}
                onChange={handleFlowChange}
                style={{
                  height: 26,
                  padding: "0 8px",
                  borderRadius: 5,
                  background: "rgba(20, 26, 40, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: selectedFlowId === "none" ? "#94a3b8" : "#38bdf8",
                  fontSize: 12,
                  fontWeight: selectedFlowId === "none" ? 500 : 600,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="none">none (all components)</option>
                <optgroup label="User Journeys">
                  {journeys
                    .filter((j) => j.category === "user")
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="API Endpoints">
                  {journeys
                    .filter((j) => j.category === "api")
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Error Branches">
                  {journeys
                    .filter((j) => j.category === "error")
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        {/* Right: Zoom & Fit Controls (Only in Components view) */}
        {activeLens === "components" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
              style={{
                height: 26,
                width: 26,
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <ZoomIn size={13} />
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
              style={{
                height: 26,
                width: 26,
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <ZoomOut size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1.1);
                setPan({ x: 40, y: 40 });
              }}
              title="Reset Zoom / Fit to View"
              style={{
                height: 26,
                padding: "0 8px",
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                fontSize: 11.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer"
              }}
            >
              <Maximize2 size={12} />
              <span>Fit</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Center Body: Diagram or Data ER View ──────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {activeLens === "components" ? (
          <SystemDiagram
            canonicalModel={canonicalModel}
            compilerFindings={compilerFindings}
            selectedNodeId={selectedArtifact?.id}
            onSelectNode={handleSelectNode}
            activeFlowPath={activeFlowPath}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
          />
        ) : (
          <DataErView
            canonicalModel={canonicalModel}
            selectedNodeId={selectedArtifact?.id}
            onSelectArtifact={(item) => {
              setSelectedArtifact(item);
              setIsInspectorOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
