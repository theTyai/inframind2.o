import {
  ShieldCheck, AlertTriangle, Cpu, Database, Boxes,
  Code2, Lock, Activity, CheckCircle2, ArrowRight
} from "lucide-react";

export default function ProjectHealthSummary({
  canonicalModel,
  compilerFindings = [],
  onNavigateTab,
  // legacy prop aliases for backward compat
  onNavigateSection
}) {
  // Support both prop names
  const handleNavigate = onNavigateTab || onNavigateSection;

  const componentsCount = canonicalModel?.components?.length || 0;
  // "Collections" = canonical entities (MongoDB collections)
  const entitiesCount = canonicalModel?.entities?.length || 0;
  const apisCount = canonicalModel?.apis?.length || 0;
  // Scaffold can live on canonical model or on the raw blueprint
  const scaffoldCount = canonicalModel?.scaffold?.length || 0;
  const threats = canonicalModel?.threats || [];
  const openThreats = threats.filter(t => t.status === "open").length;
  const mitigatedThreats = threats.filter(t => t.status === "mitigated").length;

  const passedRules = compilerFindings.filter(f => f.severity === "pass").length;
  const errorRules = compilerFindings.filter(f => f.severity === "error").length;
  const warningRules = compilerFindings.filter(f => f.severity === "warning").length;
  const totalRules = compilerFindings.length;

  // Only calculate health percent if we actually have findings to evaluate
  const healthPercent = totalRules > 0
    ? Math.round((passedRules / totalRules) * 100)
    : null;

  // Attention signals
  const attentionItems = [];
  if (errorRules > 0) {
    attentionItems.push({
      type: "error",
      text: `${errorRules} compiler rule(s) failed with structural or contract errors.`,
      actionTab: "checks",
      actionLabel: "Inspect Checks"
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
    <div className="health-summary-container">
      {/* Topline Platform Banner */}
      <div className="health-banner">
        <div className="banner-left">
          <div className="status-pill-group">
            <span className={`status-badge ${errorRules > 0 ? "at-risk" : totalRules > 0 ? "healthy" : "pending"}`}>
              <span className="pulse-dot" />
              {errorRules > 0 ? "ATTENTION REQUIRED" : totalRules > 0 ? "COMPILER VERIFIED" : "NOT EVALUATED"}
            </span>
            <span className="platform-tag">MongoDB · Express · React · Node</span>
          </div>
          <h3 className="banner-title">
            {canonicalModel?.metadata?.projectName || "System Architecture"}
          </h3>
          <p className="banner-desc">
            {canonicalModel?.metadata?.summary || "Full-stack system blueprint."}
          </p>
        </div>

        <div className="banner-health-ring">
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

      {/* KPI Cards Grid */}
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

      {/* What Needs Attention */}
      {attentionItems.length > 0 && (
        <div className="attention-box">
          <div className="attention-header">
            <AlertTriangle size={15} className="warning-icon" />
            <h4>System Governance & Findings Requiring Review ({attentionItems.length})</h4>
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

      {/* Checks summary strip when no errors */}
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
            All {totalRules} compiler checks passed — {passedRules} rules verified, {warningRules} warnings for review.
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
