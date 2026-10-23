import { useState, useMemo } from "react";
import {
  Zap, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight,
  RefreshCw, Check, X, Layers, Database, Cpu, Plus, Trash2, History,
  Sparkles, FileDiff, GitBranch, AlertCircle, Info, ChevronRight,
  HardDrive, Server, Shield
} from "lucide-react";
import { simulateChangeImpact } from "../lib/impactSimulator.js";

export default function ChangeImpactWorkspace({ canonicalModel, onCommitRevision, initialTargetNode }) {
  const [targetId, setTargetId] = useState(initialTargetNode?.id || canonicalModel?.entities?.[0]?.id || "");
  const [changeType, setChangeType] = useState("migrate_sql");
  const [proposalDescription, setProposalDescription] = useState("Migrate primary datastore from MongoDB document collections to PostgreSQL relational tables with SQL DDL and foreign key constraints.");
  const [simulationResult, setSimulationResult] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [selectedRippleArtifact, setSelectedRippleArtifact] = useState(null);

  // Available candidate artifacts for targeted modification
  const candidateArtifacts = useMemo(() => {
    const list = [];
    (canonicalModel?.entities || []).forEach(e => list.push({ id: e.id, label: `Database: ${e.name}`, type: "entity", raw: e }));
    (canonicalModel?.components || []).forEach(c => list.push({ id: c.id, label: `Component: ${c.label}`, type: "component", raw: c }));
    (canonicalModel?.apis || []).forEach(a => list.push({ id: a.id, label: `API: ${a.method} ${a.path}`, type: "api", raw: a }));
    (canonicalModel?.requirements || []).forEach(r => list.push({ id: r.id, label: `Req: ${r.title}`, type: "requirement", raw: r }));
    return list;
  }, [canonicalModel]);

  // Pre-configured realistic architectural what-if scenarios
  const sampleScenarios = [
    {
      title: "Switch to Relational SQL (PostgreSQL)",
      tag: "Datastore Migration",
      tagColor: "#3b82f6",
      desc: "Replace MongoDB document store with PostgreSQL relational tables, foreign key constraints, and SQL DDL schemas.",
      type: "migrate_sql",
      targetType: "entity",
      patch: {
        dbEngine: "PostgreSQL",
        schemaDialect: "SQL DDL",
        orm: "Prisma / Drizzle",
        requiresRelationalSchema: true
      }
    },
    {
      title: "Deploy In-Memory Redis Caching Tier",
      tag: "Performance & Caching",
      tagColor: "#53d7f4",
      desc: "Inject Redis in-memory cache layer for sub-millisecond reads, session storage, and token-bucket rate limits.",
      type: "add_redis",
      targetType: "component",
      patch: {
        cachingLayer: "Redis",
        ttl: 300,
        rateLimit: "100/min",
        cacheStrategy: "read-through"
      }
    },
    {
      title: "Decommission Deprecated Endpoint",
      tag: "API Contract",
      tagColor: "#ff737d",
      desc: "Remove legacy v1 endpoint and trace orphaned caller dependencies and broken workflows.",
      type: "delete",
      targetType: "api",
      patch: {
        status: "deprecated",
        decommissionDate: new Date().toISOString()
      }
    },
    {
      title: "Enforce Strict Tenant Scoping & RBAC",
      tag: "Security Hardening",
      tagColor: "#a78bfa",
      desc: "Inject multi-tenant isolation filters and require tenant ownership on entity queries.",
      type: "modify",
      targetType: "entity",
      patch: {
        tenantScoped: true,
        authRequired: true,
        strictOwnershipEnforced: true
      }
    }
  ];

  function handleSelectScenario(scenario) {
    const candidate = candidateArtifacts.find(c => c.type === scenario.targetType) || candidateArtifacts[0];
    const newTargetId = candidate?.id || targetId;
    setTargetId(newTargetId);
    setChangeType(scenario.type);
    setProposalDescription(scenario.desc);
    runSimulation(newTargetId, scenario.type, scenario.desc, scenario.patch);
  }

  function runSimulation(
    tId = targetId,
    cType = changeType,
    pDesc = proposalDescription,
    customPatch = null
  ) {
    const patch = customPatch || (cType === "migrate_sql" ? {
      dbEngine: "PostgreSQL",
      schemaDialect: "SQL DDL",
      orm: "Prisma / Drizzle",
      requiresRelationalSchema: true
    } : cType === "add_redis" ? {
      cachingLayer: "Redis",
      ttl: 300,
      rateLimit: "100/min"
    } : {
      tenantScoped: true,
      authRequired: true,
      notes: "Modified during architectural impact simulation"
    });

    const proposal = {
      type: cType === "migrate_sql" || cType === "add_redis" ? "modify" : cType,
      targetId: tId,
      description: pDesc,
      patch
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

  // Dynamic Diff Preview Generation based on Change Type
  const diffPreviewText = useMemo(() => {
    const targetName = selectedTargetArtifact?.label || targetId || "Primary Datastore";

    if (changeType === "migrate_sql" || proposalDescription.toLowerCase().includes("sql") || proposalDescription.toLowerCase().includes("postgres")) {
      const entities = canonicalModel?.entities || [];
      const sampleEntity = entities[0] || { name: "users" };
      return `-- Architectural Datastore Migration: MongoDB (NoSQL) -> PostgreSQL (SQL)
-- Target: Relational Schema & Table Definitions

CREATE TABLE ${sampleEntity.name.toLowerCase()} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Downstream Controller & Query Layer Impact:
-- Mongoose: await ${sampleEntity.name}.find({ tenantId })
-- PostgreSQL: SELECT * FROM ${sampleEntity.name.toLowerCase()} WHERE tenant_id = $1;`;
    }

    if (changeType === "add_redis" || proposalDescription.toLowerCase().includes("redis")) {
      return `// Architectural Transformation: Inject Redis Caching Layer
// Target: API Gateway & Service Controllers

+ import { createClient } from 'redis';
+ const redis = createClient({ url: process.env.REDIS_URL });
+ await redis.connect();

+ // Read-Through Cache Middleware (TTL: 300s)
+ router.get('/api/*', async (req, res, next) => {
+   const cacheKey = \`cache:\${req.originalUrl}\`;
+   const cached = await redis.get(cacheKey);
+   if (cached) return res.json(JSON.parse(cached));
+   res.sendResponse = res.json;
+   res.json = (body) => {
+     redis.setEx(cacheKey, 300, JSON.stringify(body));
+     res.sendResponse(body);
+   };
+   next();
+ });`;
    }

    if (changeType === "delete") {
      return `// Architectural Impact: Decommission Artifact
// Target: ${targetId}

- router.delete('${selectedTargetArtifact?.label || targetId}', authMiddleware);
! Warning: 2 frontend components and 1 workflow depend on this route.
! Deprecate in OpenAPI contract and return HTTP 410 Gone.`;
    }

    return `// Target: ${targetId} (${changeType})
+ tenantScoped: true
+ authRequired: true
+ strictOwnershipEnforced: true
~ updatedAt: "${new Date().toISOString().slice(0, 10)}"`;
  }, [changeType, targetId, selectedTargetArtifact, canonicalModel, proposalDescription]);

  return (
    <div className="change-impact-workspace" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ─── Topline Context Header ──────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0e1118 0%, #0a0c10 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "14px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            display: "inline-flex",
            padding: 8,
            background: "rgba(255, 115, 125, 0.15)",
            borderRadius: 8,
            color: "#ff737d",
            border: "1px solid rgba(255, 115, 125, 0.3)"
          }}>
            <Zap size={20} />
          </span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f3f5fa", margin: "0 0 2px" }}>
              Architectural What-If Simulator & Blast Radius Engine
            </h3>
            <span style={{ fontSize: 12, color: "var(--ide-text-secondary)" }}>
              Apply modifications at any position (e.g. switch to SQL DB, deploy Redis caching, alter schemas) and evaluate ripple effects.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="subtle-chip" style={{
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(66,214,164,0.15)",
            color: "#42d6a4",
            border: "1px solid rgba(66,214,164,0.3)"
          }}>
            DETERMINISTIC BLAST ANALYSIS
          </span>
        </div>
      </div>

      {/* ─── 3-Panel Architecture Layout ───────────────────────────────────────── */}
      <div className="impact-three-panel-grid" style={{ display: "grid", gridTemplateColumns: "330px 1fr 340px", gap: 16, alignItems: "start" }}>
        
        {/* ─── Pane 1: Request & Change Context ─────────────────────────────── */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
            <GitBranch size={15} style={{ color: "#8b7cff" }} />
            <strong style={{ fontSize: 13, color: "#f3f5fa" }}>Configure What-If Change</strong>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#737e92", marginBottom: 5 }}>
              TARGET POSITION / ARTIFACT
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
              CHANGE ACTION TYPE
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12 }}
            >
              <option value="migrate_sql">Switch to Relational SQL (PostgreSQL)</option>
              <option value="add_redis">Deploy Redis In-Memory Cache Tier</option>
              <option value="modify">Modify Schema Attributes & Isolation</option>
              <option value="delete">Decommission / Remove Artifact</option>
              <option value="add">Add Architecture Component</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#737e92", marginBottom: 5 }}>
              PROPOSED SPECIFICATION & IMPACT GOAL
            </label>
            <textarea
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              placeholder="Describe proposal changes (e.g. switch MongoDB to PostgreSQL)..."
              rows={3}
              style={{ width: "100%", padding: "7px 10px", background: "#121722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#f3f5fa", fontSize: 12, resize: "vertical" }}
            />
          </div>

          <button
            className="primary-button"
            onClick={() => runSimulation()}
            style={{ width: "100%", justifyContent: "center", padding: "9px 14px", fontSize: 12, fontWeight: 700 }}
          >
            <Zap size={14} /> Calculate Impact Blast Radius
          </button>

          {/* Quick Pre-canned Scenarios */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              REALISTIC ARCHITECTURAL PRESETS
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sampleScenarios.map((sc, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectScenario(sc)}
                  style={{
                    padding: "9px 11px",
                    background: "#121722",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  className="scenario-chip"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <strong style={{ fontSize: 12, color: "#f3f5fa" }}>{sc.title}</strong>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: `${sc.tagColor}22`,
                      color: sc.tagColor
                    }}>
                      {sc.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#737e92", display: "block", lineHeight: 1.35 }}>{sc.desc}</span>
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
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#ff737d" }}>
                      {changeType === "migrate_sql" ? "MIGRATE TO SQL" : changeType === "add_redis" ? "INJECT REDIS" : "MODIFIED"}
                    </span>
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
              <h4 style={{ color: "#f3f5fa", margin: "0 0 6px" }}>Ready for Architectural Simulation</h4>
              <p style={{ fontSize: 12, margin: 0 }}>
                Pick an architectural position or select a preset above (e.g. Switch to SQL DB or Deploy Redis Cache) to calculate live blast radius and downstream ripple effects.
              </p>
            </div>
          )}
        </div>

        {/* ─── Pane 3: Findings, Diff & Approval ────────────────────────────── */}
        <div style={{ background: "#0d1017", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
            <FileDiff size={15} style={{ color: "#42d6a4" }} />
            <strong style={{ fontSize: 13, color: "#f3f5fa" }}>Verification & Generated Diff</strong>
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

              {/* Architectural Semantic Risks */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    ENGINEERING ADVICE
                  </span>
                  <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(139,124,255,0.2)", borderRadius: 3, color: "#c2b9ff" }}>
                    Deterministic check
                  </span>
                </div>
                <div style={{ padding: "8px 10px", background: "#121722", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#a2abbd" }}>
                  {changeType === "migrate_sql" ? (
                    <span>Ensure Mongoose ORM models in controller handlers are refactored to SQL query builders (Prisma or Drizzle) before production migration.</span>
                  ) : changeType === "add_redis" ? (
                    <span>Ensure cache eviction keys are triggered on all POST/PATCH/DELETE mutations to prevent serving stale data to clients.</span>
                  ) : (
                    <span>Verify existing API clients migrate to updated schemas before deploying production constraints.</span>
                  )}
                </div>
              </div>

              {/* Dynamic Structured Diff Preview */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#737e92", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  STRUCTURED CODE / DDL DIFF PREVIEW
                </span>
                <pre style={{
                  margin: 0,
                  padding: 10,
                  background: "#08090d",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "#9be8f9",
                  maxHeight: 140,
                  overflowY: "auto",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.45
                }}>
                  {diffPreviewText}
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
              Calculate impact to inspect generated code/schema diffs and validation findings.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
