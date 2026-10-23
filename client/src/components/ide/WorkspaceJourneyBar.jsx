import {
  Boxes, Workflow, Zap, ShieldCheck, Code2,
  ListTree, AlertCircle, Search, Sparkles
} from "lucide-react";
import { WORKSPACE_STAGES, getWorkspaceIndex } from "../../lib/workspaceJourney.js";
import { getShortcutModifier } from "../../lib/useWorkspaceState.js";

const STAGE_META = {
  overview: {
    title: "Overview",
    subtitle: "System & Live Flow",
    icon: Boxes,
    tag: "Understand"
  },
  architecture: {
    title: "Architecture",
    subtitle: "Graph & Role Flows",
    icon: Workflow,
    tag: "Map"
  },
  impact: {
    title: "Simulate",
    subtitle: "What-If Changes",
    icon: Zap,
    tag: "Simulate"
  },
  validate: {
    title: "Validation",
    subtitle: "Checks & Security",
    icon: ShieldCheck,
    tag: "Check"
  },
  build: {
    title: "Scaffold & Code",
    subtitle: "MERN & Mock API",
    icon: Code2,
    tag: "Build"
  }
};

export default function WorkspaceJourneyBar({
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
  const activeIndex = getWorkspaceIndex(activeWorkspace);
  const progress = WORKSPACE_STAGES.length > 1
    ? (activeIndex / (WORKSPACE_STAGES.length - 1)) * 100
    : 0;

  return (
    <div className="ws-journey" role="navigation" aria-label="Blueprint walkthrough">
      {/* Visual Progress Track */}
      <div className="ws-journey-track" aria-hidden="true">
        <div className="ws-journey-progress" style={{ width: `${progress}%` }} />
      </div>

      {/* Prominent High-Clarity IDE Workspace Navigation Tabs */}
      <ol className="ws-journey-steps">
        {WORKSPACE_STAGES.map((stage, index) => {
          const isActive = activeWorkspace === stage.id;
          const isDone = index < activeIndex;
          const meta = STAGE_META[stage.id] || {
            title: stage.label,
            subtitle: stage.title,
            icon: Boxes,
            tag: stage.label
          };
          const Icon = meta.icon;

          return (
            <li key={stage.id} style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                className={`ws-journey-step ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                onClick={() => onSelectWorkspace(stage.id)}
                aria-current={isActive ? "step" : undefined}
                title={`${meta.title} — ${stage.hint}`}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: isActive
                    ? "rgba(139, 124, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.02)",
                  border: isActive
                    ? "1px solid rgba(139, 124, 255, 0.45)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: isActive ? "0 4px 16px rgba(139, 124, 255, 0.16)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s ease",
                  position: "relative"
                }}
              >
                {/* Stage Step Number badge (preserved for test compatibility & clarity) */}
                <span className="ws-journey-num">
                  {stage.step}
                </span>

                {/* Tab Icon */}
                <span style={{
                  color: isActive ? "#8b7cff" : "var(--ide-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0
                }}>
                  <Icon size={16} />
                </span>

                {/* Tab Titles: Bold Name + Stage Label Subtitle */}
                <span className="ws-journey-copy" style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isActive ? "#f3f5fa" : "var(--ide-text-secondary)",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {meta.title}
                  </strong>
                  <em style={{
                    fontStyle: "normal",
                    fontSize: 10,
                    color: isActive ? "#c2b9ff" : "var(--ide-text-dim)",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {stage.label} · {meta.subtitle}
                  </em>
                </span>

                {/* Validation Issues indicator if applicable */}
                {stage.id === "validate" && problemsCount > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 10,
                    background: "var(--ide-red)",
                    color: "#08090d",
                    lineHeight: 1.2
                  }}>
                    {problemsCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Right Tools: Index, Issues, Command Palette */}
      <div className="ws-journey-tools">
        <button
          type="button"
          className={`ws-tool-btn ${isExplorerOpen ? "is-on" : ""}`}
          onClick={onToggleExplorer}
          title={isExplorerOpen ? `Hide index (${modKey}+B)` : `Show index (${modKey}+B)`}
          aria-label="Toggle index"
          aria-pressed={isExplorerOpen}
        >
          <ListTree size={14} />
          <span>Index</span>
        </button>
        <button
          type="button"
          className={`ws-tool-btn ${isProblemsOpen ? "is-on" : ""} ${problemsCount > 0 ? "has-alert" : ""}`}
          onClick={onToggleProblems}
          title={isProblemsOpen ? `Hide issues (${modKey}+J)` : `Show issues (${modKey}+J)`}
          aria-label="Toggle issues"
          aria-pressed={isProblemsOpen}
        >
          <AlertCircle size={14} />
          <span>Issues{problemsCount > 0 ? ` ${problemsCount}` : ""}</span>
        </button>
        <button
          type="button"
          className="ws-tool-btn"
          onClick={onOpenCommandPalette}
          title={`Search (${modKey}+K)`}
          aria-label="Open search"
        >
          <Search size={14} />
          <span>Search</span>
        </button>
      </div>
    </div>
  );
}
