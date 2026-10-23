import { useMemo } from "react";
import {
  Layers, Cpu, Database, Zap, Workflow, CheckSquare,
  ArrowRight, ShieldCheck, AlertTriangle, AlertCircle, Play,
  CheckCircle2, X, ChevronRight, FileCode, Sparkles
} from "lucide-react";
import { inspectNodeNeighborhood, buildGraphIndex } from "../../lib/graphAnalysis.js";

export default function IdeInspector({
  selectedArtifact = null,
  activeFlow = null,
  canonicalModel = {},
  compilerFindings = [],
  onSimulateImpact = () => {},
  onSelectArtifact = () => {},
  onClose = () => {},
  width = 340
}) {
  const metadata = canonicalModel.metadata || {};
  const components = Array.isArray(canonicalModel.components) ? canonicalModel.components : [];
  const entities = Array.isArray(canonicalModel.entities) ? canonicalModel.entities : [];
  const apis = Array.isArray(canonicalModel.apis) ? canonicalModel.apis : [];
  const workflows = Array.isArray(canonicalModel.workflows) ? canonicalModel.workflows : [];
  const scaffold = Array.isArray(canonicalModel.scaffold) ? canonicalModel.scaffold : [];

  const graphIndex = useMemo(() => {
    return buildGraphIndex(canonicalModel);
  }, [canonicalModel]);

  const neighborhood = useMemo(() => {
    if (!selectedArtifact?.id) return null;
    return inspectNodeNeighborhood(graphIndex, selectedArtifact.id);
  }, [graphIndex, selectedArtifact]);

  // Compiler findings metrics
  const passedFindings = compilerFindings.filter((f) => f.severity === "pass");
  const errorFindings = compilerFindings.filter((f) => f.severity === "error");
  const warningFindings = compilerFindings.filter((f) => f.severity === "warning");
  const totalFindings = compilerFindings.length;
  const healthPercent = totalFindings > 0 ? Math.round((passedFindings.length / totalFindings) * 100) : 100;

  // Findings affecting currently selected artifact
  const nodeFindings = useMemo(() => {
    if (!selectedArtifact?.id) return [];
    return compilerFindings.filter(
      (f) => f.affectedArtifacts && f.affectedArtifacts.includes(selectedArtifact.id)
    );
  }, [compilerFindings, selectedArtifact]);

  // Find files that implement the selected artifact
  const implementingFiles = useMemo(() => {
    if (!selectedArtifact?.id) return [];
    const term = (selectedArtifact.label || selectedArtifact.name || selectedArtifact.id).toLowerCase();
    return scaffold.filter((f) => {
      const p = f.path.toLowerCase();
      return p.includes(term) || (f.content || "").toLowerCase().includes(term);
    });
  }, [scaffold, selectedArtifact]);

  // ─── STATE 1: ACTIVE REQUEST FLOW INSPECTION ───────────────────────────────
  if (activeFlow && !selectedArtifact) {
    return (
      <aside
        className="ide-inspector-panel"
        style={{
          width: width || 340,
          background: "rgba(10, 14, 22, 0.98)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexShrink: 0,
          overflowY: "auto"
        }}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(20, 26, 40, 0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
              Request Execution Trace
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
            {activeFlow.name}
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "#94a3b8" }}>
            {activeFlow.description}
          </p>
        </div>

        {/* Step Sequence mapped to real files */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Data Pipeline Steps ({activeFlow.steps?.length || 0})
          </span>

          {(activeFlow.steps || []).map((step, idx) => (
            <div
              key={step.id || idx}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
                  Step {idx + 1}: {step.dataPipe}
                </span>
                <span style={{ fontSize: 10.5, color: "#64748b", fontFamily: "monospace" }}>
                  {step.artifactName}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#f3f5fa", fontWeight: 600 }}>
                {step.operation}
              </div>

              {step.checks && step.checks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                  {step.checks.map((chk, i) => (
                    <span key={i} style={{ fontSize: 11, color: chk.toLowerCase().includes("fail") ? "#f87171" : "#4ade80", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={11} /> {chk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // ─── STATE 2: EMPTY STATE -> SYSTEM SUMMARY (REPLACES OVERVIEW PAGE) ──────
  if (!selectedArtifact) {
    return (
      <aside
        className="ide-inspector-panel"
        style={{
          width: width || 340,
          background: "rgba(10, 14, 22, 0.98)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexShrink: 0,
          overflowY: "auto"
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(20, 26, 40, 0.6)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
            System Summary
          </span>
          <h3 style={{ margin: "4px 0 2px 0", fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
            {metadata.projectName || "InfraMind Architecture"}
          </h3>
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
            {metadata.summary || "Full-stack canonical system specification."}
          </p>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Health Score Calculation */}
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 12, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Design Health Score</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: healthPercent >= 80 ? "#4ade80" : "#fbbf24", fontFamily: "monospace" }}>
                {healthPercent}%
              </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(255, 255, 255, 0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: `${healthPercent}%`, height: "100%", background: healthPercent >= 80 ? "#4ade80" : "#fbbf24" }} />
            </div>
            <span style={{ fontSize: 10.5, color: "#64748b" }}>
              Computed from {passedFindings.length} passing rules out of {totalFindings} evaluated compiler checks.
            </span>
          </div>

          {/* Key Model Counts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 10, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", display: "block" }}>{components.length}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Components</span>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 10, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", display: "block" }}>{entities.length}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Collections</span>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 10, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", display: "block" }}>{apis.length}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Endpoints</span>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 10, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", display: "block" }}>{workflows.length}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Workflows</span>
            </div>
          </div>

          {/* Top Compiler Findings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Compiler Health Status
            </span>
            {errorFindings.length === 0 && warningFindings.length === 0 ? (
              <span style={{ fontSize: 11.5, color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={13} />
                <span>Zero compiler errors or warnings.</span>
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...errorFindings, ...warningFindings].slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 5,
                      background: f.severity === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(251, 191, 36, 0.1)",
                      border: `1px solid ${f.severity === "error" ? "rgba(239, 68, 68, 0.25)" : "rgba(251, 191, 36, 0.25)"}`
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: f.severity === "error" ? "#f87171" : "#fbbf24", display: "block" }}>
                      {f.title}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{f.explanation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidance note */}
          <div style={{ marginTop: "auto", padding: 10, borderRadius: 6, background: "rgba(255, 255, 255, 0.02)", border: "1px dashed rgba(255, 255, 255, 0.08)", fontSize: 11, color: "#64748b" }}>
            Click any component on the diagram to inspect its interfaces, dependencies, and blast radius.
          </div>
        </div>
      </aside>
    );
  }

  // ─── STATE 3: SELECTED ARTIFACT DEEP DIVE ─────────────────────────────────
  const raw = selectedArtifact.raw || {};
  const blastRadius = neighborhood?.blastRadius ?? 0;
  const upstreamItems = neighborhood?.directUpstream ?? [];
  const downstreamItems = neighborhood?.directDownstream ?? [];

  return (
    <aside
      className="ide-inspector-panel"
      style={{
        width: width || 340,
        background: "rgba(10, 14, 22, 0.98)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        overflowY: "auto"
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(20, 26, 40, 0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
            {selectedArtifact.type || "Component"}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f5fa" }}>
          {selectedArtifact.label || selectedArtifact.id}
        </h3>
        <code style={{ fontSize: 11, color: "#64748b" }}>{selectedArtifact.id}</code>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Role & Description */}
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
            Role & Description
          </span>
          <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.4 }}>
            {raw.description || "Architectural component in this canonical system."}
          </p>
        </div>

        {/* Upstream & Downstream Connections */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Connections
            </span>
            <span style={{ fontSize: 10, color: "#818cf8", fontFamily: "monospace" }}>
              Blast radius: {blastRadius}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upstreamItems.length > 0 && (
              <div style={{ fontSize: 11.5 }}>
                <span style={{ color: "#64748b" }}>Upstream: </span>
                {upstreamItems.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelectArtifact(u)}
                    style={{ fontSize: 11, padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.04)", color: "#cbd5e1", border: "none", cursor: "pointer", marginRight: 4 }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            )}

            {downstreamItems.length > 0 && (
              <div style={{ fontSize: 11.5 }}>
                <span style={{ color: "#64748b" }}>Downstream: </span>
                {downstreamItems.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectArtifact(d)}
                    style={{ fontSize: 11, padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.04)", color: "#cbd5e1", border: "none", cursor: "pointer", marginRight: 4 }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Implemented By Files */}
        {implementingFiles.length > 0 && (
          <div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Implementing Files
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {implementingFiles.map((f) => (
                <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#38bdf8", fontFamily: "monospace" }}>
                  <FileCode size={12} />
                  <span>{f.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compiler Findings on this Node */}
        {nodeFindings.length > 0 && (
          <div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Compiler Findings ({nodeFindings.length})
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {nodeFindings.map((f) => (
                <div key={f.id} style={{ padding: "6px 8px", borderRadius: 4, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: 11.5 }}>
                  <strong style={{ color: "#f87171", display: "block" }}>{f.title}</strong>
                  <span style={{ color: "#94a3b8" }}>{f.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulate Impact Action Button */}
        <div style={{ marginTop: "auto", paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => onSimulateImpact(selectedArtifact)}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 6,
              background: "rgba(139, 124, 255, 0.15)",
              border: "1px solid rgba(139, 124, 255, 0.3)",
              color: "#c4b5fd",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Zap size={13} />
            <span>Simulate Change on this Node</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
