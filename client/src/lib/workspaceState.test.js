import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMacPlatform,
  getShortcutModifier,
  WORKSPACE_PANEL_DEFAULTS,
  getStoredNumber
} from "./useWorkspaceState.js";

describe("Workspace State & Panel Logic", () => {
  it("determines correct platform modifier", () => {
    const mod = getShortcutModifier();
    assert.ok(mod === "⌘" || mod === "Ctrl");
  });

  it("enforces sensible per-workspace panel defaults to prevent visual clutter", () => {
    // Overview: clean document view with panels closed
    assert.equal(WORKSPACE_PANEL_DEFAULTS.overview.explorer, false);
    assert.equal(WORKSPACE_PANEL_DEFAULTS.overview.inspector, false);

    // Architecture: explorer open for navigation
    assert.equal(WORKSPACE_PANEL_DEFAULTS.architecture.explorer, true);

    // Impact: inspector closed to prioritize 3-pane ripple simulator
    assert.equal(WORKSPACE_PANEL_DEFAULTS.impact.inspector, false);

    // Build: explorer open to show file tree
    assert.equal(WORKSPACE_PANEL_DEFAULTS.build.explorer, true);
  });

  it("safely falls back for localStorage dimension retrieval", () => {
    const def = getStoredNumber("non_existent_key", 260, 180, 440);
    assert.equal(def, 260);
  });
});
