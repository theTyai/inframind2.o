import { ShieldCheck, AlertCircle, Play, Terminal, Cpu, Network } from "lucide-react";
import { getShortcutModifier } from "../../lib/useWorkspaceState.js";

export default function IdeStatusBar({
  versionNumber = 1,
  compilerFindings = [],
  selectedArtifact,
  projectId,
  nodeCount = 0,
  edgeCount = 0,
  onToggleProblems,
  onOpenCommandPalette
}) {
  const modKey = getShortcutModifier();

  const errors = compilerFindings.filter(f => f.severity === "error");
  const warnings = compilerFindings.filter(f => f.severity === "warning");
  const passes = compilerFindings.filter(f => f.severity === "pass");

  return (
    <footer className="ide-status-bar" aria-label="Status Bar" style={{
      height: 24,
      background: "var(--ide-bg-chrome)",
      borderTop: "1px solid var(--ide-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 12px",
      fontSize: "var(--ide-font-xs)",
      color: "var(--ide-text-muted)",
      userSelect: "none",
      flexShrink: 0,
      zIndex: 10
    }}>
      {/* ─── Left: Revision & Save Status ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Revision badge */}
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ide-text-secondary)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ide-accent)", display: "inline-block" }} />
          <span>Revision <strong>v{versionNumber}</strong></span>
        </span>

        {/* Problems Pill (collapsed by default) */}
        <button
          onClick={onToggleProblems}
          style={{
            background: "transparent",
            border: "none",
            color: errors.length > 0 ? "var(--ide-red)" : warnings.length > 0 ? "var(--ide-amber)" : "var(--ide-green)",
            cursor: "pointer",
            fontSize: "var(--ide-font-xs)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 0
          }}
          title={`Toggle Problems panel (${modKey}+J)`}
          aria-label="Toggle Problems"
        >
          {errors.length > 0 ? <AlertCircle size={12} /> : <ShieldCheck size={12} />}
          <span>
            {errors.length > 0
              ? `${errors.length} error(s)`
              : warnings.length > 0
              ? `${warnings.length} warning(s)`
              : `${passes.length} verified`}
          </span>
        </button>

        {/* Live Mock Server Status */}
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ide-cyan)" }}>
          <Play size={10} />
          <span>Mock Server Active</span>
        </span>
      </div>

      {/* ─── Center: Graph Topology Metrics ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ide-text-dim)" }}>
        {nodeCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <Network size={11} style={{ color: "var(--ide-text-muted)" }} />
            <span>{nodeCount} nodes · {edgeCount} edges</span>
          </span>
        )}
      </div>

      {/* ─── Right: Selected Artifact & ⌘K / Ctrl+K ────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Selected artifact indicator */}
        {selectedArtifact && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ide-text-primary)" }}>
            <Cpu size={11} style={{ color: "var(--ide-cyan)" }} />
            <span>Selected: <strong>{selectedArtifact.label}</strong> [{selectedArtifact.id}]</span>
          </span>
        )}

        {/* Command palette hint */}
        <button
          onClick={onOpenCommandPalette}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ide-text-muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "var(--ide-font-mono)",
            display: "flex",
            alignItems: "center",
            gap: 4
          }}
          title={`Open Command Palette (${modKey}+K)`}
        >
          <Terminal size={11} />
          <span>{modKey}+K</span>
        </button>
      </div>
    </footer>
  );
}
