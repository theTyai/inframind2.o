/**
 * InfraMind IDE — Workspace State, Panel Layout & Platform Shortcuts Hook
 * Provides URL sync, localStorage persistence, and per-workspace panel defaults.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// Platform detection: returns true on macOS, false on Windows/Linux
export const isMacPlatform = () => {
  if (typeof window === "undefined" || !window.navigator) return false;
  const platform = window.navigator.platform || window.navigator.userAgentData?.platform || "";
  const ua = window.navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh/i.test(ua);
};

export const getShortcutModifier = () => (isMacPlatform() ? "⌘" : "Ctrl");

// Keep side panels closed until the user asks. One idea on the canvas.
export const WORKSPACE_PANEL_DEFAULTS = {
  system: { explorer: false, inspector: false },
  spec: { explorer: false, inspector: false },
  analyze: { explorer: false, inspector: false },
  build: { explorer: false, inspector: false },
  // Backward compatibility keys
  overview: { explorer: false, inspector: false },
  architecture: { explorer: false, inspector: false },
  impact: { explorer: false, inspector: false },
  validate: { explorer: false, inspector: false }
};

const STORAGE_KEYS = {
  EXPLORER_WIDTH: "inframind_ide_explorer_width",
  INSPECTOR_WIDTH: "inframind_ide_inspector_width",
  PROBLEMS_HEIGHT: "inframind_ide_problems_height",
  ACTIVE_WORKSPACE: "inframind_ide_workspace"
};

export function getStoredNumber(key, defaultValue, min, max) {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        return parsed;
      }
    }
  } catch {
    // LocalStorage unavailable
  }
  return defaultValue;
}

export function setStoredNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function useWorkspaceState({ initialWorkspace = "system", canonicalModel = null } = {}) {
  const isMac = useMemo(() => isMacPlatform(), []);
  const modKey = useMemo(() => (isMac ? "⌘" : "Ctrl"), [isMac]);

  // Active workspace (system, spec, analyze, build)
  const [workspace, setWorkspaceState] = useState(() => {
    try {
      const hash = window.location.hash.replace(/^#/, "");
      const match = hash.match(/ws=([a-z0-9_-]+)/i);
      if (match && match[1]) {
        const raw = match[1].toLowerCase();
        if (raw === "overview" || raw === "architecture") return "system";
        if (raw === "validate" || raw === "impact") return "analyze";
        return raw;
      }
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE);
      if (saved && WORKSPACE_PANEL_DEFAULTS[saved]) {
        if (saved === "overview" || saved === "architecture") return "system";
        if (saved === "validate" || saved === "impact") return "analyze";
        return saved;
      }
    } catch {}
    return initialWorkspace === "overview" ? "system" : initialWorkspace;
  });

  // Panel Open / Closed States
  const [isExplorerOpen, setIsExplorerOpen] = useState(() => {
    return WORKSPACE_PANEL_DEFAULTS[workspace]?.explorer ?? false;
  });
  const [isInspectorOpen, setIsInspectorOpen] = useState(() => {
    return WORKSPACE_PANEL_DEFAULTS[workspace]?.inspector ?? false;
  });
  const [isProblemsOpen, setIsProblemsOpen] = useState(false); // Collapsed by default!
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Resizable Panel Dimensions
  const [explorerWidth, setExplorerWidthState] = useState(() =>
    getStoredNumber(STORAGE_KEYS.EXPLORER_WIDTH, 260, 180, 440)
  );
  const [inspectorWidth, setInspectorWidthState] = useState(() =>
    getStoredNumber(STORAGE_KEYS.INSPECTOR_WIDTH, 320, 240, 500)
  );
  const [problemsHeight, setProblemsHeightState] = useState(() =>
    getStoredNumber(STORAGE_KEYS.PROBLEMS_HEIGHT, 220, 120, 480)
  );

  const setExplorerWidth = useCallback((w) => {
    const clamped = Math.max(180, Math.min(440, Math.round(w)));
    setExplorerWidthState(clamped);
    setStoredNumber(STORAGE_KEYS.EXPLORER_WIDTH, clamped);
  }, []);

  const setInspectorWidth = useCallback((w) => {
    const clamped = Math.max(240, Math.min(500, Math.round(w)));
    setInspectorWidthState(clamped);
    setStoredNumber(STORAGE_KEYS.INSPECTOR_WIDTH, clamped);
  }, []);

  const setProblemsHeight = useCallback((h) => {
    const clamped = Math.max(120, Math.min(480, Math.round(h)));
    setProblemsHeightState(clamped);
    setStoredNumber(STORAGE_KEYS.PROBLEMS_HEIGHT, clamped);
  }, []);

  // Selection Store: single selected artifact for the whole IDE
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  // Switch workspace and apply smart panel defaults
  const setWorkspace = useCallback((newWs) => {
    setWorkspaceState(newWs);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE, newWs);
      // Update hash query without page reload
      const hash = window.location.hash;
      const baseHash = hash.replace(/[?&]ws=[^&]+/g, "");
      const newHash = baseHash ? `${baseHash}&ws=${newWs}` : `ws=${newWs}`;
      window.history.replaceState(null, "", `#${newHash}`);
    } catch {}

    // Apply per-workspace panel defaults
    const defaults = WORKSPACE_PANEL_DEFAULTS[newWs];
    if (defaults) {
      setIsExplorerOpen(defaults.explorer);
      setIsInspectorOpen(defaults.inspector);
    }
  }, []);

  // Keyboard shortcut listener (Windows & Mac friendly, no Alt menu conflicts)
  useEffect(() => {
    function handleKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) {
        if (e.key === "Escape") {
          if (isCommandPaletteOpen) {
            e.preventDefault();
            setIsCommandPaletteOpen(false);
          }
        }
        return;
      }

      const key = e.key.toLowerCase();
      // Ctrl+K / Cmd+K: Command Palette
      if (key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+B / Cmd+B: Toggle Explorer sidebar
      else if (key === "b") {
        e.preventDefault();
        setIsExplorerOpen(prev => !prev);
      }
      // Ctrl+J / Cmd+J: Toggle Problems drawer (standard developer IDE)
      else if (key === "j") {
        e.preventDefault();
        setIsProblemsOpen(prev => !prev);
      }
      // Ctrl+\ / Cmd+\: Toggle Inspector
      else if (key === "\\" || key === "|") {
        e.preventDefault();
        setIsInspectorOpen(prev => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen]);

  return {
    isMac,
    modKey,
    workspace,
    setWorkspace,
    isExplorerOpen,
    setIsExplorerOpen,
    toggleExplorer: () => setIsExplorerOpen(prev => !prev),
    isInspectorOpen,
    setIsInspectorOpen,
    toggleInspector: () => setIsInspectorOpen(prev => !prev),
    isProblemsOpen,
    setIsProblemsOpen,
    toggleProblems: () => setIsProblemsOpen(prev => !prev),
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    toggleCommandPalette: () => setIsCommandPaletteOpen(prev => !prev),
    explorerWidth,
    setExplorerWidth,
    inspectorWidth,
    setInspectorWidth,
    problemsHeight,
    setProblemsHeight,
    selectedArtifact,
    setSelectedArtifact
  };
}
