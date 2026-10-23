import { useState, useMemo } from "react";
import {
  FileCode, AlertTriangle, ShieldAlert, CheckCircle2,
  Search, RefreshCw, Terminal, ArrowRight, Code2
} from "lucide-react";
import { analyzeRepositoryDrift } from "../lib/repoRealityCheck.js";

export default function RepoRealityCheckView({ canonicalModel, scaffoldFiles = [] }) {
  const [analyzing, setAnalyzing] = useState(false);

  const driftReport = useMemo(() => {
    return analyzeRepositoryDrift(scaffoldFiles, canonicalModel);
  }, [scaffoldFiles, canonicalModel]);

  return (
    <div className="repo-reality-check-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Control Header ─────────────────────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", padding: 6, background: "rgba(66, 214, 164, 0.15)", borderRadius: 8, color: "#42d6a4" }}>
            <FileCode size={20} />
          </span>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              Repository Reality Check & Architectural Drift
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Compares static source code artifacts (Express routes, Mongoose schemas) against the canonical blueprint.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#737e92" }}>
          <span>Scanned: <strong style={{ color: "#f3f5fa" }}>{driftReport.scannedFilesCount} files</strong></span>
        </div>
      </div>

      {/* ─── Drift Metrics Overview ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ background: "#0d1017", border: "1px solid rgba(243,185,107,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>GHOST ENDPOINTS</span>
          <strong style={{ fontSize: 28, color: "#f3b96b", fontWeight: 800 }}>
            {driftReport.summary.ghostRoutes}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>in blueprint, missing in code</span>
        </div>

        <div style={{ background: "#0d1017", border: "1px solid rgba(83,215,244,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>UNDOCUMENTED ROUTES</span>
          <strong style={{ fontSize: 28, color: "#53d7f4", fontWeight: 800 }}>
            {driftReport.summary.undocumentedRoutes}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>in code, missing in blueprint</span>
        </div>

        <div style={{ background: "#0d1017", border: "1px solid rgba(255,115,125,0.3)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>SECURITY GAPS</span>
          <strong style={{ fontSize: 28, color: "#ff737d", fontWeight: 800 }}>
            {driftReport.summary.securityGaps}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>routes lacking auth</span>
        </div>

        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px" }}>
          <span style={{ fontSize: 11, color: "#737e92", display: "block", fontWeight: 600 }}>EXTRACTED ROUTES</span>
          <strong style={{ fontSize: 28, color: "#42d6a4", fontWeight: 800 }}>
            {driftReport.extractedRoutesCount}
          </strong>
          <span style={{ fontSize: 11, color: "#a2abbd", display: "block" }}>Express route handlers</span>
        </div>
      </div>

      {/* ─── Detailed Drift Findings List ───────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: "0 0 16px 0" }}>
          Drift Findings & Source Evidence ({driftReport.findings.length})
        </h4>

        {driftReport.findings.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#42d6a4" }}>
            ✓ Complete alignment: Source code matches the canonical blueprint specification!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {driftReport.findings.map(finding => {
              const isError = finding.severity === "error";
              const isWarning = finding.severity === "warning";

              let badgeColor = "#53d7f4";
              let badgeBg = "rgba(83,215,244,0.15)";
              if (isError) {
                badgeColor = "#ff737d";
                badgeBg = "rgba(255,115,125,0.15)";
              } else if (isWarning) {
                badgeColor = "#f3b96b";
                badgeBg = "rgba(243,185,107,0.15)";
              }

              return (
                <div
                  key={finding.id}
                  style={{
                    background: "#121722",
                    borderRadius: 10,
                    border: `1px solid ${isError ? "rgba(255,115,125,0.3)" : "rgba(255,255,255,0.08)"}`,
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: badgeBg, color: badgeColor, textTransform: "uppercase" }}>
                        {finding.type.replace(/_/g, " ")}
                      </span>
                      <strong style={{ fontSize: 14, color: "#f3f5fa" }}>{finding.title}</strong>
                    </div>
                    <span style={{ fontSize: 11, color: "#737e92" }}>
                      Confidence: {finding.confidence}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "#a2abbd", margin: 0 }}>
                    {finding.description}
                  </p>

                  {/* Concrete Source Evidence Box */}
                  <div style={{ background: "#08090d", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace", fontSize: 11 }}>
                    <span style={{ color: "#737e92", display: "block", marginBottom: 4 }}>EVIDENCE:</span>
                    <span style={{ color: "#53d7f4" }}>{finding.evidence}</span>
                  </div>

                  {/* Actionable Remediation */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#42d6a4" }}>
                    <strong>Action:</strong>
                    <span>{finding.remediation}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
