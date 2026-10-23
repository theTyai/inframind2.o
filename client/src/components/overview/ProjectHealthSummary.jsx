import {
  ShieldCheck, AlertTriangle, Cpu, Database, Boxes,
  Code2, Lock, Activity, CheckCircle2, ArrowRight,
  Globe, Zap, Users, Sparkles
} from "lucide-react";

export default function ProjectHealthSummary({
  canonicalModel,
  compilerFindings = [],
  onNavigateTab,
  onNavigateSection
}) {
  const handleNavigate = onNavigateTab || onNavigateSection;

  const projectName = canonicalModel?.metadata?.projectName || "System Architecture";
  const projectSummary = canonicalModel?.metadata?.summary || "Full-stack system blueprint.";
  const componentsCount = canonicalModel?.components?.length || 0;
  const entitiesCount = canonicalModel?.entities?.length || 0;
  const apisCount = canonicalModel?.apis?.length || 0;
  const scaffoldCount = canonicalModel?.scaffold?.length || 0;
  const threats = canonicalModel?.threats || [];
  const openThreats = threats.filter(t => t.status === "open").length;
  const mitigatedThreats = threats.filter(t => t.status === "mitigated").length;
  const actors = canonicalModel?.actors || [];

  const passedRules = compilerFindings.filter(f => f.severity === "pass").length;
  const errorRules = compilerFindings.filter(f => f.severity === "error").length;
  const warningRules = compilerFindings.filter(f => f.severity === "warning").length;
  const totalRules = compilerFindings.length;

  const healthPercent = totalRules > 0
    ? Math.round((passedRules / totalRules) * 100)
    : null;

  // Attention items
  const attentionItems = [];
  if (errorRules > 0) {
    attentionItems.push({
      type: "error",
      text: `${errorRules} design check${errorRules === 1 ? "" : "s"} failed. Fix these before treating the blueprint as ready.`,
      actionTab: "checks",
      actionLabel: "Open checks"
    });
  }
  if (openThreats > 0) {
    attentionItems.push({
      type: "warning",
      text: `${openThreats} unmitigated security/reliability threat(s) flagged on public perimeter.`,
      actionTab: "threats",
      actionLabel: "View Threats"
    });
  }
  if (warningRules > 0) {
    attentionItems.push({
      type: "warning",
      text: `${warningRules} architectural warning(s) detected across data references or failure paths.`,
      actionTab: "checks",
      actionLabel: "Review Warnings"
    });
  }

  return (
    <div className="health-summary-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ─── Topline Executive Banner ────────────────────────────────────────── */}
      <div className="health-banner" style={{
        background: "linear-gradient(135deg, #131722 0%, #0d1017 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: "20px 24px"
      }}>
        <div className="banner-left" style={{ flex: 1 }}>
          <div className="status-pill-group" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span className={`status-badge ${errorRules > 0 ? "at-risk" : totalRules > 0 ? "healthy" : "pending"}`}>
              <span className="pulse-dot" />
              {errorRules > 0 ? "NEEDS A LOOK" : totalRules > 0 ? "CHECKS PASSED" : "NOT EVALUATED YET"}
            </span>
            <span className="platform-tag" style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(139, 124, 255, 0.15)",
              color: "#c2b9ff",
              border: "1px solid rgba(139, 124, 255, 0.3)"
            }}>
              MERN STACK + REDIS
            </span>
            <span style={{ fontSize: 11, color: "var(--ide-text-dim)" }}>
              OpenAPI 3.1 Compliant · Production Specification
            </span>
          </div>

          <h2 className="banner-title" style={{ fontSize: 22, fontWeight: 800, color: "#f3f5fa", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {projectName}
          </h2>
          <p className="banner-desc" style={{ fontSize: 13, color: "var(--ide-text-secondary)", margin: "0 0 14px", maxWidth: 720, lineHeight: 1.5 }}>
            {projectSummary}
          </p>

          {/* Tech Stack & User Roles Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#a2abbd" }}>
              <span style={{ fontWeight: 700, color: "#737e92", textTransform: "uppercase", fontSize: 10 }}>TECH STACK:</span>
              <span style={{ padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: "#e0f2fe" }}>⚛️ React 18 / Vite</span>
              <span style={{ padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: "#ddd6fe" }}>⚡ Node.js / Express</span>
              <span style={{ padding: "2px 6px", background: "rgba(83,215,244,0.1)", borderRadius: 4, color: "#53d7f4" }}>🔴 Redis 7 Cache</span>
              <span style={{ padding: "2px 6px", background: "rgba(66,214,164,0.1)", borderRadius: 4, color: "#42d6a4" }}>🍃 MongoDB 7</span>
            </div>

            {actors.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#a2abbd" }}>
                <span style={{ fontWeight: 700, color: "#737e92", textTransform: "uppercase", fontSize: 10 }}>ROLES:</span>
                {actors.map(act => (
                  <span key={act.id} style={{ padding: "2px 6px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 4, color: "#fef3c7" }}>
                    👤 {act.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Health Ring */}
        <div className="banner-health-ring" style={{ alignSelf: "center" }}>
          {healthPercent !== null ? (
            <div
              className="ring-outer"
              style={{
                background: `conic-gradient(${errorRules > 0 ? "#ff737d" : "#42d6a4"} ${healthPercent}%, rgba(255,255,255,0.08) 0%)`
              }}
            >
              <div className="ring-inner">
                <span className="ring-percent">{healthPercent}%</span>
                <span className="ring-label">HEALTH</span>
              </div>
            </div>
          ) : (
            <div className="ring-outer" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="ring-inner">
                <span className="ring-percent" style={{ fontSize: 11 }}>N/A</span>
                <span className="ring-label">HEALTH</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Architecture KPI Cards Grid ───────────────────────────────────── */}
      <div className="health-kpi-grid">
        <div className="kpi-card" onClick={() => handleNavigate && handleNavigate("architecture")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span className="kpi-icon violet"><Cpu size={15} /></span>
            <span className="kpi-label">SERVICES</span>
          </div>
          <strong className="kpi-value">{componentsCount}</strong>
          <span className="kpi-sub">Architecture components</span>
        </div>

        <div className="kpi-card" onClick={() => handleNavigate && handleNavigate("database")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span className="kpi-icon emerald"><Database size={15} /></span>
            <span className="kpi-label">COLLECTIONS</span>
          </div>
          <strong className="kpi-value">{entitiesCount}</strong>
          <span className="kpi-sub">MongoDB document models</span>
        </div>

        <div className="kpi-card" onClick={() => handleNavigate && handleNavigate("apis")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span className="kpi-icon cyan"><Boxes size={15} /></span>
            <span className="kpi-label">ENDPOINTS</span>
          </div>
          <strong className="kpi-value">{apisCount}</strong>
          <span className="kpi-sub">RESTful API routes</span>
        </div>

        <div className="kpi-card" onClick={() => handleNavigate && handleNavigate("threats")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span className="kpi-icon amber"><Lock size={15} /></span>
            <span className="kpi-label">THREATS</span>
          </div>
          <strong className="kpi-value">{threats.length}</strong>
          <span className="kpi-sub">{openThreats} open · {mitigatedThreats} mitigated</span>
        </div>

        <div className="kpi-card" onClick={() => handleNavigate && handleNavigate("scaffold")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span className="kpi-icon gray"><Code2 size={15} /></span>
            <span className="kpi-label">SCAFFOLD</span>
          </div>
          <strong className="kpi-value">{scaffoldCount}</strong>
          <span className="kpi-sub">MERN starter files</span>
        </div>
      </div>

      {/* ─── Attention Notices ────────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <div className="attention-box">
          <div className="attention-header">
            <AlertTriangle size={15} className="warning-icon" />
            <h4>What needs attention ({attentionItems.length})</h4>
          </div>

          <div className="attention-list">
            {attentionItems.map((item, idx) => (
              <div key={idx} className="attention-item">
                <div className="item-text">
                  <span className={`bullet ${item.type}`} />
                  <span>{item.text}</span>
                </div>
                {handleNavigate && (
                  <button
                    className="secondary-button compact-btn"
                    onClick={() => handleNavigate(item.actionTab)}
                  >
                    {item.actionLabel} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All checks passed indicator */}
      {totalRules > 0 && errorRules === 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "rgba(66, 214, 164, 0.08)",
          border: "1px solid rgba(66, 214, 164, 0.2)",
          borderRadius: 8,
          fontSize: 12,
          color: "#42d6a4"
        }}>
          <CheckCircle2 size={15} />
          <span>
            All {totalRules} design checks passed{warningRules > 0 ? ` — ${warningRules} warning${warningRules === 1 ? "" : "s"} still worth a look` : ""}.
          </span>
          {handleNavigate && (
            <button
              className="secondary-button compact-btn"
              style={{ marginLeft: "auto", color: "#42d6a4", borderColor: "rgba(66,214,164,0.3)" }}
              onClick={() => handleNavigate("checks")}
            >
              View Checks <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
