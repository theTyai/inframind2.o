import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Boxes, Database, Workflow, Code2, Download, Copy, Check, AlertCircle,
  ShieldCheck, FileJson, CheckCircle2, AlertTriangle, Users, ListChecks,
  LockKeyhole, Search, Terminal, Filter, RefreshCw, Zap, Activity, Play,
  History, FileCode, Layers, GitBranch, Sparkles, CheckSquare, Eye,
  ChevronRight, ArrowRight, PanelLeftClose, PanelRightClose, Maximize2
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

// IDE Modular Panels
import IdeActivityBar from "./ide/IdeActivityBar.jsx";
import IdeExplorer from "./ide/IdeExplorer.jsx";
import IdeInspector from "./ide/IdeInspector.jsx";
import IdeProblemsPanel from "./ide/IdeProblemsPanel.jsx";
import IdeCommandPalette from "./ide/IdeCommandPalette.jsx";
import IdeStatusBar from "./ide/IdeStatusBar.jsx";
import LiveMockServerView from "./ide/LiveMockServerView.jsx";

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
import { useWorkspaceState } from "../lib/useWorkspaceState.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ResultPanel({
  result,
  project,
  onCommitRevision,
  initialWorkspace = "overview",
  onNavigateWorkspace,
  onNavigateGlobal,
  isCommandPaletteOpenExternal,
  setIsCommandPaletteOpenExternal
}) {
  const {
    isMac,
    modKey,
    workspace,
    setWorkspace,
    isExplorerOpen,
    setIsExplorerOpen,
    toggleExplorer,
    isInspectorOpen,
    setIsInspectorOpen,
    toggleInspector,
    isProblemsOpen,
    setIsProblemsOpen,
    toggleProblems,
    isCommandPaletteOpen: internalCommandPaletteOpen,
    setIsCommandPaletteOpen: setInternalCommandPaletteOpen,
    explorerWidth,
    setExplorerWidth,
    inspectorWidth,
    setInspectorWidth,
    problemsHeight,
    setProblemsHeight,
    selectedArtifact,
    setSelectedArtifact
  } = useWorkspaceState({ initialWorkspace, canonicalModel: null });

  const isCommandPaletteOpen = isCommandPaletteOpenExternal ?? internalCommandPaletteOpen;
  const setIsCommandPaletteOpen = setIsCommandPaletteOpenExternal ?? setInternalCommandPaletteOpen;

  // Subview states for each workspace
  const [overviewSubView, setOverviewSubView] = useState("all");
  const [archSubView, setArchSubView] = useState("dependencies");
  const [validateSubView, setValidateSubView] = useState("checks");
  const [buildSubView, setBuildSubView] = useState("scaffold");

  const [selectedImpactTarget, setSelectedImpactTarget] = useState(null);

  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copiedPath, setCopiedPath] = useState("");
  const [copiedSchemaTable, setCopiedSchemaTable] = useState("");
  const [copiedCurlPath, setCopiedCurlPath] = useState("");

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
  const errorCount = compilerFindings.filter(c => c.severity === "error").length;

  // Synchronize workspace changes with parent if callback provided
  useEffect(() => {
    if (onNavigateWorkspace) onNavigateWorkspace(workspace);
  }, [workspace, onNavigateWorkspace]);

  // Auto-expand Problems drawer ONLY when new errors appear after a user action (stay collapsed on load)
  const prevErrorCountRef = useRef(errorCount);
  useEffect(() => {
    if (errorCount > 0 && errorCount > prevErrorCountRef.current) {
      setIsProblemsOpen(true);
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount, setIsProblemsOpen]);

  // Initialize selected artifact on first load
  useEffect(() => {
    if (!selectedArtifact) {
      if (canonicalModel.components?.length > 0) {
        const c = canonicalModel.components[0];
        setSelectedArtifact({ id: c.id, label: c.label, type: "component", raw: c });
      } else if (canonicalModel.requirements?.length > 0) {
        const r = canonicalModel.requirements[0];
        setSelectedArtifact({ id: r.id, label: r.title, type: "requirement", raw: r });
      }
    }
  }, [canonicalModel, selectedArtifact, setSelectedArtifact]);

  // Jump from finding or search to artifact
  const handleSelectArtifactById = useCallback((artifactId) => {
    // Look up in components, apis, entities, requirements, actors, tests
    let found = null;
    const comps = canonicalModel.components || [];
    const apis = canonicalModel.apis || [];
    const entities = canonicalModel.entities || [];
    const reqs = canonicalModel.requirements || [];
    const actors = canonicalModel.actors || [];
    const tests = canonicalModel.tests || [];

    const c = comps.find(n => n.id === artifactId);
    if (c) found = { id: c.id, label: c.label, type: "component", raw: c };

    if (!found) {
      const a = apis.find(n => n.id === artifactId);
      if (a) found = { id: a.id, label: `${a.method} ${a.path}`, type: "api", raw: a };
    }
    if (!found) {
      const e = entities.find(n => n.id === artifactId);
      if (e) found = { id: e.id, label: e.name, type: "entity", raw: e };
    }
    if (!found) {
      const r = reqs.find(n => n.id === artifactId);
      if (r) found = { id: r.id, label: r.title, type: "requirement", raw: r };
    }
    if (!found) {
      const act = actors.find(n => n.id === artifactId);
      if (act) found = { id: act.id, label: act.name, type: "actor", raw: act };
    }
    if (!found) {
      const t = tests.find(n => n.id === artifactId);
      if (t) found = { id: t.id, label: t.title, type: "test", raw: t };
    }

    if (found) {
      setSelectedArtifact(found);
      setIsInspectorOpen(true);
      // If currently on Overview or Validate, switch to Architecture Graph to see it
      if (workspace !== "architecture") {
        setWorkspace("architecture");
        setArchSubView("dependencies");
      }
    }
  }, [canonicalModel, workspace]);

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
    const curl = `curl -X ${api.method} "${API_URL}/api/mock/${project?._id || project?.id || "demo"}${api.path}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <TOKEN>"` +
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
      // If we have a stored project ID, use the server-side streamed export endpoint
      if (project?._id && !String(project._id).startsWith("guest-")) {
        window.location.href = `${API_URL}/api/projects/${project._id}/export`;
        setExporting(false);
        return;
      }

      // Guest / local fallback
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
    <div className="ide-workspace-shell" style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      background: "var(--ide-bg-canvas)",
      overflow: "hidden"
    }}>
      {/* ─── Main 3-Pane IDE Viewport (Activity Bar + Explorer + Canvas + Inspector) ─── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {/* 1. Activity Bar (Far Left Strip) */}
        <IdeActivityBar
          activeWorkspace={workspace}
          onSelectWorkspace={setWorkspace}
          problemsCount={errorCount}
          isProblemsOpen={isProblemsOpen}
          onToggleProblems={() => setIsProblemsOpen(!isProblemsOpen)}
          isExplorerOpen={isExplorerOpen}
          onToggleExplorer={() => setIsExplorerOpen(!isExplorerOpen)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* 2. Collapsible Artifact Explorer Tree */}
        {isExplorerOpen && (
          <IdeExplorer
            width={explorerWidth}
            canonicalModel={canonicalModel}
            selectedArtifactId={selectedArtifact?.id}
            activeWorkspace={workspace}
            scaffoldFiles={result.scaffold || []}
            selectedFilePath={copiedPath}
            onSelectArtifact={(item) => {
              setSelectedArtifact(item);
              setIsInspectorOpen(true);
            }}
            onSelectFile={(file) => {
              setBuildSubView("scaffold");
              copyFile(file);
            }}
          />
        )}

        {/* 3. Center Canvas & Contextual Workspace */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
          {/* Sub-view context bar inside Canvas */}
          <div style={{
            padding: "6px 14px",
            background: "#08090d",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0
          }}>
            <span style={{ fontSize: 10, color: "#737e92", fontWeight: 700, marginRight: 4 }}>CANVAS:</span>
            {workspace === "overview" && [
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

            {workspace === "architecture" && [
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
                <item.icon size={11} />
                {item.label}
              </button>
            ))}

            {workspace === "impact" && (
              <span className="sub-nav-pill active">
                <Activity size={11} /> 3-Pane Ripple & Patch Simulator
              </span>
            )}

            {workspace === "validate" && [
              { id: "checks", label: "Compiler Invariant Checks", icon: ShieldCheck },
              { id: "threats", label: "STRIDE Threat Model", icon: LockKeyhole },
              { id: "workflows", label: "Workflow State Simulator", icon: ListChecks },
              { id: "api_flows", label: "Visual API Test Flows", icon: Play }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${validateSubView === item.id ? "active" : ""}`}
                onClick={() => setValidateSubView(item.id)}
              >
                <item.icon size={11} />
                {item.label}
              </button>
            ))}

            {workspace === "build" && [
              { id: "scaffold", label: "Starter Scaffold Code", icon: Code2 },
              { id: "mock", label: "Live Mock API Runner", icon: Play },
              { id: "openapi", label: "OpenAPI 3.1 Spec", icon: FileJson },
              { id: "reality", label: "Repo Reality Check", icon: FileCode },
              { id: "history", label: "Version History & Diffs", icon: History }
            ].map(item => (
              <button
                key={item.id}
                className={`sub-nav-pill ${buildSubView === item.id ? "active" : ""}`}
                onClick={() => setBuildSubView(item.id)}
              >
                <item.icon size={11} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Canvas View Content Body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14 }}>
            {/* WORKSPACE 1: OVERVIEW */}
            {workspace === "overview" && (
              <div className="data-panel overview-panel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {(overviewSubView === "all" || overviewSubView === "summary") && (
                  <ProjectHealthSummary
                    canonicalModel={canonicalModel}
                    compilerFindings={compilerFindings}
                    onNavigateTab={(targetSec) => {
                      if (targetSec === "architecture") {
                        setWorkspace("architecture");
                        setArchSubView("dependencies");
                      } else if (targetSec === "database" || targetSec === "apis") {
                        setWorkspace("architecture");
                        setArchSubView("data_apis");
                      } else if (targetSec === "threats" || targetSec === "validate" || targetSec === "checks") {
                        setWorkspace("validate");
                        setValidateSubView("checks");
                      } else if (targetSec === "scaffold" || targetSec === "build") {
                        setWorkspace("build");
                        setBuildSubView("scaffold");
                      }
                    }}
                  />
                )}
                {(overviewSubView === "all" || overviewSubView === "brief") && (
                  <ProjectBrief
                    problem={overview.problem}
                    summary={overview.summary || result.summary}
                    targetUsers={overview.targetUsers || []}
                  />
                )}
                {(overviewSubView === "all" || overviewSubView === "requirements") && (
                  <RequirementList
                    coreFeatures={overview.coreFeatures || []}
                    requirements={canonicalModel.requirements || []}
                  />
                )}
                {(overviewSubView === "all" || overviewSubView === "decisions") && (
                  <ArchitectureDecisionCard decisions={overview.decisions} />
                )}
                {(overviewSubView === "all" || overviewSubView === "assumptions") && (
                  <AssumptionList assumptions={overview.assumptions} outOfScope={overview.outOfScope} />
                )}
                {(overviewSubView === "all" || overviewSubView === "roadmap") && (
                  <RoadmapTimeline phases={overview.implementationPhases} />
                )}
              </div>
            )}

            {/* WORKSPACE 2: ARCHITECTURE */}
            {workspace === "architecture" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
                {archSubView === "dependencies" && (
                  <CausalGraph
                    canonicalModel={canonicalModel}
                    selectedNodeId={selectedArtifact?.id}
                    onSelectNode={(node) => {
                      if (node) {
                        setSelectedArtifact({ id: node.id, label: node.label, type: node.type, raw: node.data || node });
                        setIsInspectorOpen(true);
                      }
                    }}
                    onSelectForImpact={(node) => {
                      setSelectedImpactTarget(node);
                      setWorkspace("impact");
                    }}
                  />
                )}
                {archSubView === "map" && (
                  <ArchitectureDiagram architecture={result.architecture} />
                )}
                {archSubView === "data_apis" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Database Collections */}
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
                      </div>
                    </div>

                    {/* REST API Contracts */}
                    <div className="data-panel">
                      <div className="panel-intro">
                        <div>
                          <h3>RESTful API Contracts</h3>
                          <p>Inspect request schemas, status codes, and test live in Mock API server.</p>
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
                                title="Copy mock cURL command"
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
                      </div>
                    </div>
                  </div>
                )}
                {archSubView === "inventory" && (
                  <div className="data-panel">
                    <div className="panel-intro">
                      <div>
                        <h3>Component Ledger & Inventory</h3>
                        <p>All architectural services, gateways, data collections, and verification boundaries.</p>
                      </div>
                      <span className="subtle-chip">{canonicalModel.components?.length || 0} COMPONENTS</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#737e92" }}>
                            <th style={{ padding: "8px 12px" }}>COMPONENT</th>
                            <th style={{ padding: "8px 12px" }}>TIER</th>
                            <th style={{ padding: "8px 12px" }}>ID</th>
                            <th style={{ padding: "8px 12px" }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(canonicalModel.components || []).map(comp => (
                            <tr key={comp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "8px 12px", color: "#f3f5fa", fontWeight: 600 }}>{comp.label}</td>
                              <td style={{ padding: "8px 12px" }}><span className="subtle-chip">{comp.tier || "service"}</span></td>
                              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#737e92" }}>{comp.id}</td>
                              <td style={{ padding: "8px 12px" }}>
                                <button
                                  className="secondary-button"
                                  style={{ padding: "3px 8px", fontSize: 11 }}
                                  onClick={() => handleSelectArtifactById(comp.id)}
                                >
                                  Inspect
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

            {/* WORKSPACE 3: CHANGE IMPACT */}
            {workspace === "impact" && (
              <div className="data-panel">
                <ChangeImpactWorkspace
                  canonicalModel={canonicalModel}
                  initialTargetNode={selectedImpactTarget || selectedArtifact}
                  onCommitRevision={onCommitRevision}
                />
              </div>
            )}

            {/* WORKSPACE 4: VALIDATE */}
            {workspace === "validate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {validateSubView === "checks" && (
                  <div className="data-panel">
                    <CompilerFindingsView canonicalModel={canonicalModel} />
                  </div>
                )}
                {validateSubView === "threats" && (
                  <div className="data-panel">
                    <ThreatModelView canonicalModel={canonicalModel} />
                  </div>
                )}
                {validateSubView === "workflows" && (
                  <div className="data-panel">
                    <WorkflowSimulatorView canonicalModel={canonicalModel} />
                  </div>
                )}
                {validateSubView === "api_flows" && (
                  <div className="data-panel">
                    <ApiFlowEditorView canonicalModel={canonicalModel} />
                  </div>
                )}
              </div>
            )}

            {/* WORKSPACE 5: BUILD & HISTORY */}
            {workspace === "build" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                    </div>
                  </div>
                )}

                {buildSubView === "mock" && (
                  <div className="data-panel">
                    <div className="panel-intro">
                      <div>
                        <h3>Live Mock API Server</h3>
                        <p>Simulate real HTTP requests against this blueprint's declared OpenAPI endpoints.</p>
                      </div>
                      <span className="subtle-chip" style={{ color: "#53d7f4", background: "rgba(83,215,244,0.15)" }}>
                        ● LIVE MOCK ACTIVE
                      </span>
                    </div>
                    <LiveMockServerView projectId={project?._id || project?.id} blueprint={result} />
                  </div>
                )}

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
                    <pre className="openapi-preview">{openApiText}</pre>
                  </div>
                )}

                {buildSubView === "reality" && (
                  <div className="data-panel">
                    <RepoRealityCheckView canonicalModel={canonicalModel} scaffoldFiles={result.scaffold || []} />
                  </div>
                )}

                {buildSubView === "history" && (
                  <div className="data-panel">
                    <SemanticDiffView project={project} currentCanonicalModel={canonicalModel} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Bottom Dock: VS Code-Style Problems & Mock Drawer */}
          {isProblemsOpen && (
            <IdeProblemsPanel
              height={problemsHeight}
              compilerFindings={compilerFindings}
              threats={canonicalModel.threats || []}
              projectId={project?._id || project?.id}
              blueprint={result}
              onSelectArtifactById={handleSelectArtifactById}
              onClose={() => setIsProblemsOpen(false)}
            />
          )}
        </div>

        {/* 5. Right Inspector Sidebar (Selected Node Deep Dive) */}
        {isInspectorOpen && (
          <IdeInspector
            width={inspectorWidth}
            selectedArtifact={selectedArtifact}
            canonicalModel={canonicalModel}
            compilerFindings={compilerFindings}
            onSelectArtifact={(item) => setSelectedArtifact(item)}
            onSimulateImpact={(artifact) => {
              setSelectedImpactTarget(artifact);
              setWorkspace("impact");
            }}
            onNavigateView={(viewType, artifact) => {
              if (viewType === "mock") {
                setWorkspace("build");
                setBuildSubView("mock");
              }
            }}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>

      {/* ─── Bottom Status Bar ─────────────────────────────────────────────── */}
      <IdeStatusBar
        versionNumber={project?.versionCounter || 1}
        compilerFindings={compilerFindings}
        selectedArtifact={selectedArtifact}
        projectId={project?._id || project?.id}
        nodeCount={canonicalModel.graph?.nodes?.length || 0}
        edgeCount={canonicalModel.graph?.edges?.length || 0}
        onToggleProblems={() => setIsProblemsOpen(!isProblemsOpen)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* ─── Command Palette Modal (⌘K) ────────────────────────────────────── */}
      <IdeCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        canonicalModel={canonicalModel}
        onSelectArtifact={(item) => {
          setSelectedArtifact(item);
          setIsInspectorOpen(true);
        }}
        onSelectWorkspace={(ws) => setWorkspace(ws)}
        onExportScaffold={downloadScaffold}
        onExportOpenApi={() => downloadText(`${(result.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-openapi.json`, openApiText)}
        onNavigateGlobal={onNavigateGlobal}
      />
    </div>
  );
}
