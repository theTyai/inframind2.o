import { useMemo } from "react";
import {
  Layers, Cpu, Database, Zap, Workflow, CheckSquare,
  ArrowRight, ShieldCheck, AlertTriangle, Play, HelpCircle,
  ExternalLink, Sparkles, Activity
} from "lucide-react";
import { inspectNodeNeighborhood, buildGraphIndex } from "../../lib/graphAnalysis.js";

export default function IdeInspector({
  selectedArtifact,
  canonicalModel,
  compilerFindings = [],
  onSimulateImpact,
  onNavigateView,
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
      <aside className="ide-inspector-panel" aria-label="Artifact Inspector" style={{
        width: width || 320,
        background: "var(--ide-bg-panels)",
        borderLeft: "1px solid var(--ide-border)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ide-text-muted)",
        textAlign: "center"
      }}>
        <Cpu size={32} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
        <strong style={{ fontSize: 13, color: "#a2abbd", marginBottom: 4 }}>No Artifact Selected</strong>
        <p style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>
          Click any component, endpoint, collection, or finding to inspect its dependency trace and invariants.
        </p>
      </aside>
    );
  }

  const raw = selectedArtifact.raw || {};
  const blastRadius = neighborhood?.blastRadius ?? 0;
  const upstreamCount = neighborhood?.directUpstream?.length ?? 0;

  // Grounded explanation synthesized from factual dependency trace
  const groundedExplanation = (
    `Artifact '${selectedArtifact.label}' [${selectedArtifact.id}] is positioned in the system architecture ` +
    `with ${upstreamCount} upstream input dependency(ies) and a downstream blast radius of ${blastRadius} dependent artifact(s). ` +
    (raw.tier ? `Operating in the ${raw.tier.toUpperCase()} architectural tier with trust boundary '${raw.trustBoundary || "Internal"}'.` : "")
  );

  return (
    <aside className="ide-inspector-panel" aria-label="Artifact Inspector" style={{
      width: width || 320,
      background: "var(--ide-bg-panels)",
      borderLeft: "1px solid var(--ide-border)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      flexShrink: 0,
      overflowY: "auto"
    }}>
      {/* Inspector Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#121722"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: 3,
            background: "rgba(139, 124, 255, 0.2)",
            color: "#c2b9ff",
            textTransform: "uppercase"
          }}>
            {selectedArtifact.type || "ARTIFACT"}
          </span>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#737e92" }}>
            {selectedArtifact.id}
          </span>
        </div>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa", wordBreak: "break-word" }}>
          {selectedArtifact.label}
        </h4>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Purpose / Description */}
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
            PURPOSE & SCOPE
          </span>
          <p style={{ margin: 0, fontSize: 12, color: "#a2abbd", lineHeight: 1.45 }}>
            {raw.description || raw.purpose || raw.scenario || "Operational capability declared in canonical blueprint."}
          </p>
        </div>

        {/* Quick Blast Radius KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#121722", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 9, color: "#737e92", display: "block", fontWeight: 700 }}>UPSTREAM SOURCES</span>
            <strong style={{ fontSize: 18, color: "#8b7cff", fontWeight: 800 }}>{upstreamCount}</strong>
          </div>
          <div style={{ background: "#121722", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 9, color: "#737e92", display: "block", fontWeight: 700 }}>BLAST RADIUS</span>
            <strong style={{ fontSize: 18, color: blastRadius > 0 ? "#ff737d" : "#737e92", fontWeight: 800 }}>
              {blastRadius > 0 ? `⚡ ${blastRadius}` : "0"}
            </strong>
          </div>
        </div>

        {/* Grounded "Why does this exist?" */}
        <div style={{ background: "rgba(83, 215, 244, 0.06)", border: "1px solid rgba(83, 215, 244, 0.2)", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Sparkles size={12} style={{ color: "#53d7f4" }} />
            <strong style={{ fontSize: 10, color: "#53d7f4", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Grounded Architecture Trace
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#9be8f9", lineHeight: 1.4 }}>
            {groundedExplanation}
          </p>
        </div>

        {/* Direct Dependencies */}
        {neighborhood?.directDownstream?.length > 0 && (
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              DIRECT DEPENDENTS ({neighborhood.directDownstream.length})
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {neighborhood.directDownstream.map(dep => (
                <div key={dep.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#121722", padding: "5px 8px", borderRadius: 4, fontSize: 10 }}>
                  <span style={{ color: "#f3f5fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                    {dep.label}
                  </span>
                  <span style={{ color: "#ff737d", fontFamily: "monospace" }}>{dep.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compiler Invariants on this artifact */}
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            INVARIANT FINDINGS ({relatedFindings.length})
          </span>
          {relatedFindings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {relatedFindings.map(f => (
                <div key={f.id} style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${f.severity === "error" ? "rgba(255,115,125,0.3)" : f.severity === "warning" ? "rgba(243,185,107,0.3)" : "rgba(66,214,164,0.3)"}`,
                  background: "#121722",
                  fontSize: 11
                }}>
                  <strong style={{ color: "#f3f5fa", display: "block" }}>{f.title}</strong>
                  <span style={{ fontSize: 10, color: "#a2abbd", display: "block", marginTop: 2 }}>{f.explanation}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#42d6a4", fontSize: 11 }}>
              <ShieldCheck size={14} />
              <span>All compiler invariants verified for this artifact.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className="primary-button"
            style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "7px 12px" }}
            onClick={() => onSimulateImpact && onSimulateImpact(selectedArtifact)}
          >
            <Activity size={13} /> Simulate Change Impact
          </button>
          {selectedArtifact.type === "api" && (
            <button
              className="secondary-button"
              style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px 12px" }}
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
