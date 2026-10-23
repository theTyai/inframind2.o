import { useState, useMemo } from "react";
import {
  Workflow, Play, RotateCcw, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, Zap, Activity, AlertOctagon
} from "lucide-react";
import {
  createWorkflowSimulation,
  fireWorkflowEvent,
  PRESET_SCENARIOS
} from "../lib/workflowSimulator.js";

export default function WorkflowSimulatorView({ canonicalModel }) {
  const workflows = canonicalModel?.workflows || [];
  const [selectedWorkflowIndex, setSelectedWorkflowIndex] = useState(0);

  const activeWorkflow = workflows[selectedWorkflowIndex] || workflows[0];

  const [simulation, setSimulation] = useState(() => 
    activeWorkflow ? createWorkflowSimulation(activeWorkflow) : null
  );

  // Reset simulation when workflow changes
  function handleSelectWorkflow(idx) {
    setSelectedWorkflowIndex(idx);
    const wf = workflows[idx];
    if (wf) setSimulation(createWorkflowSimulation(wf));
  }

  function handleFireEvent(eventName) {
    if (!simulation || !activeWorkflow) return;
    const next = fireWorkflowEvent(simulation, activeWorkflow, eventName);
    setSimulation(next);
  }

  function handleRunScenario(scenario) {
    if (!activeWorkflow) return;
    let sim = createWorkflowSimulation(activeWorkflow);
    scenario.events.forEach(evt => {
      sim = fireWorkflowEvent(sim, activeWorkflow, evt);
    });
    setSimulation(sim);
  }

  function handleReset() {
    if (activeWorkflow) setSimulation(createWorkflowSimulation(activeWorkflow));
  }

  if (!activeWorkflow) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#737e92" }}>
        No workflows found in this blueprint.
      </div>
    );
  }

  const states = activeWorkflow.states || ["draft", "pending_validation", "processing", "completed", "failed"];

  return (
    <div className="workflow-simulator-view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Control Header ─────────────────────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", padding: 6, background: "rgba(246, 173, 85, 0.15)", borderRadius: 8, color: "#f6ad55" }}>
            <Workflow size={20} />
          </span>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              Deterministic Workflow Simulator
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Primary Actor: <strong style={{ color: "#f6ad55" }}>{activeWorkflow.actor}</strong>
            </span>
          </div>
        </div>

        {/* Workflow Switcher & Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={selectedWorkflowIndex}
            onChange={(e) => handleSelectWorkflow(Number(e.target.value))}
            style={{ padding: "8px 12px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 13 }}
          >
            {workflows.map((wf, idx) => (
              <option key={wf.id || idx} value={idx}>{wf.name}</option>
            ))}
          </select>

          <button
            onClick={handleReset}
            className="secondary-button"
            title="Reset to initial state"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* ─── State Machine Transition Rail ──────────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
          STATE MACHINE LIFECYCLE
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {states.map((st, idx) => {
            const isActive = simulation?.currentState === st;
            const isCompleted = simulation?.completed && st === "completed";
            const isFailed = simulation?.failed && st === "failed";

            let bg = "#121722";
            let border = "rgba(255,255,255,0.08)";
            let textColor = "#a2abbd";
            let shadow = "none";

            if (isActive) {
              if (isFailed) {
                bg = "rgba(255, 115, 125, 0.2)";
                border = "#ff737d";
                textColor = "#ff737d";
                shadow = "0 0 16px rgba(255,115,125,0.4)";
              } else if (isCompleted) {
                bg = "rgba(66, 214, 164, 0.2)";
                border = "#42d6a4";
                textColor = "#42d6a4";
                shadow = "0 0 16px rgba(66,214,164,0.4)";
              } else {
                bg = "rgba(83, 215, 244, 0.2)";
                border = "#53d7f4";
                textColor = "#53d7f4";
                shadow = "0 0 16px rgba(83,215,244,0.4)";
              }
            }

            return (
              <div key={st} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: bg,
                    border: `1.5px solid ${border}`,
                    color: textColor,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    boxShadow: shadow,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s ease"
                  }}
                >
                  {isActive && <Activity size={14} className="pulse-icon" />}
                  {st.replace(/_/g, " ")}
                </div>
                {idx < states.length - 1 && (
                  <ArrowRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Event Dispatcher & Scenario Library ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
        {/* Available Event Triggers */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#53d7f4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
            DISPATCH EVENT FROM CURRENT STATE ({simulation?.currentState})
          </span>

          {simulation?.completed || simulation?.failed ? (
            <div style={{ padding: "16px", background: "#121722", borderRadius: 8, textAlign: "center", color: "#a2abbd", fontSize: 13 }}>
              Workflow reached terminal state: <strong style={{ color: simulation.completed ? "#42d6a4" : "#ff737d" }}>{simulation.currentState}</strong>. Click Reset to run again.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(simulation?.availableEvents || []).map((ev, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFireEvent(ev.event)}
                  className="secondary-button"
                  style={{
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: ev.isFailurePath ? "rgba(255,115,125,0.08)" : "#121722",
                    borderColor: ev.isFailurePath ? "rgba(255,115,125,0.3)" : "rgba(255,255,255,0.12)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Play size={14} style={{ color: ev.isFailurePath ? "#ff737d" : "#53d7f4" }} />
                    <strong style={{ color: ev.isFailurePath ? "#ff737d" : "#f3f5fa", fontSize: 13 }}>
                      {ev.event}
                    </strong>
                    <span style={{ fontSize: 11, color: "#737e92" }}>
                      → {ev.targetState}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#a2abbd", fontStyle: "italic" }}>
                    Guard: {ev.guard}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preset Scenarios Library */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f6ad55", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
            PRESET SCENARIOS
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PRESET_SCENARIOS.map(scen => (
              <div
                key={scen.id}
                style={{
                  padding: "12px 14px",
                  background: "#121722",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13, color: "#f3f5fa" }}>{scen.title}</strong>
                  <button
                    onClick={() => handleRunScenario(scen)}
                    className="primary-button"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    Run Scenario
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#a2abbd", margin: 0 }}>
                  {scen.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Execution Timeline & History Log ───────────────────────────────── */}
      <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: "0 0 14px 0" }}>
          Simulation Execution History ({simulation?.history?.length || 0} steps)
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(simulation?.history || []).map((step, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 140px 1fr 140px",
                alignItems: "center",
                padding: "10px 14px",
                background: "#121722",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12
              }}
            >
              <span style={{ fontWeight: 700, color: "#737e92" }}>#{step.step}</span>
              <strong style={{ color: step.status === "rejected" ? "#ff737d" : "#53d7f4" }}>
                {step.event}
              </strong>
              <div style={{ color: "#a2abbd" }}>
                <span>{step.fromState ? `${step.fromState} → ` : ""}<strong style={{ color: "#f3f5fa" }}>{step.toState}</strong></span>
                <span style={{ display: "block", fontSize: 11, color: "#737e92" }}>{step.actionExecuted}</span>
              </div>
              <span style={{ textAlign: "right", color: step.status === "rejected" ? "#ff737d" : "#42d6a4", fontWeight: 600 }}>
                {step.status === "rejected" ? "FAIL" : "PASSED"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
