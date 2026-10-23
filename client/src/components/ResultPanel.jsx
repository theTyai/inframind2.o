import { useState, useMemo } from "react";
import {
  Boxes, Database, Workflow, Code2, Download, Copy, Check, AlertCircle,
  ShieldCheck, FileJson, CheckCircle2, AlertTriangle, Users, ListChecks,
  LockKeyhole, Search, Terminal, Filter, RefreshCw, Zap, Activity, Play,
  History, FileCode, Layers, GitBranch, Sparkles, CheckSquare, Eye,
  ChevronRight, ArrowRight
} from "lucide-react";
import ArchitectureDiagram from "./ArchitectureDiagram.jsx";
import CausalGraph from "./CausalGraph.jsx";
import ChangeImpactWorkspace from "./ChangeImpactWorkspace.jsx";
import WorkflowSimulatorView from "./WorkflowSimulatorView.jsx";
import ThreatModelView from "./ThreatModelView.jsx";
import ApiFlowEditorView from "./ApiFlowEditorView.jsx";
import SemanticDiffView from "./SemanticDiffView.jsx";
import RepoRealityCheckView from "./RepoRealityCheckView.jsx";
import CompilerFindingsView from "./CompilerFindingsView.jsx";

// Structured Overview Components
import ProjectBrief from "./overview/ProjectBrief.jsx";
import RequirementList from "./overview/RequirementList.jsx";
import ArchitectureDecisionCard from "./overview/ArchitectureDecisionCard.jsx";
import AssumptionList from "./overview/AssumptionList.jsx";
import RoadmapTimeline from "./overview/RoadmapTimeline.jsx";
import ProjectHealthSummary from "./overview/ProjectHealthSummary.jsx";

import { analyzeBlueprint, toOpenApi } from "../lib/blueprint.js";
import { normalizeToCanonicalModel } from "../lib/canonicalModel.js";
import { runCompilerChecks } from "../lib/consistencyEngine.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ResultPanel({
  result,
  project,
  onCommitRevision,
  initialWorkspace = "overview",
  onNavigateWorkspace
}) {
  // ─── The 5 Primary Workspaces ───────────────────────────────────────────────
  // 1. overview | 2. architecture | 3. impact | 4. validate | 5. build
  const [workspace, setWorkspace] = useState(initialWorkspace);

  // Subview states for each workspace
  const [overviewSubView, setOverviewSubView] = useState("all"); // "all" | "summary" | "brief" | "requirements" | "decisions" | "assumptions" | "roadmap"
  const [archSubView, setArchSubView] = useState("dependencies"); // "dependencies" | "map" | "data_apis" | "inventory"
  const [validateSubView, setValidateSubView] = useState("checks"); // "checks" | "threats" | "workflows" | "api_flows"
  const [buildSubView, setBuildSubView] = useState("scaffold"); // "scaffold" | "openapi" | "reality" | "history"

  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copiedPath, setCopiedPath] = useState("");
  const [copiedSchemaTable, setCopiedSchemaTable] = useState("");
  const [copiedCurlPath, setCopiedCurlPath] = useState("");
  const [selectedImpactTarget, setSelectedImpactTarget] = useState(null);

  // REST API Filtering
  const [apiMethodFilter, setApiMethodFilter] = useState("ALL");
  const [apiSearchQuery, setApiSearchQuery] = useState("");

  // Canonical Project Model normalization & compilation
  const canonicalModel = useMemo(() => normalizeToCanonicalModel(result), [result]);
  const compilerFindings = useMemo(() => runCompilerChecks(canonicalModel), [canonicalModel]);
  const checks = useMemo(() => analyzeBlueprint(result), [result]);
  const openApi = useMemo(() => toOpenApi(result), [result]);
  const openApiText = useMemo(() => JSON.stringify(openApi, null, 2), [openApi]);

  // Pass count for compiler findings
  const passCount = compilerFindings.filter(c => c.severity === "pass").length;

  // The 5 Primary Workspaces metadata
  const primaryWorkspaces = [
    { id: "overview", label: "Overview", icon: Boxes, badge: null },
    { id: "architecture", label: "Architecture", icon: Workflow, badge: canonicalModel.components?.length + canonicalModel.apis?.length },
    { id: "impact", label: "Change Impact", icon: Activity, badge: "Simulate" },
    { id: "validate", label: "Validate", icon: ShieldCheck, badge: `${passCount}/${compilerFindings.length}` },
    { id: "build", label: "Build & History", icon: Code2, badge: result.scaffold?.length ? `${result.scaffold.length} files` : null }
  ];

  async function copyFile(file) {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(""), 1600);
    } catch {
      setExportError("Clipboard access is unavailable in this browser.");
    }
  }

  function generateMongooseSnippet(table) {
    const fields = (table.columns || []).map(col => {
      let typeStr = "String";
      const t = (col.type || "").toLowerCase();
      if (t.includes("number") || t.includes("int") || t.includes("float")) typeStr = "Number";
      else if (t.includes("bool")) typeStr = "Boolean";
      else if (t.includes("date") || t.includes("time")) typeStr = "Date";
      else if (t.includes("array") || t.includes("list")) typeStr = "[String]";
      else if (col.foreignKey || t.includes("objectid") || t.includes("ref")) {
        return `  ${col.name}: { type: mongoose.Schema.Types.ObjectId, ref: '${col.foreignKey || "Model"}', required: ${!col.nullable} }`;
      }
      return `  ${col.name}: { type: ${typeStr}, required: ${!col.nullable} }`;
    }).join(",\n");

    return `import mongoose from 'mongoose';\n\nconst ${table.name}Schema = new mongoose.Schema({\n${fields}\n}, {\n  timestamps: true\n});\n\nexport default mongoose.model('${table.name}', ${table.name}Schema);`;
  }

  async function copyMongooseSchema(table) {
    const code = generateMongooseSnippet(table);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedSchemaTable(table.name);
      setTimeout(() => setCopiedSchemaTable(""), 1600);
    } catch {
      setExportError("Clipboard access unavailable.");
    }
  }

  async function copyCurlCommand(api) {
    const curl = `curl -X ${api.method} "http://localhost:5000${api.path}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <TOKEN>"` +
      (api.requestBody && api.method !== "GET" ? ` \\\n  -d '${api.requestBody.replace(/\n/g, "")}'` : "");
    try {
      await navigator.clipboard.writeText(curl);
      setCopiedCurlPath(api.path);
      setTimeout(() => setCopiedCurlPath(""), 1600);
    } catch {
      setExportError("Clipboard access unavailable.");
    }
  }

  function downloadText(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadScaffold() {
    setExportError("");
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: result.scaffold })
      });
      if (!response.ok) throw new Error("ZIP export failed. Please try again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(result.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-mern.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  }

  // Filtered APIs
  const filteredApis = useMemo(() => {
    let list = result.apis || [];
    if (apiMethodFilter !== "ALL") {
      list = list.filter(a => (a.method || "").toUpperCase() === apiMethodFilter);
    }
    if (apiSearchQuery.trim()) {
      const q = apiSearchQuery.trim().toLowerCase();
      list = list.filter(a =>
        (a.path || "").toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [result.apis, apiMethodFilter, apiSearchQuery]);

  const overview = result.overview || {};

  return (
    <section className="results workspace-unified-layout">
      {/* ─── Level 1 Navigation: Exactly Five Primary Workspaces ───────────── */}
      <div className="primary-workspace-bar">
        <nav className="workspace-segmented-control" aria-label="Primary Workspaces">
          {primaryWorkspaces.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              className={`workspace-tab-btn ${workspace === id ? "active" : ""}`}
              onClick={() => {
                setWorkspace(id);
                if (onNavigateWorkspace) onNavigateWorkspace(id);
              }}
              aria-selected={workspace === id}
            >
              <Icon size={15} />
              <span className="workspace-tab-label">{label}</span>
              {badge !== null && badge !== undefined && (
                <span className="workspace-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Level 2 Contextual Secondary Navigation Sub-bar ───────────────── */}
      <div className="sub-workspace-bar">
        {/* Sub-nav for Overview */}
        {workspace === "overview" && (
          <div className="sub-nav-group">
            <span className="sub-nav-label">VIEWS:</span>
            {[
              { id: "all", label: "Full Specification" },
              { id: "summary", label: "Health Summary" },
              { id: "brief", label: "Product Brief" },
              { id: "requirements", label: "Requirements" },
              { id: "decisions", label: "Decisions (ADRs)" },
              { id: "assumptions", label: "Assumptions & Non-Goals" },
              { id: "roadmap", label: "Roadmap" }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${overviewSubView === item.id ? "active" : ""}`}
                onClick={() => setOverviewSubView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-nav for Architecture */}
        {workspace === "architecture" && (
          <div className="sub-nav-group">
            <span className="sub-nav-label">VIEWS:</span>
            {[
              { id: "dependencies", label: "Causal Dependencies (Graph)", icon: Zap },
              { id: "map", label: "System Map (Mermaid)", icon: Workflow },
              { id: "data_apis", label: "Data Models & REST APIs", icon: Database },
              { id: "inventory", label: "Component Inventory", icon: Boxes }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${archSubView === item.id ? "active" : ""}`}
                onClick={() => setArchSubView(item.id)}
              >
                <item.icon size={12} />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-nav for Change Impact */}
        {workspace === "impact" && (
          <div className="sub-nav-group">
            <span className="sub-nav-label">MODE:</span>
            <span className="sub-nav-pill active">
              <Activity size={12} /> 3-Pane Ripple Simulator
            </span>
          </div>
        )}

        {/* Sub-nav for Validate */}
        {workspace === "validate" && (
          <div className="sub-nav-group">
            <span className="sub-nav-label">CHECKS:</span>
            {[
              { id: "checks", label: "Compiler Checks", icon: ShieldCheck },
              { id: "threats", label: "Threat Model (STRIDE)", icon: LockKeyhole },
              { id: "workflows", label: "Workflows & Simulator", icon: ListChecks },
              { id: "api_flows", label: "API Test Flows", icon: Play }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${validateSubView === item.id ? "active" : ""}`}
                onClick={() => setValidateSubView(item.id)}
              >
                <item.icon size={12} />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-nav for Build & History */}
        {workspace === "build" && (
          <div className="sub-nav-group">
            <span className="sub-nav-label">ARTIFACTS:</span>
            {[
              { id: "scaffold", label: "Code Scaffold", icon: Code2 },
              { id: "openapi", label: "OpenAPI 3.1", icon: FileJson },
              { id: "reality", label: "Repo Reality Check", icon: FileCode },
              { id: "history", label: "Version History & Diffs", icon: History }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${buildSubView === item.id ? "active" : ""}`}
                onClick={() => setBuildSubView(item.id)}
              >
                <item.icon size={12} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          WORKSPACE 1: OVERVIEW
          Structured, semantic components with no text run-ins or broken CSS
          ═════════════════════════════════════════════════════════════════════════ */}
      {workspace === "overview" && (
        <div className="data-panel overview-panel" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Health Summary View */}
          {(overviewSubView === "all" || overviewSubView === "summary") && (
            <ProjectHealthSummary
              canonicalModel={canonicalModel}
              compilerFindings={compilerFindings}
              onNavigateTab={(targetSec) => {
                if (targetSec === "architecture") {
                  setWorkspace("architecture");
                  setArchSubView("dependencies");
                } else if (targetSec === "database") {
                  setWorkspace("architecture");
                  setArchSubView("data_apis");
                } else if (targetSec === "apis") {
                  setWorkspace("architecture");
                  setArchSubView("data_apis");
                } else if (targetSec === "threats" || targetSec === "validate") {
                  setWorkspace("validate");
                  setValidateSubView("threats");
                } else if (targetSec === "scaffold" || targetSec === "build") {
                  setWorkspace("build");
                  setBuildSubView("scaffold");
                } else if (targetSec === "checks") {
                  setWorkspace("validate");
                  setValidateSubView("checks");
                }
              }}
            />
          )}

          {/* Product Brief & Personas */}
          {(overviewSubView === "all" || overviewSubView === "brief") && (
            <ProjectBrief
              problem={overview.problem}
              summary={overview.summary || result.summary}
              targetUsers={overview.targetUsers || []}
            />
          )}

          {/* Requirements & Core Capabilities */}
          {(overviewSubView === "all" || overviewSubView === "requirements") && (
            <RequirementList
              coreFeatures={overview.coreFeatures || []}
              requirements={canonicalModel.requirements || []}
            />
          )}

          {/* Architecture Decisions (ADRs) */}
          {(overviewSubView === "all" || overviewSubView === "decisions") && (
            <ArchitectureDecisionCard decisions={overview.decisions} />
          )}

          {/* Assumptions to Validate & Out of Scope Non-Goals */}
          {(overviewSubView === "all" || overviewSubView === "assumptions") && (
            <AssumptionList assumptions={overview.assumptions} outOfScope={overview.outOfScope} />
          )}

          {/* Implementation Roadmap */}
          {(overviewSubView === "all" || overviewSubView === "roadmap") && (
            <RoadmapTimeline phases={overview.implementationPhases} />
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          WORKSPACE 2: ARCHITECTURE
          System Map, Causal Graph, Data Models & REST APIs, Node Inventory
          ═════════════════════════════════════════════════════════════════════════ */}
      {workspace === "architecture" && (
        <div className="architecture-workspace-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Causal Graph Explorer */}
          {archSubView === "dependencies" && (
            <CausalGraph
              canonicalModel={canonicalModel}
              onSelectForImpact={(node) => {
                setSelectedImpactTarget(node);
                setWorkspace("impact");
              }}
            />
          )}

          {/* Mermaid Topology Diagram */}
          {archSubView === "map" && (
            <ArchitectureDiagram architecture={result.architecture} />
          )}

          {/* Data Models (Mongoose) & REST APIs */}
          {archSubView === "data_apis" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* MongoDB Collections */}
              <div className="data-panel">
                <div className="panel-intro">
                  <div>
                    <h3>MongoDB Collections & Document Models</h3>
                    <p>Mongoose schema definitions with indexes, references, and validation constraints.</p>
                  </div>
                  <span className="subtle-chip">MONGOOSE V8</span>
                </div>

                <div className="schema-grid">
                  {(result.database?.tables || []).map((table, index) => (
                    <article className="schema-card" key={table.name || index}>
                      <div className="schema-card-head">
                        <span className="collection-icon"><Database size={15} /></span>
                        <div>
                          <h3>{table.name}</h3>
                          <span>{(table.columns || []).length} document fields</span>
                        </div>
                        <span className="collection-index">COLL_{String(index + 1).padStart(2, "0")}</span>
                      </div>

                      <div className="schema-fields">
                        {(table.columns || []).map((column, colIndex) => (
                          <div className="column-row" key={column.name || colIndex}>
                            <span className="field-name">{column.name}</span>
                            <span className="field-type">{column.type}</span>
                            {column.primaryKey && <span className="key-mark">_id</span>}
                            {column.foreignKey && <span className="tag">Ref: {column.foreignKey}</span>}
                            {column.nullable && <span className="nullable-mark">optional</span>}
                          </div>
                        ))}
                      </div>

                      <div className="schema-card-footer">
                        <button
                          className="secondary-button"
                          style={{ fontSize: 11, padding: "5px 10px" }}
                          onClick={() => copyMongooseSchema(table)}
                        >
                          {copiedSchemaTable === table.name ? (
                            <><Check size={12} /> Copied Mongoose Model</>
                          ) : (
                            <><Copy size={12} /> Copy Mongoose Schema</>
                          )}
                        </button>
                      </div>
                    </article>
                  ))}
                  {(!result.database?.tables || result.database.tables.length === 0) && (
                    <p style={{ color: "#737e92", padding: 20 }}>No collection schemas defined for this blueprint.</p>
                  )}
                </div>
              </div>

              {/* REST API Explorer */}
              <div className="data-panel">
                <div className="panel-intro">
                  <div>
                    <h3>RESTful API Contracts</h3>
                    <p>Filter by HTTP method, inspect request schemas, status codes, and copy cURL commands.</p>
                  </div>
                  <span className="subtle-chip">OPENAPI 3.1 COMPLIANT</span>
                </div>

                <div className="api-toolbar-row">
                  <div className="method-filter-group">
                    {["ALL", "GET", "POST", "PATCH", "PUT", "DELETE"].map(m => (
                      <button
                        key={m}
                        className={`filter-chip ${apiMethodFilter === m ? "active" : ""}`}
                        onClick={() => setApiMethodFilter(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="api-search-box">
                    <Search size={13} />
                    <input
                      type="text"
                      placeholder="Search path or description…"
                      value={apiSearchQuery}
                      onChange={(e) => setApiSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="api-list">
                  {filteredApis.map((api, index) => (
                    <article className="api-card" key={`${api.method}-${api.path}-${index}`}>
                      <div className="api-header">
                        <span className={`method method-${api.method.toLowerCase()}`}>{api.method}</span>
                        <span className="api-route"><code>{api.path}</code></span>
                        <span className="status-codes">HTTP {(api.statusCodes || [200]).join(", ")}</span>
                        <button
                          className="secondary-button curl-copy-btn"
                          onClick={() => copyCurlCommand(api)}
                          title="Copy cURL command"
                        >
                          {copiedCurlPath === api.path ? <Check size={12} /> : <Terminal size={12} />}
                          {copiedCurlPath === api.path ? "Copied" : "cURL"}
                        </button>
                      </div>
                      <p>{api.description}</p>
                      {(api.requestBody || api.responseBody) && (
                        <details>
                          <summary>View Schemas & Payloads ▾</summary>
                          <div className="payload-grid">
                            {api.requestBody && (
                              <div>
                                <h4>Request Payload</h4>
                                <pre>{api.requestBody}</pre>
                              </div>
                            )}
                            {api.responseBody && (
                              <div>
                                <h4>Expected Response</h4>
                                <pre>{api.responseBody}</pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </article>
                  ))}
                  {filteredApis.length === 0 && (
                    <p style={{ color: "#737e92", padding: 20 }}>No endpoints match your active filter.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Node Inventory Catalog */}
          {archSubView === "inventory" && (
            <div className="data-panel">
              <div className="panel-intro">
                <div>
                  <h3>System Component & Entity Inventory</h3>
                  <p>Comprehensive structured ledger of all services, gateways, data collections, and verification tests.</p>
                </div>
                <span className="subtle-chip">{canonicalModel.components?.length || 0} COMPONENTS</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#737e92" }}>
                      <th style={{ padding: "10px 12px" }}>COMPONENT</th>
                      <th style={{ padding: "10px 12px" }}>TIER / ROLE</th>
                      <th style={{ padding: "10px 12px" }}>TECHNOLOGY</th>
                      <th style={{ padding: "10px 12px" }}>STABLE ID</th>
                      <th style={{ padding: "10px 12px" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(canonicalModel.components || []).map(comp => (
                      <tr key={comp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px 12px", color: "#f3f5fa", fontWeight: 600 }}>{comp.label}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className="subtle-chip" style={{ fontSize: 10 }}>{comp.tier || "service"}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#a2abbd" }}>{comp.technology || "Node.js / Express"}</td>
                        <td style={{ padding: "10px 12px", color: "#737e92", fontFamily: "monospace" }}>{comp.id}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={() => {
                              setSelectedImpactTarget(comp);
                              setWorkspace("impact");
                            }}
                          >
                            <Zap size={12} /> Test Impact
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          WORKSPACE 3: CHANGE IMPACT
          3-Pane Layout: Request context, Impact graph, and Findings/diff/approval
          ═════════════════════════════════════════════════════════════════════════ */}
      {workspace === "impact" && (
        <div className="data-panel">
          <ChangeImpactWorkspace
            canonicalModel={canonicalModel}
            initialTargetNode={selectedImpactTarget}
            onCommitRevision={onCommitRevision}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          WORKSPACE 4: VALIDATE
          Compiler Checks, Threat Model, Workflow Simulator, API Test Flows
          ═════════════════════════════════════════════════════════════════════════ */}
      {workspace === "validate" && (
        <div className="validate-workspace-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Subview: Compiler Checks */}
          {validateSubView === "checks" && (
            <div className="data-panel">
              <CompilerFindingsView canonicalModel={canonicalModel} />
            </div>
          )}

          {/* Subview: Threat Model */}
          {validateSubView === "threats" && (
            <div className="data-panel">
              <ThreatModelView canonicalModel={canonicalModel} />
            </div>
          )}

          {/* Subview: Workflow Simulator */}
          {validateSubView === "workflows" && (
            <div className="data-panel">
              <WorkflowSimulatorView canonicalModel={canonicalModel} />
            </div>
          )}

          {/* Subview: API Test Flows */}
          {validateSubView === "api_flows" && (
            <div className="data-panel">
              <ApiFlowEditorView canonicalModel={canonicalModel} />
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          WORKSPACE 5: BUILD & HISTORY
          Code Scaffold, OpenAPI Export, Repo Reality Check, Version History & Diffs
          ═════════════════════════════════════════════════════════════════════════ */}
      {workspace === "build" && (
        <div className="build-workspace-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Subview: Code Scaffold */}
          {buildSubView === "scaffold" && (
            <div className="data-panel">
              <div className="panel-intro">
                <div>
                  <h3>MERN Starter Scaffold Codebase</h3>
                  <p>Inspect generated files or download a complete runnable ZIP boilerplate.</p>
                </div>
                <button
                  className="primary-button download-button"
                  disabled={exporting || !(result.scaffold || []).length}
                  onClick={downloadScaffold}
                >
                  <Download size={14} />
                  {exporting ? "Preparing ZIP…" : "Download Starter ZIP"}
                </button>
              </div>

              {exportError && (
                <div className="error-banner">
                  <AlertCircle size={15} />
                  <span>{exportError}</span>
                </div>
              )}

              <div className="file-list">
                {(result.scaffold || []).map(file => (
                  <details key={file.path} className="file-card">
                    <summary>
                      <span className="file-path"><Code2 size={14} />{file.path}</span>
                      <span className="file-action">
                        {copiedPath === file.path ? <><Check size={13} /> Copied</> : "View code ▾"}
                      </span>
                    </summary>
                    <pre>{file.content}</pre>
                    <button className="secondary-button copy-button" onClick={() => copyFile(file)}>
                      {copiedPath === file.path ? <Check size={13} /> : <Copy size={13} />}
                      {copiedPath === file.path ? "Copied to Clipboard" : "Copy File"}
                    </button>
                  </details>
                ))}
                {(!result.scaffold || result.scaffold.length === 0) && (
                  <p style={{ color: "#737e92", padding: 20 }}>No scaffold files generated for this blueprint.</p>
                )}
              </div>
            </div>
          )}

          {/* Subview: OpenAPI 3.1 Export */}
          {buildSubView === "openapi" && (
            <div className="data-panel">
              <div className="panel-intro">
                <div>
                  <h3>OpenAPI 3.1 Standard Contract</h3>
                  <p>Export portable JSON schema for Swagger UI, Postman collection import, and SDK generation.</p>
                </div>
                <button
                  className="primary-button download-button"
                  onClick={() => downloadText(`${(result.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-openapi.json`, openApiText)}
                >
                  <Download size={14} /> Download OpenAPI JSON
                </button>
              </div>

              <div className="openapi-summary">
                <span><strong>{Object.keys(openApi.paths || {}).length}</strong> API paths</span>
                <span><strong>{(result.apis || []).length}</strong> Operations</span>
                <span><strong>3.1.0</strong> Spec Version</span>
              </div>

              <pre className="openapi-preview">{openApiText}</pre>
            </div>
          )}

          {/* Subview: Repo Reality Check */}
          {buildSubView === "reality" && (
            <div className="data-panel">
              <RepoRealityCheckView canonicalModel={canonicalModel} scaffoldFiles={result.scaffold || []} />
            </div>
          )}

          {/* Subview: Version History & Semantic Diffs */}
          {buildSubView === "history" && (
            <div className="data-panel">
              <SemanticDiffView project={project} currentCanonicalModel={canonicalModel} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
