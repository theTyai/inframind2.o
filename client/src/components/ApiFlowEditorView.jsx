import { useState } from "react";
import {
  Zap, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Clock, ShieldCheck, Terminal, RefreshCw, Key
} from "lucide-react";
import { executeApiFlowMock } from "../lib/apiFlowEngine.js";

export default function ApiFlowEditorView({ canonicalModel }) {
  const flows = canonicalModel?.apiFlows || [];
  const [selectedFlowIndex, setSelectedFlowIndex] = useState(0);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);

  const activeFlow = flows[selectedFlowIndex] || flows[0];

  function handleRunFlow() {
    if (!activeFlow) return;
    setRunning(true);
    setTimeout(() => {
      const res = executeApiFlowMock(activeFlow);
      setRunResult(res);
      setRunning(false);
    }, 350);
  }

  if (!activeFlow) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#737e92" }}>
        No API flows defined in this blueprint.
      </div>
    );
  }

  return (
    <div className="api-flow-editor-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Control Header ─────────────────────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", padding: 6, background: "rgba(99, 179, 237, 0.15)", borderRadius: 8, color: "#63b3ed" }}>
            <Zap size={20} />
          </span>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              Visual API Flow Editor & Mock Runner
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Chained API request workflows with automated assertions and variable propagation.
            </span>
          </div>
        </div>

        {/* Action CTA */}
        <button
          onClick={handleRunFlow}
          className="primary-button"
          disabled={running}
          style={{ padding: "8px 18px", fontSize: 13 }}
        >
          <Play size={14} /> {running ? "Simulating Flow…" : "Execute Mock Flow"}
        </button>
      </div>

      {/* ─── Visual Flow Chain ──────────────────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px", overflowX: "auto" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
          CHAINED WORKFLOW NODES ({activeFlow.nodes?.length || 0})
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 700 }}>
          {(activeFlow.nodes || []).map((node, idx) => {
            let color = "#8b7cff";
            let bg = "rgba(139,124,255,0.15)";

            if (node.type === "start" || node.type === "end") {
              color = "#737e92";
              bg = "rgba(255,255,255,0.06)";
            } else if (node.type === "http") {
              color = "#53d7f4";
              bg = "rgba(83,215,244,0.15)";
            } else if (node.type === "assertion") {
              color = "#42d6a4";
              bg = "rgba(66,214,164,0.15)";
            } else if (node.type === "auth") {
              color = "#f3b96b";
              bg = "rgba(243,185,107,0.15)";
            }

            return (
              <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#121722",
                    borderRadius: 10,
                    border: `1.5px solid ${color}`,
                    minWidth: 140,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {node.type}
                  </span>
                  <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{node.label}</strong>
                  {node.config?.expectedStatus && (
                    <span style={{ fontSize: 10, color: "#42d6a4" }}>Status: {node.config.expectedStatus} OK</span>
                  )}
                </div>
                {idx < activeFlow.nodes.length - 1 && (
                  <ArrowRight size={18} style={{ color: "rgba(255,255,255,0.2)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Execution Timeline & Live Variables ───────────────────────────── */}
      {runResult && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
          {/* Step Timeline */}
          <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
                Execution Timeline ({runResult.totalDurationMs}ms total)
              </h4>
              <span style={{ fontSize: 12, color: runResult.success ? "#42d6a4" : "#ff737d", fontWeight: 700 }}>
                {runResult.success ? "✓ ALL STEPS PASSED" : "✕ FAILED"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {runResult.steps.map(step => (
                <div
                  key={step.step}
                  style={{
                    padding: "10px 14px",
                    background: "#121722",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 12
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#737e92", fontWeight: 700 }}>#{step.step}</span>
                      <strong style={{ color: "#f3f5fa" }}>{step.label}</strong>
                    </div>
                    <span style={{ color: "#737e92", fontSize: 11 }}>{step.durationMs}ms</span>
                  </div>
                  <span style={{ color: "#a2abbd", fontSize: 11 }}>{step.details}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exported Variable Store */}
          <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: "0 0 14px 0" }}>
              Runtime Variable Store
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(runResult.exportedVariables || {}).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    padding: "8px 12px",
                    background: "#121722",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "monospace",
                    fontSize: 11
                  }}
                >
                  <strong style={{ color: "#8b7cff" }}>{`{{${key}}}`}</strong>:{" "}
                  <span style={{ color: "#42d6a4" }}>
                    {typeof val === "object" ? JSON.stringify(val).slice(0, 40) + "…" : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
