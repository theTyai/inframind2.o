import { getWorkspaceStage } from "../../lib/workspaceJourney.js";
import { ArrowRight, Layers, Workflow, CheckCircle2, ShieldCheck, Code2, Zap } from "lucide-react";

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`ws-lens ${active ? "is-active" : ""}`}
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        background: active ? "rgba(139, 124, 255, 0.2)" : "transparent",
        color: active ? "#f3f5fa" : "var(--ide-text-muted)",
        border: active ? "1px solid rgba(139, 124, 255, 0.4)" : "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.15s ease"
      }}
    >
      {children}
    </button>
  );
}

export default function IdeSubNavBar({
  workspace,
  overviewSubView,
  setOverviewSubView,
  archSubView,
  setArchSubView,
  validateSubView,
  setValidateSubView,
  buildSubView,
  setBuildSubView,
  onNext,
  compilerFindings = []
}) {
  const stage = getWorkspaceStage(workspace);
  const errorCount = compilerFindings.filter((f) => f.severity === "error").length;

  const workspaceContext = {
    overview: {
      title: "System Overview & Data Flow",
      tagline: "Live user request lifecycle, tech stack breakdown, and system requirements"
    },
    architecture: {
      title: "System Mapping & Role Flows",
      tagline: "End-to-end component graph, actor roles, APIs, and database persistence mapping"
    },
    impact: {
      title: "Architectural What-If Simulator",
      tagline: "Simulate switching to SQL DB, adding Redis caching, or modifying schemas with live blast radius"
    },
    validate: {
      title: "Design Health & Security Checks",
      tagline: "Compiler consistency diagnostics, STRIDE threat model, and verification flows"
    },
    build: {
      title: "Scaffold Codebase & API Sandbox",
      tagline: "MERN starter files, interactive mock API server, and OpenAPI 3.1 specifications"
    }
  };

  const currentCtx = workspaceContext[workspace] || {
    title: stage.title,
    tagline: stage.hint
  };

  const lenses = {
    overview: [
      { id: "story", label: "Brief & Live Data Flow", set: setOverviewSubView, active: overviewSubView },
      { id: "requirements", label: "Requirements", set: setOverviewSubView, active: overviewSubView },
      { id: "decisions", label: "Decisions", set: setOverviewSubView, active: overviewSubView },
      { id: "roadmap", label: "Roadmap", set: setOverviewSubView, active: overviewSubView }
    ],
    architecture: [
      { id: "map", label: "System Map", set: setArchSubView, active: archSubView === "map" },
      { id: "traces", label: "Request Traces", set: setArchSubView, active: archSubView === "traces" || archSubView === "dependencies" },
      { id: "data_apis", label: "Data & API Explorer", set: setArchSubView, active: archSubView === "data_apis" }
    ],
    validate: [
      { id: "checks", label: "Consistency Checks", set: setValidateSubView, active: validateSubView },
      { id: "threats", label: "STRIDE Threats", set: setValidateSubView, active: validateSubView },
      { id: "workflows", label: "User Flows", set: setValidateSubView, active: validateSubView },
      { id: "api_flows", label: "API Flows", set: setValidateSubView, active: validateSubView }
    ],
    build: [
      { id: "scaffold", label: "MERN Starter Code", set: setBuildSubView, active: buildSubView },
      { id: "mock", label: "Live Mock Server", set: setBuildSubView, active: buildSubView },
      { id: "openapi", label: "OpenAPI 3.1", set: setBuildSubView, active: buildSubView },
      { id: "history", label: "Version Diff", set: setBuildSubView, active: buildSubView }
    ]
  };

  const items = lenses[workspace] || [];

  return (
    <div className="ws-stage-bar" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 18px",
      background: "var(--ide-bg-chrome)",
      borderBottom: "1px solid var(--ide-border)",
      gap: 16,
      flexShrink: 0
    }}>
      {/* Workspace Context Title */}
      <div className="ws-stage-intro" style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: 0, letterSpacing: "-0.01em" }}>
            {currentCtx.title}
          </h2>
          <span style={{ fontSize: 11, color: "var(--ide-text-dim)", display: "inline-block" }}>
            — {currentCtx.tagline}
          </span>
        </div>
      </div>

      {/* Sub-view switcher pills */}
      <div className="ws-stage-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {items.length > 0 && (
          <div className="ws-lenses" role="tablist" aria-label="Views in this step" style={{
            display: "flex",
            gap: 2,
            padding: 2,
            borderRadius: 8,
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            {items.map((item) => (
              <Pill
                key={item.id}
                active={typeof item.active === "boolean" ? item.active : item.active === item.id}
                onClick={() => item.set(item.id)}
              >
                {item.label}
              </Pill>
            ))}
          </div>
        )}

        {workspace === "validate" && (
          <span className={`ws-metric ${errorCount > 0 ? "is-bad" : "is-good"}`} style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 4,
            background: errorCount > 0 ? "rgba(255,115,125,0.15)" : "rgba(66,214,164,0.15)",
            color: errorCount > 0 ? "#ff737d" : "#42d6a4"
          }}>
            {errorCount > 0 ? `${errorCount} issues detected` : "All checks passed"}
          </span>
        )}

        {stage.next && (
          <button
            type="button"
            className="ws-next-btn"
            onClick={onNext}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f3f5fa",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <span>Next: {stage.nextLabel}</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
