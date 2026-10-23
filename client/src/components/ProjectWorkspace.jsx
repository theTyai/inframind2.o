import { useState, useRef, useEffect } from "react";
import {
  Boxes, ArrowLeft, History, Sparkles, Copy, Download, ShieldCheck,
  Check, AlertCircle, X, ArrowRight, MoreHorizontal, Edit2, CheckCircle2,
  ChevronRight, Cloud, CloudOff, RefreshCw, Trash2
} from "lucide-react";
import ResultPanel from "./ResultPanel.jsx";

export default function ProjectWorkspace({
  project,
  onBack,
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
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineSpec, setRefineSpec] = useState(project.specification || "");

  // Inline project name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(project.name || project.projectName || "System Blueprint");

  // Secondary actions dropdown menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const menuRef = useRef(null);

  // Workspace navigation control passed to ResultPanel
  const [currentWorkspace, setCurrentWorkspace] = useState("overview");

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    }
    if (showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showActionsMenu]);

  // Keep editedName in sync if project prop updates
  useEffect(() => {
    setEditedName(project.name || project.projectName || "System Blueprint");
  }, [project.name, project.projectName]);

  // Active blueprint: either the selected version's blueprint or the project's root blueprint
  const versions = project.versions || [];
  const hasVersions = versions.length > 0;
  const activeVersion = hasVersions ? versions[selectedVersionIndex] : null;
  const activeBlueprint = activeVersion?.blueprint || project.blueprint || {};

  function handleSaveRename() {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== (project.name || project.projectName)) {
      if (onRenameProject) {
        onRenameProject(project._id || project.id, trimmed);
      }
    }
    setIsEditingName(false);
  }

  function handleKeyDownRename(e) {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditedName(project.name || project.projectName || "System Blueprint");
      setIsEditingName(false);
    }
  }

  function handleRefineSubmit(e) {
    e.preventDefault();
    if (refineSpec.trim().length < 20 || generatingVersion) return;
    onGenerateNewVersion(project._id || project.id, refineSpec.trim(), () => {
      setShowRefineModal(false);
    });
  }

  // Accurate Save Status Indicator
  const isCloudSaved = Boolean(project._id && !String(project._id).startsWith("guest-"));
  const updatedAtFormatted = project.updatedAt
    ? new Date(project.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " · " +
      new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })
    : "Just now";

  return (
    <div className="project-workspace-container">
      {/* ─── Compact Single-Row Redesigned Header ─────────────────────────────── */}
      <header className="compact-project-header">
        {/* Left Side: Breadcrumbs + Inline Editable Project Name + Verified Save Badge */}
        <div className="header-breadcrumbs-group">
          <button className="breadcrumb-back-btn" onClick={onBack} title="Back to All Projects">
            <ArrowLeft size={13} />
            <span>Projects</span>
          </button>
          <span className="breadcrumb-separator">/</span>

          {/* Inline Editable Name */}
          <div className="editable-title-wrap">
            {isEditingName ? (
              <div className="title-edit-box">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDownRename}
                  onBlur={handleSaveRename}
                  autoFocus
                  className="title-edit-input"
                  maxLength={64}
                />
                <button className="title-action-btn check" onClick={handleSaveRename} title="Save project name">
                  <Check size={12} />
                </button>
                <button
                  className="title-action-btn cancel"
                  onClick={() => {
                    setEditedName(project.name || project.projectName || "System Blueprint");
                    setIsEditingName(false);
                  }}
                  title="Cancel rename"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="title-display-group" onClick={() => setIsEditingName(true)} title="Click to rename project">
                <h1 className="project-display-title">
                  {project.name || project.projectName || activeBlueprint.projectName || "System Blueprint"}
                </h1>
                <span className="title-edit-icon"><Edit2 size={11} /></span>
              </div>
            )}
          </div>

          {/* Accurate Verified Persistence Badge */}
          <div className="save-status-indicator" title={isCloudSaved ? "Synchronized with MongoDB Cloud" : "Stored in browser local session"}>
            {isCloudSaved ? (
              <span className="cloud-status-badge saved">
                <span className="status-dot green" />
                <span>Saved</span>
              </span>
            ) : (
              <span className="cloud-status-badge local">
                <span className="status-dot amber" />
                <span>Local Session</span>
              </span>
            )}
            <span className="last-saved-time">Saved {updatedAtFormatted}</span>
          </div>
        </div>

        {/* Right Side: Version Dropdown, History Action, Refine CTA, and Secondary Menu */}
        <div className="header-actions-group">
          {/* Current Version Selector */}
          {hasVersions && (
            <div className="compact-version-selector">
              <History size={13} className="version-icon" />
              <select
                id="header-version-select"
                value={selectedVersionIndex}
                onChange={(e) => setSelectedVersionIndex(Number(e.target.value))}
                className="compact-version-dropdown"
                aria-label="Select blueprint version"
              >
                {versions.map((v, idx) => (
                  <option key={idx} value={idx}>
                    v{v.versionNumber || idx + 1} ({new Date(v.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Version History Action */}
          <button
            className="secondary-button compact-header-btn"
            onClick={() => setCurrentWorkspace("build")}
            title="Open Version History & Semantic Diffs"
          >
            <History size={13} />
            <span>History</span>
          </button>

          {/* Primary Refine / New Version Action */}
          <button
            className="primary-button compact-header-btn"
            onClick={() => {
              setRefineSpec(activeVersion?.specification || project.specification || "");
              setShowRefineModal(true);
            }}
            title="Generate a new version without destroying this one"
          >
            <Sparkles size={13} />
            <span>Refine / New Version</span>
          </button>

          {/* Secondary Actions Menu Dropdown (•••) */}
          <div className="secondary-menu-container" ref={menuRef}>
            <button
              className="icon-button secondary-menu-trigger"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              title="More project actions"
              aria-expanded={showActionsMenu}
            >
              <MoreHorizontal size={15} />
            </button>

            {showActionsMenu && (
              <div className="secondary-dropdown-menu">
                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowActionsMenu(false);
                    if (onDuplicate) onDuplicate(project._id || project.id);
                  }}
                >
                  <Copy size={13} />
                  <span>Duplicate Project</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowActionsMenu(false);
                    setIsEditingName(true);
                  }}
                >
                  <Edit2 size={13} />
                  <span>Rename Project</span>
                </button>
                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowActionsMenu(false);
                    setCurrentWorkspace("build");
                  }}
                >
                  <Download size={13} />
                  <span>Export Scaffold & OpenAPI</span>
                </button>
                {onDeleteProject && (
                  <button
                    className="dropdown-menu-item danger"
                    onClick={() => {
                      setShowActionsMenu(false);
                      if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
                        onDeleteProject(project._id || project.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Project</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Active Blueprint 5-Workspace Results Panel ───────────────────────── */}
      <div className="workspace-content">
        <ResultPanel
          result={activeBlueprint}
          project={project}
          initialWorkspace={currentWorkspace}
          onCommitRevision={(proposedModel, summary) => {
            if (onCommitRevision) {
              onCommitRevision(project._id || project.id, proposedModel, summary);
            }
          }}
        />
      </div>

      {/* ─── Refine / New Version Modal ─────────────────────────────────────── */}
      {showRefineModal && (
        <div className="modal-backdrop" onClick={() => !generatingVersion && setShowRefineModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="brand-mark small"><Sparkles size={18} /></span>
                <div>
                  <h3>Generate New Blueprint Version</h3>
                  <p>Update requirements. InfraMind saves version v{(versions.length || 1) + 1} while preserving earlier versions.</p>
                </div>
              </div>
              <button
                className="icon-close-button"
                onClick={() => !generatingVersion && setShowRefineModal(false)}
                disabled={generatingVersion}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRefineSubmit} style={{ padding: "18px 22px" }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
                  Updated Requirements Specification
                </label>
                <textarea
                  value={refineSpec}
                  onChange={(e) => setRefineSpec(e.target.value)}
                  placeholder="Describe your updated requirements, additional features, or modified business rules…"
                  rows={8}
                  maxLength={10000}
                  disabled={generatingVersion}
                  required
                />
                <span className="character-count" style={{ display: "block", textAlign: "right", marginTop: 4 }}>
                  {refineSpec.length} / 10,000
                </span>
              </div>

              {versionError && (
                <div className="error-banner" style={{ margin: "12px 0 0 0" }}>
                  <AlertCircle size={15} />
                  <span>{versionError}</span>
                </div>
              )}

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowRefineModal(false)}
                  disabled={generatingVersion}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={generatingVersion || refineSpec.trim().length < 20}
                >
                  {generatingVersion ? (
                    <><RefreshCw size={14} className="spin" /> Generating Version v{(versions.length || 1) + 1}…</>
                  ) : (
                    <><Sparkles size={14} /> Synthesize New Version</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
