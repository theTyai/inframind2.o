import { useState, useMemo } from "react";
import {
  CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck, Zap,
  Layers, ArrowRight, Play, RefreshCw, Check, X, Code2, Database
} from "lucide-react";
import { simulateChangeImpact } from "../../lib/impactSimulator.js";

export default function AnalyzeWorkspace({
  canonicalModel = {},
  compilerFindings = [],
  onSelectArtifact = () => {},
  onCommitRevision = () => {}
}) {
  const [activeSubView, setActiveSubView] = useState("checks"); // "checks" | "threats" | "impact"

  const components = Array.isArray(canonicalModel.components) ? canonicalModel.components : [];
  const dbComp = components.find((c) => c.tier === "database") || components[0] || null;
  const backendComp = components.find((c) => c.tier === "service" || c.tier === "gateway") || components[0] || null;

  // ─── Change Impact Simulator State ─────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState("migrate_sql");
  const [targetComponentId, setTargetComponentId] = useState(() => dbComp?.id || components[0]?.id || "");
  const [simulationResult, setSimulationResult] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);

  const presets = [
    {
      id: "migrate_sql",
      title: "Migrate MongoDB to PostgreSQL (Relational SQL)",
      targetTier: "database",
      desc: "Converts NoSQL document schema to PostgreSQL relational tables with ACID transactions, foreign keys, and migration scripts.",
      patch: { databaseType: "PostgreSQL", dialect: "pg", pool: 20 }
    },
    {
      id: "add_redis",
      title: "Deploy Redis In-Memory Caching Tier",
      targetTier: "service",
      desc: "Injects Redis 7 key-value cache layer with TTL invalidation to absorb high-traffic read load.",
      patch: { cachingLayer: "Redis", ttlSeconds: 300 }
    },
    {
      id: "require_auth",
      title: "Enforce JWT Auth on Public Endpoints",
      targetTier: "gateway",
      desc: "Applies Bearer token authentication to all previously unauthenticated routes.",
      patch: { authRequired: true }
    },
    {
      id: "add_stripe",
      title: "Integrate Stripe Payment Gateway",
      targetTier: "external",
      desc: "Adds third-party webhook verification, idempotent checkout sessions, and payment event handling.",
      patch: { externalIntegration: "Stripe", webhookVerification: true }
    }
  ];

  // Run deterministic impact simulation when preset or target changes
  const runSimulation = (presetId = selectedPreset, targetId = targetComponentId) => {
    const preset = presets.find((p) => p.id === presetId) || presets[0];
    const targetComp = components.find((c) => c.id === targetId) || components[0];

    const proposal = {
      type: "modify",
      targetId: targetComp?.id || "comp-1",
      description: preset.title,
      patch: preset.patch
    };

    const res = simulateChangeImpact(canonicalModel, proposal);
    setSimulationResult({
      ...res,
      preset,
      targetComp
    });
    setHasApplied(false);
  };

  const handleApplyPreset = (p) => {
    setSelectedPreset(p.id);
    let target = dbComp?.id;
    if (p.targetTier === "service" || p.targetTier === "gateway") target = backendComp?.id || components[0]?.id;
    if (p.targetTier === "external") target = backendComp?.id || components[0]?.id;
    setTargetComponentId(target);
    runSimulation(p.id, target);
  };

  // Compiler Checks
  const errorFindings = compilerFindings.filter((f) => f.severity === "error");
  const warningFindings = compilerFindings.filter((f) => f.severity === "warning");
  const passedFindings = compilerFindings.filter((f) => f.severity === "pass");
  const hasIssues = errorFindings.length > 0 || warningFindings.length > 0;

  // Threats
  const threats = Array.isArray(canonicalModel.threats) ? canonicalModel.threats : [];

  return (
    <div
      className="analyze-workspace"
      style={{
        display: "grid",
        gridTemplateColumns: "200px minmax(0, 1fr)",
        height: "100%",
        minHeight: 0,
        background: "#080a0f"
      }}
    >
      {/* ─── Left Navigator ────────────────────────────────────────────────── */}
      <nav
        style={{
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 22, 0.7)",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", paddingLeft: 8, marginBottom: 4 }}>
          Analysis Tools
        </span>

        {[
          { id: "checks", label: "Compiler Checks", count: errorFindings.length + warningFindings.length },
          { id: "threats", label: "STRIDE Threats", count: threats.length },
          { id: "impact", label: "Change Impact", count: null }
        ].map((item) => {
          const isActive = activeSubView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSubView(item.id);
                if (item.id === "impact" && !simulationResult) {
                  runSimulation();
                }
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#38bdf8" : "#94a3b8",
                background: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.15s ease"
              }}
            >
              <span>{item.label}</span>
              {item.count !== null && item.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 6,
                    background: item.id === "checks" && errorFindings.length > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: item.id === "checks" && errorFindings.length > 0 ? "#f87171" : "#cbd5e1"
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── Center Body ───────────────────────────────────────────────────── */}
      <div style={{ overflowY: "auto", padding: "24px 32px" }}>
        {/* VIEW 1: COMPILER CHECKS */}
        {activeSubView === "checks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                  Design Consistency Checks
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                  Deterministic compiler diagnostics checking graph integrity, API routes, data models, and access control.
                </p>
              </div>

              {/* Health calculation formula */}
              <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
                <span>Health score formula: </span>
                <code style={{ color: "#38bdf8" }}>{passedFindings.length} / {compilerFindings.length} ({Math.round((passedFindings.length / Math.max(1, compilerFindings.length)) * 100)}%)</code>
              </div>
            </div>

            {/* Zero issues compact line */}
            {!hasIssues ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 6,
                  background: "rgba(74, 222, 128, 0.08)",
                  border: "1px solid rgba(74, 222, 128, 0.25)",
                  color: "#4ade80",
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} />
                <span>All {compilerFindings.length} checks passing — 0 issues detected across architecture, data, and security.</span>
              </div>
            ) : (
              /* Diagnostic Table */
              <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.08)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "#64748b" }}>
                      <th style={{ padding: "10px 12px", width: 90 }}>SEVERITY</th>
                      <th style={{ padding: "10px 12px" }}>RULE & EXPLANATION</th>
                      <th style={{ padding: "10px 12px", width: 140 }}>AFFECTED</th>
                      <th style={{ padding: "10px 12px" }}>SUGGESTED FIX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...errorFindings, ...warningFindings].map((finding) => (
                      <tr key={finding.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: finding.severity === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(251, 191, 36, 0.15)",
                              color: finding.severity === "error" ? "#f87171" : "#fbbf24"
                            }}
                          >
                            {finding.severity.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <strong style={{ color: "#f3f5fa", display: "block" }}>{finding.title}</strong>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{finding.explanation}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {(finding.affectedArtifacts || []).map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => onSelectArtifact({ id, label: id, type: "component" })}
                              style={{
                                fontSize: 11,
                                fontFamily: "monospace",
                                padding: "2px 5px",
                                borderRadius: 3,
                                background: "rgba(56, 189, 248, 0.1)",
                                color: "#38bdf8",
                                border: "none",
                                cursor: "pointer",
                                marginRight: 4
                              }}
                            >
                              {id}
                            </button>
                          ))}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1", fontSize: 12 }}>
                          {finding.remediation || "Review specification."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: STRIDE THREATS */}
        {activeSubView === "threats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                STRIDE Threat Model & Mitigations
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                Structured analysis across Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
              </p>
            </div>

            <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.08)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "#64748b" }}>
                    <th style={{ padding: "10px 12px", width: 80 }}>STRIDE</th>
                    <th style={{ padding: "10px 12px", width: 90 }}>SEVERITY</th>
                    <th style={{ padding: "10px 12px" }}>THREAT SCENARIO</th>
                    <th style={{ padding: "10px 12px" }}>MITIGATION & VERIFICATION</th>
                  </tr>
                </thead>
                <tbody>
                  {threats.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#818cf8", fontWeight: 700 }}>
                        {t.strideCategory || t.category?.charAt(0) || "T"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: t.severity === "critical" || t.severity === "high" ? "rgba(239, 68, 68, 0.15)" : "rgba(251, 191, 36, 0.15)",
                            color: t.severity === "critical" || t.severity === "high" ? "#f87171" : "#fbbf24"
                          }}
                        >
                          {(t.severity || "medium").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <strong style={{ color: "#f3f5fa", display: "block" }}>{t.title}</strong>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{t.scenario}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#cbd5e1" }}>
                        <div style={{ marginBottom: 4 }}>
                          <strong style={{ color: "#4ade80" }}>Mitigation: </strong>
                          <span>{t.mitigation}</span>
                        </div>
                        {t.verificationApproach && (
                          <div style={{ color: "#64748b", fontSize: 11.5 }}>
                            <strong>Verification: </strong>
                            <span>{t.verificationApproach}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: CHANGE IMPACT SIMULATOR (PRESETS FIRST!) */}
        {activeSubView === "impact" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f5fa" }}>
                Architectural What-If Simulator & Blast Radius
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                Evaluate downstream impact, blast radius, affected endpoints, and semantic diff before committing changes.
              </p>
            </div>

            {/* Presets Row (First and prominent!) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Preset Architectural Modifications
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {presets.map((p) => {
                  const isSelected = selectedPreset === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleApplyPreset(p)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 6,
                        background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <h4 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: isSelected ? "#38bdf8" : "#f3f5fa" }}>
                        {p.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                        {p.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulation Results Grid: Affected Components & Diff */}
            {simulationResult && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
                  gap: 16,
                  background: "rgba(0, 0, 0, 0.25)",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                {/* Left: Blast Radius & Impacted Components */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
                      Blast Radius & Affected Nodes
                    </h3>
                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 700 }}>
                      {simulationResult.blastRadiusCount || (simulationResult.affectedArtifacts || []).length} AFFECTED
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(simulationResult.affectedArtifacts || []).map((art) => (
                      <div
                        key={art.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 4,
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12
                        }}
                      >
                        <span style={{ color: "#f3f5fa", fontWeight: 600 }}>{art.name || art.label || art.id}</span>
                        <code style={{ fontSize: 10, color: "#64748b" }}>{art.type || "component"}</code>
                      </div>
                    ))}
                  </div>

                  {/* Actions: Apply / Discard */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 10 }}>
                    <button
                      type="button"
                      disabled={hasApplied}
                      onClick={() => {
                        setHasApplied(true);
                        if (onCommitRevision) onCommitRevision(simulationResult);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 5,
                        background: hasApplied ? "rgba(74, 222, 128, 0.2)" : "#38bdf8",
                        border: "none",
                        color: hasApplied ? "#4ade80" : "#080a0f",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: hasApplied ? "default" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      {hasApplied ? <Check size={13} /> : <Play size={13} />}
                      <span>{hasApplied ? "Applied to Model" : "Apply Modification"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulationResult(null)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 5,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#94a3b8",
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>

                {/* Right: Code & Configuration Diff */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f5fa" }}>
                    Configuration & Schema Diff
                  </h3>
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: "rgba(0, 0, 0, 0.4)",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontFamily: "monospace",
                      color: "#cbd5e1",
                      whiteSpace: "pre-wrap",
                      overflowY: "auto",
                      maxHeight: 260,
                      border: "1px solid rgba(255, 255, 255, 0.06)"
                    }}
                  >
{selectedPreset === "migrate_sql" && `// Transform Data Tier to PostgreSQL
- import mongoose from 'mongoose';
- const Schema = mongoose.Schema;
+ import { Sequelize, DataTypes } from 'sequelize';
+ const sequelize = new Sequelize(process.env.DATABASE_URL, {
+   dialect: 'postgres',
+   pool: { max: 20, min: 2, acquire: 30000 }
+ });`}
{selectedPreset === "add_redis" && `// Inject Redis In-Memory Cache Tier
+ import { createClient } from 'redis';
+ const redis = createClient({ url: process.env.REDIS_URL });
+ await redis.connect();
+ // Cache-aside read middleware
+ const cached = await redis.get(cacheKey);
+ if (cached) return res.json(JSON.parse(cached));`}
{selectedPreset === "require_auth" && `// Enforce Authentication Middleware
- router.post('/generate', handleGenerate);
+ router.post('/generate', requireAuth, handleGenerate);`}
{selectedPreset === "add_stripe" && `// External Stripe Payment Webhook
+ import Stripe from 'stripe';
+ const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
+ router.post('/webhook', express.raw({type: 'application/json'}), verifySignature);`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
