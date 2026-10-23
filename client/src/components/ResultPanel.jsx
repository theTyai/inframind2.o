import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Download, Copy, Check, AlertCircle, RefreshCw
} from "lucide-react";

import IdeTopBar from "./ide/IdeTopBar.jsx";
import SystemWorkspace from "./system/SystemWorkspace.jsx";
import SpecWorkspace from "./spec/SpecWorkspace.jsx";
import AnalyzeWorkspace from "./analyze/AnalyzeWorkspace.jsx";
import BuildWorkspace from "./build/BuildWorkspace.jsx";

// IDE Modular Panels
import IdeExplorer from "./ide/IdeExplorer.jsx";
import IdeInspector from "./ide/IdeInspector.jsx";
import IdeProblemsPanel from "./ide/IdeProblemsPanel.jsx";
import IdeCommandPalette from "./ide/IdeCommandPalette.jsx";
import IdeStatusBar from "./ide/IdeStatusBar.jsx";

import { analyzeBlueprint, toOpenApi } from "../lib/blueprint.js";
import { normalizeToCanonicalModel } from "../lib/canonicalModel.js";
import { runCompilerChecks } from "../lib/consistencyEngine.js";
import { useWorkspaceState } from "../lib/useWorkspaceState.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ResultPanel({
  result,
  project,
  onCommitRevision,
  initialWorkspace = "system",
  onNavigateWorkspace,
  onNavigateGlobal,
  isCommandPaletteOpenExternal,
  setIsCommandPaletteOpenExternal,
  onNavigateHome,
  onRefineProject
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

  // Active execution flow selected in System Workspace
  const [activeFlow, setActiveFlow] = useState(null);

  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copiedPath, setCopiedPath] = useState("");

  // Canonical Project Model normalization & compilation
  const canonicalModel = useMemo(() => normalizeToCanonicalModel(result), [result]);
  const compilerFindings = useMemo(() => runCompilerChecks(canonicalModel), [canonicalModel]);
  const checks = useMemo(() => analyzeBlueprint(result), [result]);
  const openApi = useMemo(() => toOpenApi(result), [result]);
  const openApiText = useMemo(() => JSON.stringify(openApi, null, 2), [openApi]);

  // Error count for compiler findings
  const errorCount = compilerFindings.filter((c) => c.severity === "error").length;

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

  // Jump from finding or search to artifact
  const handleSelectArtifactById = useCallback((artifactId, shouldSwitchWorkspace = false) => {
    let found = null;
    const comps = canonicalModel.components || [];
    const apis = canonicalModel.apis || [];
    const entities = canonicalModel.entities || [];
    const reqs = canonicalModel.requirements || [];
    const actors = canonicalModel.actors || [];
    const tests = canonicalModel.tests || [];

    const c = comps.find((n) => n.id === artifactId);
    if (c) found = { id: c.id, label: c.label, type: "component", raw: c };

    if (!found) {
      const a = apis.find((n) => n.id === artifactId);
      if (a) found = { id: a.id, label: `${a.method} ${a.path}`, type: "api", raw: a };
    }
    if (!found) {
      const e = entities.find((n) => n.id === artifactId);
      if (e) found = { id: e.id, label: e.name, type: "entity", raw: e };
    }
    if (!found) {
      const r = reqs.find((n) => n.id === artifactId);
      if (r) found = { id: r.id, label: r.title, type: "requirement", raw: r };
    }
    if (!found) {
      const act = actors.find((n) => n.id === artifactId);
      if (act) found = { id: act.id, label: act.name, type: "actor", raw: act };
    }
    if (!found) {
      const t = tests.find((n) => n.id === artifactId);
      if (t) found = { id: t.id, label: t.title, type: "test", raw: t };
    }

    if (found) {
      setSelectedArtifact(found);
      setActiveFlow(null);
      setIsInspectorOpen(true);
      if (shouldSwitchWorkspace && workspace !== "system") {
        setWorkspace("system");
      }
    }
  }, [canonicalModel, workspace, setSelectedArtifact, setIsInspectorOpen, setWorkspace]);

  async function copyFile(file) {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(""), 1600);
    } catch {
      setExportError("Clipboard access is unavailable in this browser.");
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
      if (project?._id && !String(project._id).startsWith("guest-")) {
        window.location.href = `${API_URL}/api/projects/${project._id}/export`;
        setExporting(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: result?.scaffold || [] })
      });
      if (!response.ok) throw new Error("ZIP export failed. Please try again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(result?.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-mern.zip`;
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

  return (
    <div
      className="ide-workspace-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--ide-bg-canvas, #090c13)",
        overflow: "hidden"
      }}
    >
      {/* ─── 1. Single Top Bar (Max 2 bars total above content) ────────────────── */}
      <IdeTopBar
        projectName={result?.projectName || project?.name || "System Architecture"}
        activeWorkspace={workspace}
        onSelectWorkspace={setWorkspace}
        versionNumber={project?.versionCounter || 1}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onExportScaffold={downloadScaffold}
        onExportOpenApi={() =>
          downloadText(
            `${(result?.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-openapi.json`,
            openApiText
          )
        }
        onNavigateHome={onNavigateHome || onNavigateGlobal}
        onRefineProject={onRefineProject}
        problemsCount={errorCount}
      />

      {/* ─── 2. Main Content Canvas Area ────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {isExplorerOpen && (
          <IdeExplorer
            width={explorerWidth}
            canonicalModel={canonicalModel}
            selectedArtifactId={selectedArtifact?.id}
            activeWorkspace={workspace}
            scaffoldFiles={result?.scaffold || []}
            selectedFilePath={copiedPath}
            onSelectArtifact={(item) => {
              setSelectedArtifact(item);
              setActiveFlow(null);
              setIsInspectorOpen(true);
            }}
            onSelectFile={(file) => {
              setWorkspace("build");
              copyFile(file);
            }}
          />
        )}

        {/* Center Workspace Body */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
          <div
            className="ide-canvas-content ws-canvas-enter"
            key={workspace}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: workspace === "system" ? "hidden" : "auto",
              padding: 0,
              position: "relative"
            }}
          >
            {/* WORKSPACE 1: SYSTEM (Hub & Spoke Diagram + ER Data Lens) */}
            {(workspace === "system" || workspace === "overview" || workspace === "architecture") && (
              <SystemWorkspace
                canonicalModel={canonicalModel}
                compilerFindings={compilerFindings}
                selectedArtifact={selectedArtifact}
                setSelectedArtifact={setSelectedArtifact}
                setIsInspectorOpen={setIsInspectorOpen}
                onSelectFlow={setActiveFlow}
              />
            )}

            {/* WORKSPACE 2: SPEC (Requirements, Decisions & OpenAPI Reference) */}
            {workspace === "spec" && (
              <SpecWorkspace
                canonicalModel={canonicalModel}
                onSelectArtifact={(item) => {
                  setSelectedArtifact(item);
                  setActiveFlow(null);
                  setIsInspectorOpen(true);
                }}
              />
            )}

            {/* WORKSPACE 3: ANALYZE (Compiler Checks, Threat Model, Change Impact) */}
            {(workspace === "analyze" || workspace === "impact" || workspace === "validate") && (
              <AnalyzeWorkspace
                canonicalModel={canonicalModel}
                compilerFindings={compilerFindings}
                onSelectArtifact={(item) => {
                  setSelectedArtifact(item);
                  setActiveFlow(null);
                  setIsInspectorOpen(true);
                }}
                onCommitRevision={onCommitRevision}
              />
            )}

            {/* WORKSPACE 4: BUILD (Files, Code Viewer, Live Mock Server & OpenAPI) */}
            {workspace === "build" && (
              <BuildWorkspace
                canonicalModel={canonicalModel}
                scaffold={result?.scaffold || []}
                openApiSpec={openApi}
                onDownloadZip={downloadScaffold}
                versionCounter={project?.versionCounter || 1}
              />
            )}
          </div>

          {/* Bottom Dock: Problems Panel */}
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

        {/* Right Inspector Sidebar */}
        {isInspectorOpen && (
          <IdeInspector
            width={inspectorWidth}
            selectedArtifact={selectedArtifact}
            activeFlow={activeFlow}
            canonicalModel={canonicalModel}
            compilerFindings={compilerFindings}
            onSelectArtifact={(item) => {
              setSelectedArtifact(item);
              setActiveFlow(null);
            }}
            onSimulateImpact={(artifact) => {
              setSelectedArtifact(artifact);
              setWorkspace("analyze");
            }}
            onNavigateView={(viewType) => {
              if (viewType === "mock") {
                setWorkspace("build");
              }
            }}
            onClose={() => {
              setSelectedArtifact(null);
              setActiveFlow(null);
              setIsInspectorOpen(false);
            }}
          />
        )}
      </div>

      {/* ─── 3. Bottom Status Bar ───────────────────────────────────────────── */}
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

      {/* ─── 4. Command Palette Modal (⌘K / Ctrl+K) ─────────────────────────── */}
      <IdeCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        canonicalModel={canonicalModel}
        onSelectArtifact={(item) => {
          setSelectedArtifact(item);
          setActiveFlow(null);
          setIsInspectorOpen(true);
        }}
        onSelectWorkspace={(ws) => setWorkspace(ws)}
        onExportScaffold={downloadScaffold}
        onExportOpenApi={() =>
          downloadText(
            `${(result?.projectName || "inframind").replace(/[^a-z0-9-_]/gi, "-")}-openapi.json`,
            openApiText
          )
        }
        onNavigateGlobal={onNavigateGlobal}
      />
    </div>
  );
}
