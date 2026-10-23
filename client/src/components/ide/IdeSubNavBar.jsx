import { useState, useRef, useEffect } from "react";
import {
  Zap, Workflow, Database, Boxes, ShieldCheck, LockKeyhole,
  ListChecks, Play, Code2, FileJson, FileCode, History,
  GitBranch, FileText, ChevronDown, CheckCircle2, ShieldAlert
} from "lucide-react";

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
  canonicalModel,
  compilerFindings = []
}) {
  const [isBuildMoreOpen, setIsBuildMoreOpen] = useState(false);
  const moreRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setIsBuildMoreOpen(false);
      }
    }
    if (isBuildMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isBuildMoreOpen]);

  // Derived metrics for contextual status chips
  const errorCount = compilerFindings.filter(f => f.severity === "error").length;
  const warningCount = compilerFindings.filter(f => f.severity === "warning").length;
  const passedCount = compilerFindings.filter(f => f.severity === "pass").length;
  const evaluatedCount = compilerFindings.filter(f => f.severity !== "not_evaluated").length;
  const healthPercent = evaluatedCount > 0 ? Math.round((passedCount / evaluatedCount) * 100) : null;

  const nodeCount = canonicalModel?.graph?.nodes?.length || canonicalModel?.components?.length || 0;
  const edgeCount = canonicalModel?.graph?.edges?.length || 0;
  const scaffoldFileCount = canonicalModel?.scaffold?.length || 0;

  const isMoreBuildSubView = buildSubView === "reality" || buildSubView === "history";

  return (
    <div
      className="ide-sub-navbar"
      style={{
        height: 36,
        minHeight: 36,
        maxHeight: 36,
        padding: "0 12px",
        background: "var(--ide-bg-chrome, #0d1017)",
        borderBottom: "1px solid var(--ide-border, rgba(255,255,255,0.08))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexShrink: 0,
        boxSizing: "border-box",
        userSelect: "none"
      }}
    >
      {/* ─── Left: Segmented Controls with Horizontal Scroll Guard ─────────── */}
      <div
        className="ide-sub-nav-tabs"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          minWidth: 0,
          flex: 1
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ide-text-muted, #737e92)",
            letterSpacing: 0.5,
            marginRight: 4,
            flexShrink: 0
          }}
        >
          VIEW:
        </span>

        {/* 1. Overview Sub-Views */}
        {workspace === "overview" && [
          { id: "all", label: "Full Spec" },
          { id: "summary", label: "Health", icon: ShieldCheck },
          { id: "brief", label: "Brief", icon: FileText },
          { id: "requirements", label: "Requirements", icon: ListChecks },
          { id: "decisions", label: "Decisions (ADRs)" },
          { id: "assumptions", label: "Assumptions" },
          { id: "roadmap", label: "Roadmap" }
        ].map(item => {
          const isActive = overviewSubView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`ide-sub-nav-pill ${isActive ? "active" : ""}`}
              onClick={() => setOverviewSubView(item.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 9px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                border: isActive
                  ? "1px solid rgba(83,215,244,0.35)"
                  : "1px solid transparent",
                background: isActive ? "rgba(83,215,244,0.12)" : "transparent",
                color: isActive ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-secondary, #a2abbd)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.12s ease"
              }}
            >
              {Icon && <Icon size={12} />}
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* 2. Architecture Sub-Views */}
        {workspace === "architecture" && [
          { id: "dependencies", label: "Causal Graph", icon: Zap },
          { id: "map", label: "System Map", icon: Workflow },
          { id: "data_apis", label: "Data & APIs", icon: Database },
          { id: "inventory", label: "Inventory", icon: Boxes }
        ].map(item => {
          const isActive = archSubView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`ide-sub-nav-pill ${isActive ? "active" : ""}`}
              onClick={() => setArchSubView(item.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 9px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                border: isActive
                  ? "1px solid rgba(83,215,244,0.35)"
                  : "1px solid transparent",
                background: isActive ? "rgba(83,215,244,0.12)" : "transparent",
                color: isActive ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-secondary, #a2abbd)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.12s ease"
              }}
            >
              <Icon size={12} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* 3. Change Impact Sub-Views */}
        {workspace === "impact" && (
          <span
            className="ide-sub-nav-pill active"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 24,
              padding: "0 9px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid rgba(255,115,125,0.35)",
              background: "rgba(255,115,125,0.12)",
              color: "#ff737d",
              flexShrink: 0
            }}
          >
            <GitBranch size={12} />
            <span>3-Pane Ripple & Patch Simulator</span>
          </span>
        )}

        {/* 4. Validate Sub-Views */}
        {workspace === "validate" && [
          { id: "checks", label: "Compiler Invariants", icon: ShieldCheck },
          { id: "threats", label: "STRIDE Threats", icon: LockKeyhole },
          { id: "workflows", label: "Workflows", icon: ListChecks },
          { id: "api_flows", label: "API Flows", icon: Play }
        ].map(item => {
          const isActive = validateSubView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`ide-sub-nav-pill ${isActive ? "active" : ""}`}
              onClick={() => setValidateSubView(item.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 9px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                border: isActive
                  ? "1px solid rgba(83,215,244,0.35)"
                  : "1px solid transparent",
                background: isActive ? "rgba(83,215,244,0.12)" : "transparent",
                color: isActive ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-secondary, #a2abbd)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.12s ease"
              }}
            >
              <Icon size={12} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* 5. Build & History Sub-Views (Overflow Protected with "More ▾") */}
        {workspace === "build" && (
          <>
            {[
              { id: "scaffold", label: "Scaffold Code", icon: Code2 },
              { id: "mock", label: "Live Mock API", icon: Play },
              { id: "openapi", label: "OpenAPI Spec", icon: FileJson }
            ].map(item => {
              const isActive = buildSubView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ide-sub-nav-pill ${isActive ? "active" : ""}`}
                  onClick={() => setBuildSubView(item.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 24,
                    padding: "0 9px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 500,
                    border: isActive
                      ? "1px solid rgba(83,215,244,0.35)"
                      : "1px solid transparent",
                    background: isActive ? "rgba(83,215,244,0.12)" : "transparent",
                    color: isActive ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-secondary, #a2abbd)",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.12s ease"
                  }}
                >
                  <Icon size={12} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* "More ▾" Dropdown for Reality Check & Version History */}
            <div ref={moreRef} style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
              <button
                type="button"
                className={`ide-sub-nav-pill ${isMoreBuildSubView ? "active" : ""}`}
                onClick={() => setIsBuildMoreOpen(prev => !prev)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isMoreBuildSubView ? 600 : 500,
                  border: isMoreBuildSubView
                    ? "1px solid rgba(83,215,244,0.35)"
                    : "1px solid transparent",
                  background: isMoreBuildSubView ? "rgba(83,215,244,0.12)" : "transparent",
                  color: isMoreBuildSubView ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-secondary, #a2abbd)",
                  cursor: "pointer",
                  transition: "all 0.12s ease"
                }}
                aria-expanded={isBuildMoreOpen}
                aria-haspopup="menu"
              >
                {buildSubView === "reality" ? (
                  <>
                    <FileCode size={12} />
                    <span>Reality Check</span>
                  </>
                ) : buildSubView === "history" ? (
                  <>
                    <History size={12} />
                    <span>History & Diffs</span>
                  </>
                ) : (
                  <span>More</span>
                )}
                <ChevronDown size={11} style={{ opacity: 0.7 }} />
              </button>

              {isBuildMoreOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    background: "var(--ide-bg-panels, #121722)",
                    border: "1px solid var(--ide-border, rgba(255,255,255,0.12))",
                    borderRadius: 6,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    padding: "4px 0",
                    minWidth: 170,
                    zIndex: 50
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setBuildSubView("reality");
                      setIsBuildMoreOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      background: buildSubView === "reality" ? "rgba(83,215,244,0.12)" : "transparent",
                      color: buildSubView === "reality" ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-primary, #f3f5fa)",
                      border: "none",
                      fontSize: 11.5,
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <FileCode size={13} />
                    <span>Repo Reality Check</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setBuildSubView("history");
                      setIsBuildMoreOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      background: buildSubView === "history" ? "rgba(83,215,244,0.12)" : "transparent",
                      color: buildSubView === "history" ? "var(--ide-accent, #53d7f4)" : "var(--ide-text-primary, #f3f5fa)",
                      border: "none",
                      fontSize: 11.5,
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <History size={13} />
                    <span>Version History & Diffs</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Right: Contextual Metrics Pill (IDE-style) ───────────────────── */}
      <div
        className="ide-sub-nav-metrics"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          fontSize: 11,
          color: "var(--ide-text-muted, #737e92)"
        }}
      >
        {workspace === "architecture" && (
          <span style={{ fontFamily: "monospace" }}>
            {nodeCount} nodes · {edgeCount} edges
          </span>
        )}

        {workspace === "validate" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace" }}>
            {errorCount > 0 ? (
              <span style={{ color: "var(--ide-error, #ff737d)" }}>● {errorCount} errors</span>
            ) : (
              <span style={{ color: "var(--ide-success, #42d6a4)" }}>● 0 errors</span>
            )}
            {warningCount > 0 && (
              <span style={{ color: "var(--ide-warning, #f3b96b)" }}>· {warningCount} warnings</span>
            )}
            {healthPercent !== null && (
              <span style={{ color: "var(--ide-text-secondary, #a2abbd)" }}>({healthPercent}%)</span>
            )}
          </div>
        )}

        {workspace === "build" && (
          <span style={{ fontFamily: "monospace" }}>
            {scaffoldFileCount} scaffold files
          </span>
        )}

        {workspace === "overview" && healthPercent !== null && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 3,
            background: errorCount > 0 ? "rgba(255,115,125,0.15)" : "rgba(66,214,164,0.15)",
            color: errorCount > 0 ? "var(--ide-error, #ff737d)" : "var(--ide-success, #42d6a4)"
          }}>
            {healthPercent}% HEALTH
          </span>
        )}
      </div>
    </div>
  );
}
