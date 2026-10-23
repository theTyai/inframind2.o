import { useState, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, CheckCircle2,
  Info, ArrowRight
} from "lucide-react";
import { runCompilerChecks, RULE_CATEGORIES } from "../lib/consistencyEngine.js";

export default function CompilerFindingsView({ canonicalModel }) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);

  const findings = useMemo(() => {
    return runCompilerChecks(canonicalModel);
  }, [canonicalModel]);

  const passedCount = findings.filter(f => f.severity === "pass").length;
  const errorCount = findings.filter(f => f.severity === "error").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const notEvaluatedCount = findings.filter(f => f.severity === "not_evaluated").length;
  const evaluatedCount = findings.filter(f => f.severity !== "not_evaluated").length;
  // Health percent: only count rules that were actually evaluated
  const healthPercent = evaluatedCount > 0
    ? Math.round((passedCount / evaluatedCount) * 100)
    : null;
  const healthColor = errorCount > 0 ? "#ff737d" : warningCount > 0 ? "#f3b96b" : "#42d6a4";

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (selectedCategory !== "ALL" && f.category !== selectedCategory) return false;
      if (selectedSeverity !== "ALL" && f.severity !== selectedSeverity) return false;
      return true;
    });
  }, [findings, selectedCategory, selectedSeverity]);

  return (
    <div className="compiler-findings-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Health Score & Overview ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 14 }}>
        {/* Score Card */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: healthPercent !== null
                ? `conic-gradient(${healthColor} ${healthPercent}%, rgba(255,255,255,0.1) 0%)`
                : "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#0d1017", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              {healthPercent !== null ? (
                <>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#f3f5fa" }}>{healthPercent}%</span>
                  <span style={{ fontSize: 9, color: "#737e92" }}>PASS</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#737e92" }}>N/A</span>
                  <span style={{ fontSize: 9, color: "#737e92" }}>N/E</span>
                </>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: healthColor, letterSpacing: 0.5, textTransform: "uppercase" }}>
              COMPILER HEALTH SCORE
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f3f5fa", margin: "4px 0" }}>
              {healthPercent !== null
                ? `${passedCount} of ${evaluatedCount} Rules Passing`
                : "No rules evaluated yet"}
            </h3>
            <p style={{ fontSize: 12, color: "#a2abbd", margin: 0 }}>
              Deterministic compiler pipeline evaluating structural, interface, data, and security invariants.
              {notEvaluatedCount > 0 && ` ${notEvaluatedCount} rule(s) not evaluated.`}
            </p>
          </div>
        </div>

        {/* Severity Metrics Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ background: "#0d1017", border: "1px solid rgba(255,115,125,0.3)", borderRadius: 10, padding: "16px 18px" }}>
            <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>BLOCKING ERRORS</span>
            <strong style={{ fontSize: 28, color: "#ff737d", fontWeight: 800 }}>{errorCount}</strong>
            <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>must be resolved</span>
          </div>

          <div style={{ background: "#0d1017", border: "1px solid rgba(243,185,107,0.3)", borderRadius: 10, padding: "16px 18px" }}>
            <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>WARNINGS</span>
            <strong style={{ fontSize: 28, color: "#f3b96b", fontWeight: 800 }}>{warningCount}</strong>
            <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>review before export</span>
          </div>

          <div style={{ background: "#0d1017", border: "1px solid rgba(66,214,164,0.3)", borderRadius: 10, padding: "16px 18px" }}>
            <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>VERIFIED RULES</span>
            <strong style={{ fontSize: 28, color: "#42d6a4", fontWeight: 800 }}>{passedCount}</strong>
            <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>invariants satisfied</span>
          </div>
        </div>
      </div>

      {/* ─── Category Filter Tabs ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", ...Object.values(RULE_CATEGORIES)].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 5,
                border: `1px solid ${selectedCategory === cat ? "#53d7f4" : "rgba(255,255,255,0.08)"}`,
                background: selectedCategory === cat ? "rgba(83,215,244,0.15)" : "#121722",
                color: selectedCategory === cat ? "#53d7f4" : "#737e92",
                cursor: "pointer",
                fontWeight: selectedCategory === cat ? 700 : 500
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "error", "warning", "pass"].map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: selectedSeverity === sev ? "#191f2c" : "transparent",
                color: selectedSeverity === sev ? "#f3f5fa" : "#737e92",
                cursor: "pointer",
                textTransform: "capitalize"
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Detailed Findings List ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredFindings.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#737e92", fontSize: 13 }}>
            No findings match the active filter.
          </div>
        )}
        {filteredFindings.map(finding => {
          const isPass = finding.severity === "pass";
          const isError = finding.severity === "error";
          const isWarning = finding.severity === "warning";
          const isExpanded = expandedId === finding.id;

          let border = "rgba(255,255,255,0.08)";
          let iconColor = "#53d7f4";
          let badgeBg = "rgba(83,215,244,0.15)";
          let Icon = Info;

          if (isPass) {
            border = "rgba(66,214,164,0.2)";
            iconColor = "#42d6a4";
            badgeBg = "rgba(66,214,164,0.15)";
            Icon = CheckCircle2;
          } else if (isError) {
            border = "rgba(255,115,125,0.3)";
            iconColor = "#ff737d";
            badgeBg = "rgba(255,115,125,0.15)";
            Icon = AlertOctagon;
          } else if (isWarning) {
            border = "rgba(243,185,107,0.3)";
            iconColor = "#f3b96b";
            badgeBg = "rgba(243,185,107,0.15)";
            Icon = AlertTriangle;
          }

          return (
            <div
              key={finding.id}
              style={{
                background: "#0d1017",
                border: `1px solid ${border}`,
                borderRadius: 10,
                overflow: "hidden"
              }}
            >
              {/* Header row — always visible, clickable to expand */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon size={17} style={{ color: iconColor, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13, color: "#f3f5fa", display: "block" }}>{finding.title}</strong>
                    <span style={{ fontSize: 10, color: "#737e92", fontFamily: "monospace" }}>
                      {finding.ruleId} · {finding.category}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Verification status badge */}
                  {finding.verificationStatus && finding.verificationStatus !== "not_applicable" && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: finding.verificationStatus === "verified" ? "rgba(66,214,164,0.15)" : "rgba(243,185,107,0.15)",
                      color: finding.verificationStatus === "verified" ? "#42d6a4" : "#f3b96b",
                      textTransform: "uppercase"
                    }}>
                      {finding.verificationStatus === "verified" ? "VERIFIED" : "UNVERIFIED"}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: badgeBg,
                    color: iconColor,
                    textTransform: "uppercase",
                    flexShrink: 0
                  }}>
                    {finding.severity}
                  </span>
                  <span style={{ color: "#737e92", fontSize: 11 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${border}` }}>
                  <p style={{ fontSize: 13, color: "#a2abbd", margin: "12px 0 0", lineHeight: 1.5 }}>
                    {finding.explanation}
                  </p>

                  {finding.evidence && (
                    <div style={{ background: "#121722", padding: "8px 12px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", color: "#53d7f4" }}>
                      <span style={{ color: "#737e92", display: "block", marginBottom: 2, fontFamily: "sans-serif", fontWeight: 700 }}>EVIDENCE</span>
                      {finding.evidence}
                    </div>
                  )}

                  {finding.affectedArtifacts?.length > 0 && (
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", display: "block", marginBottom: 4 }}>AFFECTED ARTIFACTS</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {finding.affectedArtifacts.map(id => (
                          <span key={id} style={{ fontSize: 10, padding: "2px 6px", background: "rgba(255,255,255,0.06)", borderRadius: 3, fontFamily: "monospace", color: "#a2abbd" }}>
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {finding.remediation && !isPass && (
                    <div style={{ fontSize: 12, color: "#42d6a4", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <ArrowRight size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span><strong>Remediation:</strong> {finding.remediation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
