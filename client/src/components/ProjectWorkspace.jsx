import { useState, useEffect } from "react";
import ResultPanel from "./ResultPanel.jsx";
import IdeTopBar from "./ide/IdeTopBar.jsx";
import PipelineStreamingModal from "./ide/PipelineStreamingModal.jsx";

export default function ProjectWorkspace({
  project,
  user,
  onBack,
  onNavigateGlobal,
  onSignOut,
  onGenerateNewVersion,
  onCommitRevision,
  onDuplicate,
  onRenameProject,
  onDeleteProject,
  generatingVersion = false,
  versionError = ""
}) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    project.versions?.length ? project.versions.length - 1 : 0
  );
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Active blueprint: either the selected version's blueprint or the project's root blueprint
  const versions = project.versions || [];
  const hasVersions = versions.length > 0;
  const activeVersion = hasVersions ? versions[selectedVersionIndex] : null;
  const activeBlueprint = activeVersion?.blueprint || project.blueprint || {};

  // Accurate Save Status Indicator
  const isCloudSaved = Boolean(project._id && !String(project._id).startsWith("guest-"));
  const updatedAtFormatted = project.updatedAt
    ? new Date(project.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " · " +
      new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })
    : "Just now";

  return (
    <div className="project-workspace-container" style={{ padding: 0, height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ─── 44px Unified IDE Top Bar ────────────────────────────────────────── */}
      <IdeTopBar
        projectName={project.name || project.projectName || activeBlueprint.projectName || "System Blueprint"}
        onRenameProject={(newName) => {
          if (onRenameProject) onRenameProject(project._id || project.id, newName);
        }}
        onBack={onBack}
        versions={versions}
        selectedVersionIndex={selectedVersionIndex}
        onSelectVersion={setSelectedVersionIndex}
        saveStatus={{ isCloud: isCloudSaved, updatedAt: updatedAtFormatted }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenRefine={() => setShowStreamingModal(true)}
        onDuplicate={() => onDuplicate && onDuplicate(project._id || project.id)}
        onDelete={() => {
          if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            if (onDeleteProject) onDeleteProject(project._id || project.id);
          }
        }}
        onNavigateGlobal={onNavigateGlobal}
        user={user}
        onSignOut={onSignOut}
      />

      {/* ─── Integrated System Design IDE Workspace (ResultPanel) ────────────── */}
      <div className="workspace-content" style={{ flex: 1, minHeight: 0, padding: 0, overflow: "hidden" }}>
        <ResultPanel
          result={activeBlueprint}
          project={project}
          onNavigateGlobal={onNavigateGlobal}
          isCommandPaletteOpenExternal={isCommandPaletteOpen}
          setIsCommandPaletteOpenExternal={setIsCommandPaletteOpen}
          onCommitRevision={(proposedModel, summary) => {
            if (onCommitRevision) {
              onCommitRevision(project._id || project.id, proposedModel, summary);
            }
          }}
        />
      </div>

      {/* ─── Compiler-Driven Staged SSE Generation Modal ──────────────────────── */}
      <PipelineStreamingModal
        isOpen={showStreamingModal}
        projectId={project._id || project.id}
        initialSpec={activeVersion?.specification || project.specification || ""}
        onClose={() => setShowStreamingModal(false)}
        onGenerationComplete={(blueprint, metrics, versionNumber) => {
          setShowStreamingModal(false);
          if (onCommitRevision) {
            onCommitRevision(blueprint, { description: `Synthesized v${versionNumber}` });
          }
        }}
      />
    </div>
  );
}
