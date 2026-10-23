import { useMemo } from "react";
import {
  Layers, Cpu, Database, Zap, Workflow, CheckSquare,
  ArrowRight, ShieldCheck, AlertTriangle, Play,
  Activity, X, ChevronRight, Lock
} from "lucide-react";
import { inspectNodeNeighborhood, buildGraphIndex } from "../../lib/graphAnalysis.js";

export default function IdeInspector({
  selectedArtifact,
  canonicalModel,
  compilerFindings = [],
  onSimulateImpact,
  onNavigateView,
  onSelectArtifact,
  onClose,
  width = 320
}) {
  const graphIndex = useMemo(() => {
    return buildGraphIndex(canonicalModel);
  }, [canonicalModel]);

  const neighborhood = useMemo(() => {
    if (!selectedArtifact?.id) return null;
    return inspectNodeNeighborhood(graphIndex, selectedArtifact.id);
  }, [graphIndex, selectedArtifact]);

  // Find compiler findings affecting this artifact
  const relatedFindings = useMemo(() => {
    if (!selectedArtifact?.id) return [];
    return compilerFindings.filter(f =>
      f.affectedArtifacts && f.affectedArtifacts.includes(selectedArtifact.id)
    );
  }, [compilerFindings, selectedArtifact]);

  if (!selectedArtifact) {
    return (
      <aside
        className="ide-inspector-panel"
        aria-label="Artifact Inspector"
        style={{
          width: width || 320,
          background: "var(--ide-bg-panels)",
          borderLeft: "1px solid var(--ide-border)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ide-text-muted)",
          textAlign: "center"
        }}
      >
        <Cpu size={32} style={{ color: "var(--ide-border)", marginBottom: 12 }} />
        <strong style={{ fontSize: "var(--ide-font-base)", color: "var(--ide-text-secondary)", marginBottom: 4 }}>
          No Artifact Selected
        </strong>
        <p style={{ fontSize: "var(--ide-font-xs)", margin: 0, lineHeight: 1.5, color: "var(--ide-text-muted)" }}>
          Select a node in the graph, an endpoint in the API ledger, or an item in the explorer to inspect its dependencies and compiler checks.
        </p>
      </aside>
    );
  }

  const raw = selectedArtifact.raw || {};
  const blastRadius = neighborhood?.blastRadius ?? 0;
  const upstreamItems = neighborhood?.directUpstream ?? [];
  const downstreamItems = neighborhood?.directDownstream ?? [];

  return (
    <aside
      className="ide-inspector-panel"
      aria-label="Artifact Inspector"
      style={{
        width: width || 320,
        background: "var(--ide-bg-panels)",
        borderLeft: "1px solid var(--ide-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        overflowY: "auto",
        userSelect: "none"
      }}
    >
      {/* ─── Inspector Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--ide-border)",
        background: "var(--ide-bg-chrome)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "var(--ide-radius-xs)",
            background: "var(--ide-accent-subtle)",
            color: "var(--ide-accent)",
            textTransform: "uppercase"
          }}>
            {selectedArtifact.type || "ARTIFACT"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "var(--ide-font-mono)", color: "var(--ide-text-muted)" }}>
              {selectedArtifact.id}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ide-text-muted)",
                  cursor: "pointer",
                  padding: 2
                }}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <h4 style={{
          margin: 0,
          fontSize: "var(--ide-font-md)",
          fontWeight: 700,
          color: "var(--ide-text-primary)",
          wordBreak: "break-word"
        }}>
          {selectedArtifact.label}
        </h4>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Purpose / Technical Scope */}
        <div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ide-text-muted)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 4
          }}>
            SPECIFICATION & SCOPE
          </span>
          <p style={{ margin: 0, fontSize: "var(--ide-font-sm)", color: "var(--ide-text-secondary)", lineHeight: 1.5 }}>
            {raw.description || raw.purpose || raw.scenario || "Operational capability declared in canonical blueprint."}
          </p>
        </div>

        {/* Factual Architectural Metadata Strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          background: "var(--ide-bg-canvas)",
          padding: "8px 10px",
          borderRadius: "var(--ide-radius-sm)",
          border: "1px solid var(--ide-border)"
        }}>
          <div>
            <span style={{ fontSize: 10, color: "var(--ide-text-muted)", display: "block" }}>Architectural Tier</span>
            <strong style={{ fontSize: "var(--ide-font-xs)", color: "var(--ide-text-primary)", textTransform: "capitalize" }}>
              {raw.tier || "Service Layer"}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: 10, color: "var(--ide-text-muted)", display: "block" }}>Trust Boundary</span>
            <strong style={{ fontSize: "var(--ide-font-xs)", color: "var(--ide-text-primary)" }}>
              {raw.trustBoundary || "Internal / VPC"}
            </strong>
          </div>
        </div>

        {/* Dependency Blast Radius KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{
            background: "var(--ide-bg-canvas)",
            padding: "8px 10px",
            borderRadius: "var(--ide-radius-sm)",
            border: "1px solid var(--ide-border)"
          }}>
            <span style={{ fontSize: 10, color: "var(--ide-text-muted)", display: "block", fontWeight: 600 }}>UPSTREAM INPUTS</span>
            <strong style={{ fontSize: 16, color: "var(--ide-accent)", fontWeight: 700 }}>
              {upstreamItems.length}
            </strong>
          </div>
          <div style={{
            background: "var(--ide-bg-canvas)",
            padding: "8px 10px",
            borderRadius: "var(--ide-radius-sm)",
            border: "1px solid var(--ide-border)"
          }}>
            <span style={{ fontSize: 10, color: "var(--ide-text-muted)", display: "block", fontWeight: 600 }}>DOWNSTREAM BLAST</span>
            <strong style={{
              fontSize: 16,
              color: blastRadius > 0 ? "var(--ide-red)" : "var(--ide-text-muted)",
              fontWeight: 700
            }}>
              {blastRadius > 0 ? `⚡ ${blastRadius}` : "0"}
            </strong>
          </div>
        </div>

        {/* Upstream Dependencies (Clickable Chips) */}
        <div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ide-text-muted)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 6
          }}>
            UPSTREAM INPUTS ({upstreamItems.length})
          </span>
          {upstreamItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {upstreamItems.map(up => (
                <button
                  key={up.id}
                  onClick={() => onSelectArtifact && onSelectArtifact({ id: up.id, label: up.label, type: up.type, raw: up })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--ide-bg-canvas)",
                    border: "1px solid var(--ide-border)",
                    borderRadius: "var(--ide-radius-sm)",
                    padding: "5px 8px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--ide-text-primary)",
                    fontSize: "var(--ide-font-xs)"
                  }}
                  title={`Inspect ${up.label}`}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                    {up.label}
                  </span>
                  <span style={{ color: "var(--ide-accent)", fontFamily: "var(--ide-font-mono)", fontSize: 10 }}>
                    {up.id}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: "var(--ide-font-xs)", color: "var(--ide-text-muted)" }}>
              Root artifact (no upstream dependencies)
            </span>
          )}
        </div>

        {/* Downstream Dependents (Clickable Chips) */}
        <div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ide-text-muted)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 6
          }}>
            DOWNSTREAM DEPENDENTS ({downstreamItems.length})
          </span>
          {downstreamItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {downstreamItems.map(dep => (
                <button
                  key={dep.id}
                  onClick={() => onSelectArtifact && onSelectArtifact({ id: dep.id, label: dep.label, type: dep.type, raw: dep })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--ide-bg-canvas)",
                    border: "1px solid var(--ide-border)",
                    borderRadius: "var(--ide-radius-sm)",
                    padding: "5px 8px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--ide-text-primary)",
                    fontSize: "var(--ide-font-xs)"
                  }}
                  title={`Inspect ${dep.label}`}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                    {dep.label}
                  </span>
                  <span style={{ color: "var(--ide-red)", fontFamily: "var(--ide-font-mono)", fontSize: 10 }}>
                    {dep.id}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: "var(--ide-font-xs)", color: "var(--ide-text-muted)" }}>
              Terminal artifact (no downstream dependents)
            </span>
          )}
        </div>

        {/* Compiler Invariants on this artifact */}
        <div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ide-text-muted)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 6
          }}>
            COMPILER INVARIANTS ({relatedFindings.length})
          </span>
          {relatedFindings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {relatedFindings.map(f => (
                <div key={f.id} style={{
                  padding: "8px 10px",
                  borderRadius: "var(--ide-radius-sm)",
                  border: `1px solid ${f.severity === "error" ? "var(--ide-red)" : f.severity === "warning" ? "var(--ide-amber)" : "var(--ide-green)"}`,
                  background: "var(--ide-bg-canvas)",
                  fontSize: "var(--ide-font-xs)"
                }}>
                  <strong style={{ color: "var(--ide-text-primary)", display: "block" }}>{f.title}</strong>
                  <span style={{ fontSize: 11, color: "var(--ide-text-secondary)", display: "block", marginTop: 2 }}>
                    {f.explanation}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ide-green)", fontSize: "var(--ide-font-xs)" }}>
              <ShieldCheck size={14} />
              <span>All compiler invariants verified for this artifact.</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ borderTop: "1px solid var(--ide-border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className="primary-button"
            style={{ width: "100%", justifyContent: "center", fontSize: "var(--ide-font-xs)", padding: "7px 12px" }}
            onClick={() => onSimulateImpact && onSimulateImpact(selectedArtifact)}
          >
            <Activity size={13} /> Simulate Change Impact
          </button>
          {selectedArtifact.type === "api" && (
            <button
              className="secondary-button"
              style={{ width: "100%", justifyContent: "center", fontSize: "var(--ide-font-xs)", padding: "6px 12px" }}
              onClick={() => onNavigateView && onNavigateView("mock", selectedArtifact)}
            >
              <Play size={13} /> Test in Live Mock API
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
