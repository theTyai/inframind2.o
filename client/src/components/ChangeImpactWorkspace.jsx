import { useState, useMemo } from "react";
import {
  Zap, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight,
  RefreshCw, Check, X, Layers, Database, Cpu, Plus, Trash2, History,
  Sparkles, FileDiff, GitBranch, AlertCircle, Info, ChevronRight
} from "lucide-react";
import { simulateChangeImpact } from "../lib/impactSimulator.js";

export default function ChangeImpactWorkspace({ canonicalModel, onCommitRevision, initialTargetNode }) {
  const [targetId, setTargetId] = useState(initialTargetNode?.id || canonicalModel?.entities?.[0]?.id || "");
  const [changeType, setChangeType] = useState("modify");
  const [proposalDescription, setProposalDescription] = useState("Add tenant organization isolation filter and enforce strict ownership");
  const [simulationResult, setSimulationResult] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [selectedRippleArtifact, setSelectedRippleArtifact] = useState(null);

  // Available candidate artifacts for targeted modification
  const candidateArtifacts = useMemo(() => {
    const list = [];
    (canonicalModel?.entities || []).forEach(e => list.push({ id: e.id, label: `Entity: ${e.name}`, type: "entity", raw: e }));
    (canonicalModel?.components || []).forEach(c => list.push({ id: c.id, label: `Component: ${c.label}`, type: "component", raw: c }));
    (canonicalModel?.apis || []).forEach(a => list.push({ id: a.id, label: `API: ${a.method} ${a.path}`, type: "api", raw: a }));
    (canonicalModel?.requirements || []).forEach(r => list.push({ id: r.id, label: `Req: ${r.title}`, type: "requirement", raw: r }));
    return list;
  }, [canonicalModel]);

  // Pre-canned simulation scenarios for immediate exploration
  const sampleScenarios = [
    {
      title: "Strict Tenant Scoping",
      desc: "Inject multi-tenant isolation filters and require tenant ownership on entity queries.",
      type: "modify",
      targetType: "entity"
    },
    {
      title: "Introduce Rate Limiting",
      desc: "Add token bucket rate limiter to API Gateway routes.",
      type: "modify",
      targetType: "component"
    },
    {
      title: "Decommission Deprecated Endpoint",
      desc: "Remove legacy v1 endpoint and trace orphaned caller dependencies.",
      type: "delete",
      targetType: "api"
    }
  ];

  function handleSelectScenario(scenario) {
    const candidate = candidateArtifacts.find(c => c.type === scenario.targetType) || candidateArtifacts[0];
    if (candidate) setTargetId(candidate.id);
    setChangeType(scenario.type);
    setProposalDescription(scenario.desc);
    runSimulation(candidate?.id || targetId, scenario.type, scenario.desc);
  }

  function runSimulation(tId = targetId, cType = changeType, pDesc = proposalDescription) {
    const proposal = {
      type: cType,
      targetId: tId,
      description: pDesc,
      patch: {
        tenantScoped: true,
        authRequired: true,
        notes: "Modified during architectural impact simulation"
      }
    };

    const result = simulateChangeImpact(canonicalModel, proposal);
    setSimulationResult(result);
  }

  function handleApprove() {
    if (!simulationResult?.proposedModel || !onCommitRevision) return;
    setCommitting(true);
    onCommitRevision(simulationResult.proposedModel, {
      description: proposalDescription,
      blastRadiusCount: simulationResult.blastRadiusCount,
      targetId
    });
    setTimeout(() => {
      setCommitting(false);
      setSimulationResult(null);
    }, 1000);
  }

  // Identify direct vs transitive downstream
  const directDependents = useMemo(() => {
    if (!simulationResult) return [];
    return simulationResult.affectedArtifacts.filter(a => a.reason.includes("Direct"));
  }, [simulationResult]);

  const transitiveDependents = useMemo(() => {
    if (!simulationResult) return [];
    return simulationResult.affectedArtifacts.filter(a => !a.reason.includes("Direct"));
  }, [simulationResult]);

  const selectedTargetArtifact = candidateArtifacts.find(c => c.id === targetId);

  return (
    <div className="change-impact-workspace" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ─── Topline Context Header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", padding: 6, background: "rgba(255, 115, 125, 0.15)", borderRadius: 8, color: "#ff737d" }}>
            <Zap size={18} />
          </span>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f3f5fa", margin: 0 }}>
              Change Impact Analysis & Safe Patching
            </h3>
            <span style={{ fontSize: 12, color: "#a2abbd" }}>
              Simulate architectural alterations, evaluate ripple effects across services, and approve immutable revisions.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="subtle-chip" style={{ fontSize: 11 }}>DETERMINISTIC SIMULATOR</span>
        </div>
      </div>

      {/* ─── 3-Part Architecture Layout ───────────────────────────────────────── */}
      <div className="impact-three-panel-grid" style={{ display: "grid", gridTemplateColumns: "310px 1fr 340px", gap: 16, alignItems: "start" }}>
        
        {/* ─── Pane 1: Request & Change Context ─────────────────────────────── */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
            <GitBranch size={15} style={{ color: "#8b7cff" }} />
            <strong style={{ fontSize: 13, color: "#f3f5fa" }}>Change Request</strong>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#737e92", marginBottom: 5 }}>
              TARGET ARTIFACT
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12 }}
            >
              {candidateArtifacts.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#737e92", marginBottom: 5 }}>
              ACTION TYPE
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12 }}
            >
              <option value="modify">Modify Schema / Attributes</option>
              <option value="add">Add Architecture Component</option>
              <option value="delete">Decommission / Remove Artifact</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#737e92", marginBottom: 5 }}>
              PROPOSED SPECIFICATION
            </label>
            <textarea
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              placeholder="Describe proposal changes…"
              rows={3}
              style={{ width: "100%", padding: "7px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12, resize: "vertical" }}
            />
          </div>

          <button
            className="primary-button"
            onClick={() => runSimulation()}
            style={{ width: "100%", justifyContent: "center", padding: "8px 14px", fontSize: 12 }}
          >
            <Zap size={14} /> Calculate Impact Radius
          </button>

          {/* Quick Pre-canned Scenarios */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              EXPLORE SCENARIOS
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sampleScenarios.map((sc, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectScenario(sc)}
                  style={{
                    padding: "8px 10px",
                    background: "#121722",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  className="scenario-chip"
                >
                  <strong style={{ fontSize: 12, color: "#f3f5fa", display: "block" }}>{sc.title}</strong>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block", marginTop: 2 }}>{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Pane 2: Dependency Graph & Impact Visualization ──────────────── */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={15} style={{ color: "#53d7f4" }} />
              <strong style={{ fontSize: 13, color: "#f3f5fa" }}>Impact Topology & Ripple Cone</strong>
            </div>
            {simulationResult && (
              <span style={{ fontSize: 11, color: "#ff737d", fontWeight: 700 }}>
                ⚡ {simulationResult.blastRadiusCount} Artifacts in Blast Cone
              </span>
            )}
          </div>

          {simulationResult ? (
            <>
              {/* Stat Summary Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ background: "#121722", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,115,125,0.25)" }}>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block", fontWeight: 700 }}>BLAST RADIUS</span>
                  <strong style={{ fontSize: 22, color: "#ff737d", fontWeight: 800 }}>
                    {simulationResult.blastRadiusCount}
                  </strong>
                  <span style={{ fontSize: 10, color: "#a2abbd", display: "block" }}>total affected</span>
                </div>
                <div style={{ background: "#121722", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(139,124,255,0.25)" }}>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block", fontWeight: 700 }}>DIRECT CONSUMERS</span>
                  <strong style={{ fontSize: 22, color: "#8b7cff", fontWeight: 800 }}>
                    {directDependents.length}
                  </strong>
                  <span style={{ fontSize: 10, color: "#a2abbd", display: "block" }}>1st degree</span>
                </div>
                <div style={{ background: "#121722", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(83,215,244,0.25)" }}>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block", fontWeight: 700 }}>TRANSITIVE CASCADE</span>
                  <strong style={{ fontSize: 22, color: "#53d7f4", fontWeight: 800 }}>
                    {transitiveDependents.length}
                  </strong>
                  <span style={{ fontSize: 10, color: "#a2abbd", display: "block" }}>2nd+ degree</span>
                </div>
              </div>

              {/* Visual Blast Cone Map */}
              <div style={{ background: "#121722", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                  TOPOLOGICAL BLAST CONE
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Epicenter */}
                  <div style={{ padding: "8px 12px", background: "rgba(255,115,125,0.15)", border: "1px solid #ff737d", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff737d", display: "inline-block" }} />
                      <strong style={{ fontSize: 12, color: "#f3f5fa" }}>Epicenter: {selectedTargetArtifact?.label || targetId}</strong>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#ff737d" }}>MODIFIED</span>
                  </div>

                  {/* Direct Dependents */}
                  <div>
                    <span style={{ fontSize: 10, color: "#8b7cff", fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Direct Downstream ({directDependents.length})
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {directDependents.map((art, idx) => (
                        <span
                          key={idx}
                          style={{ fontSize: 11, padding: "3px 8px", background: "rgba(139,124,255,0.15)", border: "1px solid rgba(139,124,255,0.3)", borderRadius: 4, color: "#c2b9ff" }}
                        >
                          {art.label}
                        </span>
                      ))}
                      {directDependents.length === 0 && (
                        <span style={{ fontSize: 11, color: "#737e92" }}>No direct dependents</span>
                      )}
                    </div>
                  </div>

                  {/* Transitive Dependents */}
                  <div>
                    <span style={{ fontSize: 10, color: "#53d7f4", fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Transitive Downstream ({transitiveDependents.length})
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {transitiveDependents.map((art, idx) => (
                        <span
                          key={idx}
                          style={{ fontSize: 11, padding: "3px 8px", background: "rgba(83,215,244,0.1)", border: "1px solid rgba(83,215,244,0.25)", borderRadius: 4, color: "#9be8f9" }}
                        >
                          {art.label}
                        </span>
                      ))}
                      {transitiveDependents.length === 0 && (
                        <span style={{ fontSize: 11, color: "#737e92" }}>No secondary cascade</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ripple Chain Artifacts Table */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f3f5fa", display: "block", marginBottom: 8 }}>
                  Affected Artifact Details ({simulationResult.affectedArtifacts.length})
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                  {simulationResult.affectedArtifacts.map((art, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 10px",
                        background: "#121722",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11
                      }}
                    >
                      <div>
                        <strong style={{ color: "#f3f5fa", display: "block" }}>{art.label}</strong>
                        <span style={{ color: "#737e92", fontFamily: "monospace", fontSize: 10 }}>{art.id} · {art.type}</span>
                      </div>
                      <span style={{ color: "#a2abbd", maxWidth: 160, textAlign: "right" }}>{art.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#a2abbd" }}>
              <Zap size={32} style={{ color: "#737e92", margin: "0 auto 12px" }} />
              <h4 style={{ color: "#f3f5fa", margin: "0 0 6px" }}>Ready for Simulation</h4>
              <p style={{ fontSize: 12, margin: 0 }}>
                Select an artifact on the left panel or click one of the pre-canned scenarios to visualize the downstream ripple effects.
              </p>
            </div>
          )}
        </div>

        {/* ─── Pane 3: Findings, Diff & Approval ────────────────────────────── */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
            <FileDiff size={15} style={{ color: "#42d6a4" }} />
            <strong style={{ fontSize: 13, color: "#f3f5fa" }}>Verification & Diff</strong>
          </div>

          {simulationResult ? (
            <>
              {/* Compiler & Security Findings */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  NEW VALIDATION FINDINGS
                </span>
                {simulationResult.summary.newRisksCount > 0 ? (
                  <div style={{ padding: "8px 10px", background: "rgba(255,115,125,0.12)", border: "1px solid rgba(255,115,125,0.3)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, color: "#ff737d", fontSize: 11 }}>
                    <AlertTriangle size={14} />
                    <span>{simulationResult.summary.newRisksCount} new consistency findings detected</span>
                  </div>
                ) : (
                  <div style={{ padding: "8px 10px", background: "rgba(66,214,164,0.12)", border: "1px solid rgba(66,214,164,0.3)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, color: "#42d6a4", fontSize: 11 }}>
                    <CheckCircle2 size={14} />
                    <span>0 new compiler regressions</span>
                  </div>
                )}
              </div>

              {/* AI-Suggested Semantic Risks */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    SEMANTIC RISKS
                  </span>
                  <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(139,124,255,0.2)", borderRadius: 3, color: "#c2b9ff" }}>
                    AI Suggestion · Review required
                  </span>
                </div>
                <div style={{ padding: "8px 10px", background: "#121722", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#a2abbd" }}>
                  <span>Verify existing mobile clients migrate to tenant-scoped headers before deploying database index constraints.</span>
                </div>
              </div>

              {/* Structured Diff Preview */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  STRUCTURED DIFF PREVIEW
                </span>
                <pre style={{ margin: 0, padding: 8, background: "#08090d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 10, color: "#9be8f9", maxHeight: 110, overflowY: "auto", fontFamily: "var(--font-mono)" }}>
{`// Target: ${targetId} (${changeType})
+ tenantScoped: true
+ authRequired: true
+ strictOwnershipEnforced: true
~ updatedAt: "${new Date().toISOString().slice(0, 10)}"`}
                </pre>
              </div>

              {/* Review & Approval Controls */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  className="primary-button"
                  onClick={handleApprove}
                  disabled={committing}
                  style={{ width: "100%", justifyContent: "center", padding: "8px 14px", fontSize: 12 }}
                >
                  <Check size={14} /> {committing ? "Committing Version…" : "Approve & Commit Revision"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setSimulationResult(null)}
                  style={{ width: "100%", justifyContent: "center", padding: "6px 12px", fontSize: 11 }}
                >
                  <X size={12} /> Discard Proposal
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#737e92", padding: "20px 0", textAlign: "center" }}>
              Run impact calculation to generate verification checks and diff preview.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
