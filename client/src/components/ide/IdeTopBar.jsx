import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Edit3, Search, ChevronDown, Sparkles, MoreHorizontal,
  Download, FileCode, Check, ShieldCheck, Settings as SettingsIcon,
  RefreshCw, Layers
} from "lucide-react";
import { WORKSPACE_TABS } from "../../lib/workspaceJourney.js";
import { getShortcutModifier } from "../../lib/useWorkspaceState.js";

export default function IdeTopBar({
  projectName = "System Architecture",
  activeWorkspace = "system",
  onSelectWorkspace,
  versionNumber = 1,
  onOpenCommandPalette,
  onExportScaffold,
  onExportOpenApi,
  onNavigateHome,
  onRefineProject,
  problemsCount = 0
}) {
  const modKey = getShortcutModifier();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <header
      className="ide-top-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
        padding: "0 14px",
        background: "rgba(10, 13, 20, 0.95)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        gap: 16,
        flexShrink: 0,
        zIndex: 40,
        backdropFilter: "blur(12px)"
      }}
    >
      {/* ─── Left: Back & Project Title ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            title="Back to Dashboard"
            style={{
              height: 28,
              width: 28,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <ArrowLeft size={14} />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ color: "var(--ide-accent-teal, #38bdf8)" }}>
            <Layers size={16} />
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "#f3f5fa",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 240,
              letterSpacing: "-0.01em"
            }}
          >
            {projectName}
          </h1>
        </div>
      </div>

      {/* ─── Center: Four Plain Tabs (System · Spec · Analyze · Build) ───── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(0, 0, 0, 0.35)",
          padding: 3,
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.06)"
        }}
        role="tablist"
        aria-label="Workspace Tabs"
      >
        {WORKSPACE_TABS.map((tab) => {
          const isActive = activeWorkspace === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectWorkspace(tab.id)}
              style={{
                height: 28,
                padding: "0 14px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? "rgba(139, 124, 255, 0.22)" : "transparent",
                color: isActive ? "#f3f5fa" : "var(--ide-text-muted, #94a3b8)",
                border: isActive
                  ? "1px solid rgba(139, 124, 255, 0.45)"
                  : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>{tab.label}</span>
              {tab.id === "analyze" && problemsCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 8,
                    background: "#ef4444",
                    color: "#ffffff",
                    lineHeight: 1.2
                  }}
                >
                  {problemsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── Right: ⌘K, Version, Refine, Menu ────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Command Palette (⌘K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={`Command Palette (${modKey}+K)`}
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            cursor: "pointer"
          }}
        >
          <Search size={12} />
          <kbd
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              background: "rgba(255, 255, 255, 0.08)",
              padding: "1px 4px",
              borderRadius: 3
            }}
          >
            {modKey}K
          </kbd>
        </button>

        {/* Version Chip */}
        <div
          style={{
            height: 26,
            padding: "0 8px",
            borderRadius: 5,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#cbd5e1",
            fontSize: 11,
            fontFamily: "monospace",
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
        >
          <span>v{versionNumber}</span>
        </div>

        {/* Refine / Simulate Action Button */}
        {onRefineProject && (
          <button
            type="button"
            onClick={onRefineProject}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              background: "rgba(139, 124, 255, 0.2)",
              border: "1px solid rgba(139, 124, 255, 0.4)",
              color: "#c4b5fd",
              fontSize: 11.5,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              cursor: "pointer"
            }}
          >
            <Sparkles size={12} />
            <span>Refine</span>
          </button>
        )}

        {/* Overflow Menu ("...") */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="More actions"
            style={{
              height: 28,
              width: 28,
              borderRadius: 6,
              background: isMenuOpen ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <MoreHorizontal size={14} />
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 34,
                right: 0,
                width: 190,
                background: "rgba(15, 19, 28, 0.98)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "4px 0",
                boxShadow: "0 10px 28px rgba(0, 0, 0, 0.6)",
                zIndex: 50
              }}
            >
              {onExportScaffold && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportScaffold();
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: 12,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer"
                  }}
                >
                  <Download size={13} color="#94a3b8" />
                  <span>Download Starter ZIP</span>
                </button>
              )}

              {onExportOpenApi && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportOpenApi();
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: 12,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer"
                  }}
                >
                  <FileCode size={13} color="#94a3b8" />
                  <span>Export OpenAPI 3.1</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
