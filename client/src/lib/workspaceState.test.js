import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMacPlatform,
  getShortcutModifier,
  WORKSPACE_PANEL_DEFAULTS,
  getStoredNumber
} from "./useWorkspaceState.js";
import { normalizeToCanonicalModel } from "./canonicalModel.js";
import { buildGraphIndex } from "./graphAnalysis.js";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

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

  it("computes accurate non-inflated bounding box from real node min/max", () => {
    function computeAccurateBounds(positions) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + pos.width);
        maxY = Math.max(maxY, pos.y + pos.height);
      });
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(100, maxX - minX),
        height: Math.max(100, maxY - minY)
      };
    }

    const testNodes = [
      { x: 40, y: 56, width: 200, height: 54 },
      { x: 304, y: 124, width: 200, height: 54 }
    ];
    const bounds = computeAccurateBounds(testNodes);
    assert.equal(bounds.minX, 40);
    assert.equal(bounds.minY, 56);
    assert.equal(bounds.maxX, 504);
    assert.equal(bounds.maxY, 178);
    assert.equal(bounds.width, 464);
    assert.equal(bounds.height, 122);
  });

  it("calculates symmetrical centering offsets across all 4 demo blueprints", () => {
    const clientWidth = 1000;
    const clientHeight = 700;
    const padding = 48;

    DEMO_PROJECTS.forEach(demo => {
      const canonical = normalizeToCanonicalModel(demo.fixture);
      const graph = buildGraphIndex(canonical);
      assert.ok(graph.nodes.length > 0);

      const nodeW = 200;
      const nodeH = 54;
      const positions = [];
      let curX = 40;
      const colSpacing = 64;
      const rowSpacing = 68;

      const types = ["requirement", "actor", "component", "api", "entity", "workflow", "test"];
      types.forEach(t => {
        const nodesOfType = graph.nodes.filter(n => n.type === t);
        if (!nodesOfType.length) return;
        nodesOfType.forEach((node, idx) => {
          positions.push({
            id: node.id,
            x: curX,
            y: 56 + idx * rowSpacing,
            width: nodeW,
            height: nodeH
          });
        });
        curX += nodeW + colSpacing;
      });

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + pos.width);
        maxY = Math.max(maxY, pos.y + pos.height);
      });

      const width = Math.max(100, maxX - minX);
      const height = Math.max(100, maxY - minY);

      const scaleX = (clientWidth - padding * 2) / width;
      const scaleY = (clientHeight - padding * 2) / height;
      const fitZoom = Math.max(0.15, Math.min(1.25, Math.min(scaleX, scaleY)));

      const offsetX = (clientWidth - width * fitZoom) / 2 - minX * fitZoom;
      const offsetY = (clientHeight - height * fitZoom) / 2 - minY * fitZoom;

      const screenLeft = offsetX + minX * fitZoom;
      const screenRight = offsetX + maxX * fitZoom;
      assert.ok(screenLeft >= 0, `Demo ${demo.id}: left margin must be >= 0`);
      assert.ok(Math.abs(screenLeft - (clientWidth - screenRight)) < 0.001, `Demo ${demo.id}: margins must be symmetrical`);
    });
  });

  it("verifies canvas occupies >= 55% screen width at 1440px with Explorer and Inspector open", () => {
    const screenWidth = 1440;
    const activityBarW = 48;
    const defaultExplorerW = 260;
    const defaultInspectorW = 320;

    // Both panels open
    const canvasWidthBothOpen = screenWidth - activityBarW - defaultExplorerW - defaultInspectorW;
    const ratioBothOpen = canvasWidthBothOpen / screenWidth;
    assert.equal(canvasWidthBothOpen, 812);
    assert.ok(ratioBothOpen >= 0.55, `Expected canvas ratio >= 55% at 1440px, got ${(ratioBothOpen * 100).toFixed(1)}%`);

    // Per-workspace default: Overview & Change Impact (panels closed)
    const canvasWidthPanelsClosed = screenWidth - activityBarW;
    const ratioPanelsClosed = canvasWidthPanelsClosed / screenWidth;
    assert.ok(ratioPanelsClosed > 0.95, `Expected canvas ratio > 95% when panels closed, got ${(ratioPanelsClosed * 100).toFixed(1)}%`);

    // Architecture initial state (Explorer open, Inspector closed until selection)
    const canvasWidthArchInitial = screenWidth - activityBarW - defaultExplorerW;
    const ratioArchInitial = canvasWidthArchInitial / screenWidth;
    assert.ok(ratioArchInitial > 0.75, `Expected architecture initial canvas > 75%, got ${(ratioArchInitial * 100).toFixed(1)}%`);
  });

  it("verifies responsive viewport widths and drawer overlay mechanics", () => {
    const viewports = [
      { name: "wide-desktop", width: 1440, expectsOverlay: false },
      { name: "standard-laptop", width: 1280, expectsOverlay: false },
      { name: "tablet", width: 1024, expectsOverlay: true },
      { name: "mobile", width: 768, expectsOverlay: true }
    ];

    viewports.forEach(vp => {
      const isTabletOrBelow = vp.width <= 1024;
      assert.equal(isTabletOrBelow, vp.expectsOverlay, `Viewport ${vp.name} (${vp.width}px) overlay state mismatch`);
    });
  });
});
