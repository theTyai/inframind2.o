import { useState, useEffect } from "react";
import {
  Sparkles, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck,
  X, Layers, Cpu, Database, Zap, FileCode, Check
} from "lucide-react";
import { API_BASE } from "../../lib/api.js";

const STAGES = [
  { id: "clarify", label: "Analyze & Clarify Specification", icon: Sparkles },
  { id: "requirements", label: "Synthesize Requirements & Personas", icon: Layers },
  { id: "architecture", label: "Model Components & Storage Tier", icon: Cpu },
  { id: "apis", label: "Design REST Contracts & Workflows", icon: Zap },
  { id: "compile", label: "Deterministic Invariant Compiler", icon: ShieldCheck },
  { id: "repair", label: "Self-Healing Auto-Repair Loop", icon: RefreshCw },
  { id: "scaffold", label: "Generate Verified Starter Code", icon: FileCode },
  { id: "complete", label: "Seal Immutable Revision", icon: CheckCircle2 }
];

export default function PipelineStreamingModal({
  isOpen,
  projectId,
  initialSpec = "",
  onClose,
  onGenerationComplete
}) {
  const [specification, setSpecification] = useState(initialSpec);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStageId, setCurrentStageId] = useState("");
  const [stageStatuses, setStageStatuses] = useState({}); // { [stageId]: "pending" | "active" | "completed" | "failed" }
  const [stageLogs, setStageLogs] = useState([]);
  const [repairsSummary, setRepairsSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSpecification(initialSpec);
  }, [initialSpec]);

  const handleStartGeneration = async (e) => {
    e.preventDefault();
    if (specification.trim().length < 20 || isStreaming) return;

    setIsStreaming(true);
    setError("");
    setRepairsSummary(null);
    setStageLogs([]);
    setCurrentStageId("clarify");

    // Initialize all to pending
    const initialStatuses = {};
    STAGES.forEach(s => { initialStatuses[s.id] = "pending"; });
    initialStatuses.clarify = "active";
    setStageStatuses(initialStatuses);

    // Open EventSource SSE connection
    const encodedSpec = encodeURIComponent(specification.trim());
    const sseUrl = `${API_BASE}/api/projects/${projectId}/generate-stream?spec=${encodedSpec}`;

    try {
      const eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.addEventListener("stage", (event) => {
        const payload = JSON.parse(event.data);
        setCurrentStageId(payload.stage);
        setStageStatuses(prev => ({
          ...prev,
          [payload.stage]: payload.status
        }));

        if (payload.message) {
          setStageLogs(logs => [...logs, `[${payload.stage}] ${payload.message}`]);
        }
        if (payload.repairLogs?.length) {
          payload.repairLogs.forEach(r => {
            setStageLogs(logs => [...logs, `[auto-repair] 🛡️ ${r}`]);
          });
        }
        if (payload.repairsApplied !== undefined) {
          setRepairsSummary({
            applied: payload.repairsApplied,
            health: payload.healthPercent
          });
        }
      });

      eventSource.addEventListener("complete", (event) => {
        const payload = JSON.parse(event.data);
        eventSource.close();
        setIsStreaming(false);
        setStageStatuses(prev => {
          const finished = { ...prev };
          STAGES.forEach(s => { finished[s.id] = "completed"; });
          return finished;
        });

        if (onGenerationComplete) {
          onGenerationComplete(payload.blueprint, payload.metrics, payload.versionNumber);
        }
      });

      eventSource.addEventListener("error", (event) => {
        eventSource.close();
        setIsStreaming(false);
        setError("Streaming pipeline interrupted. Check server connectivity or use standard synthesis.");
      });

    } catch (err) {
      setIsStreaming(false);
      setError(err.message || "Failed to establish SSE stream.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => !isStreaming && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 9, 13, 0.8)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#0d1017",
          border: "1px solid rgba(139, 124, 255, 0.3)",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 22px",
          background: "#121722",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(139,124,255,0.2)",
              color: "#8b7cff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Sparkles size={16} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f5fa" }}>
                Compiler-Driven Staged Generation Pipeline
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "#a2abbd" }}>
                AI synthesizes, deterministic compiler verifies every invariant, self-healing loop auto-repairs defects.
              </p>
            </div>
          </div>
          {!isStreaming && (
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#737e92", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Form / Pipeline View */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!isStreaming && Object.keys(stageStatuses).length === 0 ? (
            <form onSubmit={handleStartGeneration} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#737e92", marginBottom: 6 }}>
                  SYSTEM REQUIREMENTS SPECIFICATION
                </label>
                <textarea
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  placeholder="Describe your system requirements, APIs, workflows, and data constraints..."
                  rows={7}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#121722",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#f3f5fa",
                    fontSize: 12,
                    resize: "vertical"
                  }}
                  required
                />
              </div>

              {error && (
                <div style={{ color: "#ff737d", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="secondary-button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={specification.trim().length < 20}
                >
                  <Sparkles size={14} /> Launch Staged Pipeline (SSE)
                </button>
              </div>
            </form>
          ) : (
            /* Live Stage Execution Ticker */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Stages List */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {STAGES.map(stage => {
                  const status = stageStatuses[stage.id] || "pending";
                  const isCurrent = currentStageId === stage.id && status === "active";
                  const isDone = status === "completed";
                  const Icon = stage.icon;

                  let badgeColor = "#737e92";
                  let bg = "#121722";
                  let border = "rgba(255,255,255,0.06)";

                  if (isCurrent) {
                    badgeColor = "#53d7f4";
                    bg = "rgba(83, 215, 244, 0.08)";
                    border = "rgba(83, 215, 244, 0.3)";
                  } else if (isDone) {
                    badgeColor = "#42d6a4";
                    bg = "rgba(66, 214, 164, 0.08)";
                    border = "rgba(66, 214, 164, 0.25)";
                  }

                  return (
                    <div
                      key={stage.id}
                      style={{
                        padding: "8px 12px",
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCurrent ? (
                          <RefreshCw size={13} className="spin" style={{ color: "#53d7f4" }} />
                        ) : isDone ? (
                          <CheckCircle2 size={13} style={{ color: "#42d6a4" }} />
                        ) : (
                          <Icon size={13} style={{ color: "#737e92" }} />
                        )}
                        <span style={{ fontSize: 11, color: isDone ? "#f3f5fa" : isCurrent ? "#53d7f4" : "#737e92", fontWeight: isDone || isCurrent ? 600 : 400 }}>
                          {stage.label}
                        </span>
                      </div>

                      <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, textTransform: "uppercase" }}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Auto-repair highlight banner */}
              {repairsSummary && (
                <div style={{
                  padding: "10px 14px",
                  background: "rgba(66, 214, 164, 0.1)",
                  border: "1px solid rgba(66, 214, 164, 0.3)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#42d6a4"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={16} />
                    <span>Self-healing loop: <strong>{repairsSummary.applied} defect(s) auto-repaired</strong></span>
                  </div>
                  <span style={{ fontWeight: 800 }}>Health: {repairsSummary.health}%</span>
                </div>
              )}

              {/* Stream Logs Output */}
              <div style={{
                maxHeight: 140,
                overflowY: "auto",
                background: "#08090d",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "monospace",
                fontSize: 10,
                color: "#9be8f9",
                lineHeight: 1.5
              }}>
                {stageLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
                {stageLogs.length === 0 && <div>Connecting to pipeline stream...</div>}
              </div>

              {/* Complete / Close actions */}
              {!isStreaming && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="primary-button" onClick={onClose}>
                    <Check size={14} /> Open Verified Blueprint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
