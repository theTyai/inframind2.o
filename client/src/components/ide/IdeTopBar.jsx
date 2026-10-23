import { useState, useRef, useEffect } from "react";
import {
  Boxes, ArrowLeft, Check, Edit2, ChevronDown, Sparkles,
  MoreHorizontal, Download, Copy, Trash2, Settings, LogOut,
  FolderKanban, Plus, Layers3, Search, Terminal, Cloud, CloudOff
} from "lucide-react";
import { getShortcutModifier } from "../../lib/useWorkspaceState.js";

export default function IdeTopBar({
  projectName = "System Blueprint",
  onRenameProject,
  onBack,
  versions = [],
  selectedVersionIndex = 0,
  onSelectVersion,
  saveStatus = {},
  onOpenCommandPalette,
  onOpenRefine,
  onDuplicate,
  onDelete,
  onExportScaffold,
  onExportOpenApi,
  onNavigateGlobal,
  user,
  onSignOut
}) {
  const modKey = getShortcutModifier();

  // Inline rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(projectName);

  // Dropdown states
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);

  const versionMenuRef = useRef(null);
  const overflowMenuRef = useRef(null);

  // Sync editedName when prop changes
  useEffect(() => {
    setEditedName(projectName);
  }, [projectName]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target)) {
        setIsVersionMenuOpen(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target)) {
        setIsOverflowMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSaveRename() {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== projectName) {
      if (onRenameProject) onRenameProject(trimmed);
    }
    setIsEditingName(false);
  }

  function handleKeyDownRename(e) {
    if (e.key === "Enter") handleSaveRename();
    else if (e.key === "Escape") {
      setEditedName(projectName);
      setIsEditingName(false);
    }
  }

  const currentVersion = versions[selectedVersionIndex] || null;
  const versionLabel = currentVersion ? `v${currentVersion.versionNumber || selectedVersionIndex + 1}` : "v1";

  return (
    <header className="ide-top-bar" style={{
      height: 44,
      background: "var(--ide-bg-chrome)",
      borderBottom: "1px solid var(--ide-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 12px",
      flexShrink: 0,
      zIndex: 25,
      userSelect: "none"
    }}>
      {/* ─── Left: Brand & Breadcrumb Inline Rename ───────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* Back to Projects */}
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "var(--ide-text-muted)",
            fontSize: "var(--ide-font-sm)",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "var(--ide-radius-sm)"
          }}
          title="Back to All Projects"
        >
          <ArrowLeft size={14} />
          <span>Projects</span>
        </button>

        <span style={{ color: "var(--ide-border)", fontSize: "var(--ide-font-sm)" }}>/</span>

        {/* Inline Editable Project Name */}
        {isEditingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDownRename}
              onBlur={handleSaveRename}
              autoFocus
              maxLength={64}
              style={{
                background: "var(--ide-bg-panels)",
                border: "1px solid var(--ide-accent)",
                borderRadius: "var(--ide-radius-sm)",
                color: "var(--ide-text-primary)",
                fontSize: "var(--ide-font-base)",
                fontWeight: 600,
                padding: "2px 8px",
                outline: "none",
                width: 220
              }}
            />
            <button
              onClick={handleSaveRename}
              style={{
                background: "var(--ide-accent)",
                border: "none",
                borderRadius: "var(--ide-radius-sm)",
                color: "#fff",
                padding: "3px 6px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center"
              }}
              title="Save name"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "var(--ide-text-primary)",
              fontSize: "var(--ide-font-base)",
              fontWeight: 600,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "var(--ide-radius-sm)",
              maxWidth: 240,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title="Click to rename project"
          >
            <span>{projectName}</span>
            <Edit2 size={11} style={{ color: "var(--ide-text-dim)" }} />
          </button>
        )}

        {/* Save Status Dot */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 6px",
            borderRadius: "var(--ide-radius-pill)",
            fontSize: "var(--ide-font-xs)",
            color: "var(--ide-text-muted)",
            cursor: "default"
          }}
          title={saveStatus.isCloud ? `Saved to cloud · ${saveStatus.updatedAt || "Just now"}` : "Stored in local session"}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: saveStatus.isCloud ? "var(--ide-green)" : "var(--ide-amber)",
            display: "inline-block"
          }} />
          <span style={{ fontSize: 11 }}>{saveStatus.isCloud ? "Saved" : "Local"}</span>
        </div>
      </div>

      {/* ─── Center: ⌘K / Ctrl+K Command Palette Trigger ────────────────────── */}
      <div style={{ flex: 1, maxWidth: 360, margin: "0 16px" }}>
        <button
          onClick={onOpenCommandPalette}
          style={{
            width: "100%",
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--ide-bg-panels)",
            border: "1px solid var(--ide-border)",
            borderRadius: "var(--ide-radius-md)",
            padding: "0 10px",
            color: "var(--ide-text-muted)",
            fontSize: "var(--ide-font-sm)",
            cursor: "pointer",
            transition: "all var(--ide-transition-fast)"
          }}
          title={`Open Command Palette (${modKey}+K)`}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={13} style={{ color: "var(--ide-text-dim)" }} />
            <span>Search artifacts, actions...</span>
          </span>
          <kbd style={{
            background: "var(--ide-bg-chrome)",
            border: "1px solid var(--ide-border)",
            borderRadius: "var(--ide-radius-xs)",
            padding: "1px 5px",
            fontSize: 10,
            fontFamily: "var(--ide-font-mono)",
            color: "var(--ide-text-secondary)"
          }}>
            {modKey}+K
          </kbd>
        </button>
      </div>

      {/* ─── Right: Revisions Dropdown + Refine Primary Action + Overflow Menu ─ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Revision Dropdown Selector (Where History lives!) */}
        {versions.length > 0 && (
          <div style={{ position: "relative" }} ref={versionMenuRef}>
            <button
              onClick={() => setIsVersionMenuOpen(prev => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "var(--ide-bg-panels)",
                border: "1px solid var(--ide-border)",
                borderRadius: "var(--ide-radius-sm)",
                color: "var(--ide-text-primary)",
                fontSize: "var(--ide-font-sm)",
                fontWeight: 500,
                padding: "4px 8px",
                cursor: "pointer"
              }}
              title="Switch Blueprint Revisions"
            >
              <span>{versionLabel}</span>
              <ChevronDown size={12} style={{ color: "var(--ide-text-muted)" }} />
            </button>

            {isVersionMenuOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                width: 220,
                background: "var(--ide-bg-panels)",
                border: "1px solid var(--ide-border)",
                borderRadius: "var(--ide-radius-md)",
                boxShadow: "var(--ide-shadow-popover)",
                padding: "4px",
                zIndex: "var(--ide-z-popover)"
              }}>
                <div style={{
                  padding: "6px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ide-text-muted)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase"
                }}>
                  Blueprint Revisions
                </div>
                {versions.map((ver, idx) => {
                  const isCurrent = idx === selectedVersionIndex;
                  return (
                    <button
                      key={ver._id || idx}
                      onClick={() => {
                        if (onSelectVersion) onSelectVersion(idx);
                        setIsVersionMenuOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "var(--ide-radius-sm)",
                        background: isCurrent ? "var(--ide-accent-subtle)" : "transparent",
                        border: "none",
                        color: isCurrent ? "var(--ide-accent)" : "var(--ide-text-primary)",
                        fontSize: "var(--ide-font-sm)",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <div>
                        <strong>v{ver.versionNumber || idx + 1}</strong>
                        <span style={{ display: "block", fontSize: 10, color: "var(--ide-text-muted)" }}>
                          {ver.changeSummary || "Snapshot"}
                        </span>
                      </div>
                      {isCurrent && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Primary Action Button: Refine */}
        <button
          onClick={onOpenRefine}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--ide-accent)",
            border: "none",
            borderRadius: "var(--ide-radius-sm)",
            color: "#ffffff",
            fontSize: "var(--ide-font-sm)",
            fontWeight: 600,
            padding: "5px 12px",
            cursor: "pointer",
            boxShadow: "var(--ide-shadow-sm)"
          }}
          title="Refine architecture with AI"
        >
          <Sparkles size={13} />
          <span>Refine</span>
        </button>

        {/* Secondary Overflow Menu (…) */}
        <div style={{ position: "relative" }} ref={overflowMenuRef}>
          <button
            onClick={() => setIsOverflowMenuOpen(prev => !prev)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--ide-radius-sm)",
              background: "transparent",
              border: "1px solid var(--ide-border)",
              color: "var(--ide-text-muted)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center"
            }}
            title="More Options"
          >
            <MoreHorizontal size={15} />
          </button>

          {isOverflowMenuOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              width: 200,
              background: "var(--ide-bg-panels)",
              border: "1px solid var(--ide-border)",
              borderRadius: "var(--ide-radius-md)",
              boxShadow: "var(--ide-shadow-popover)",
              padding: "4px",
              zIndex: "var(--ide-z-popover)"
            }}>
              {/* Global Navigation Shortcuts */}
              <button
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  if (onNavigateGlobal) onNavigateGlobal("projects");
                }}
                className="overflow-item"
              >
                <FolderKanban size={13} />
                <span>My Projects</span>
              </button>

              <button
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  if (onNavigateGlobal) onNavigateGlobal("new");
                }}
                className="overflow-item"
              >
                <Plus size={13} />
                <span>New Blueprint</span>
              </button>

              <button
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  if (onNavigateGlobal) onNavigateGlobal("demo");
                }}
                className="overflow-item"
              >
                <Layers3 size={13} />
                <span>Example Demos</span>
              </button>

              <div style={{ height: 1, background: "var(--ide-border)", margin: "4px 0" }} />

              {/* Exports & Actions */}
              {onExportScaffold && (
                <button
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onExportScaffold();
                  }}
                  className="overflow-item"
                >
                  <Download size={13} />
                  <span>Download Starter ZIP</span>
                </button>
              )}

              {onExportOpenApi && (
                <button
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onExportOpenApi();
                  }}
                  className="overflow-item"
                >
                  <Download size={13} />
                  <span>Download OpenAPI JSON</span>
                </button>
              )}

              {onDuplicate && (
                <button
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onDuplicate();
                  }}
                  className="overflow-item"
                >
                  <Copy size={13} />
                  <span>Duplicate Blueprint</span>
                </button>
              )}

              <div style={{ height: 1, background: "var(--ide-border)", margin: "4px 0" }} />

              {/* Settings, Account & Sign Out */}
              <button
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  if (onNavigateGlobal) onNavigateGlobal("settings");
                }}
                className="overflow-item"
              >
                <Settings size={13} />
                <span>Settings</span>
              </button>

              {user && (
                <div style={{ padding: "6px 8px", fontSize: 10, color: "var(--ide-text-muted)" }}>
                  Signed in as <strong>{user.displayName || user.email}</strong>
                </div>
              )}

              {onSignOut && (
                <button
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onSignOut();
                  }}
                  className="overflow-item danger"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onDelete();
                  }}
                  className="overflow-item danger"
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
  );
}
