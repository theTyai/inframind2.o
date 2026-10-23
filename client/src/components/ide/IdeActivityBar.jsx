import {
  Boxes, Workflow, Activity, ShieldCheck, Code2,
  ListTree, AlertCircle, Terminal
} from "lucide-react";
import { getShortcutModifier } from "../../lib/useWorkspaceState.js";

export default function IdeActivityBar({
  activeWorkspace,
  onSelectWorkspace,
  problemsCount = 0,
  isProblemsOpen,
  onToggleProblems,
  isExplorerOpen,
  onToggleExplorer,
  onOpenCommandPalette
}) {
  const modKey = getShortcutModifier();

  const workspaces = [
    { id: "overview", label: "Overview", icon: Boxes, badge: null },
    { id: "architecture", label: "Architecture", icon: Workflow, badge: null },
    { id: "impact", label: "Change Impact", icon: Activity, badge: null },
    { id: "validate", label: "Validate", icon: ShieldCheck, badge: problemsCount > 0 ? problemsCount : null },
    { id: "build", label: "Build & History", icon: Code2, badge: null }
  ];

  return (
    <aside className="ide-activity-bar" aria-label="Activity Bar" style={{
      width: 48,
      background: "var(--ide-bg-chrome)",
      borderRight: "1px solid var(--ide-border)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "8px 0",
      flexShrink: 0,
      zIndex: 10
    }}>
      {/* Top Workspace Icons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", alignItems: "center" }}>
        {workspaces.map(({ id, label, icon: Icon, badge }) => {
          const isActive = activeWorkspace === id;
          return (
            <button
              key={id}
              onClick={() => onSelectWorkspace(id)}
              title={`${label} Workspace`}
              aria-label={`${label} Workspace`}
              aria-current={isActive ? "page" : undefined}
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--ide-radius-md)",
                border: "none",
                background: isActive ? "var(--ide-accent-subtle)" : "transparent",
                color: isActive ? "var(--ide-accent)" : "var(--ide-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all var(--ide-transition-fast)"
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute",
                  left: -6,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  background: "var(--ide-accent)",
                  borderRadius: "0 2px 2px 0"
                }} />
              )}
              <Icon size={18} />
              {badge !== null && (
                <span style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  background: "var(--ide-red)",
                  color: "#08090d",
                  fontSize: 9,
                  fontWeight: 800,
                  borderRadius: "var(--ide-radius-pill)",
                  padding: "1px 4px",
                  lineHeight: 1
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom utility triggers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", alignItems: "center" }}>
        {/* Toggle Explorer */}
        <button
          onClick={onToggleExplorer}
          title={isExplorerOpen ? `Hide Explorer (${modKey}+B)` : `Show Explorer (${modKey}+B)`}
          aria-label="Toggle Explorer Sidebar"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--ide-radius-sm)",
            border: "none",
            background: isExplorerOpen ? "var(--ide-bg-hover)" : "transparent",
            color: isExplorerOpen ? "var(--ide-text-primary)" : "var(--ide-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <ListTree size={16} />
        </button>

        {/* Toggle Problems Drawer */}
        <button
          onClick={onToggleProblems}
          title={isProblemsOpen ? `Hide Problems (${modKey}+J)` : `Show Problems (${modKey}+J)`}
          aria-label="Toggle Problems Drawer"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--ide-radius-sm)",
            border: "none",
            background: isProblemsOpen ? "var(--ide-accent-subtle)" : "transparent",
            color: problemsCount > 0 ? "var(--ide-red)" : "var(--ide-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}
        >
          <AlertCircle size={16} />
          {problemsCount > 0 && (
            <span style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--ide-red)"
            }} />
          )}
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          title={`Command Palette (${modKey}+K)`}
          aria-label="Open Command Palette"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--ide-radius-sm)",
            border: "none",
            background: "transparent",
            color: "var(--ide-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Terminal size={16} />
        </button>
      </div>
    </aside>
  );
}
