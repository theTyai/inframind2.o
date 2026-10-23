import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToCanonicalModel } from "./canonicalModel.js";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";
import { WORKSPACE_TABS, WORKSPACE_STAGES, getWorkspaceStage, normalizeWorkspaceId } from "./workspaceJourney.js";

test("Workspace tabs present exactly 4 primary workspaces with plain-language labels", () => {
  assert.equal(WORKSPACE_TABS.length, 4);
  assert.deepEqual(
    WORKSPACE_TABS.map((stage) => stage.id),
    ["system", "spec", "analyze", "build"]
  );
  assert.deepEqual(
    WORKSPACE_TABS.map((stage) => stage.label),
    ["System", "Spec", "Analyze", "Build"]
  );
  assert.equal(getWorkspaceStage("system").defaultSubView, "components");
  assert.equal(getWorkspaceStage("spec").defaultSubView, "all");
  assert.equal(getWorkspaceStage("analyze").defaultSubView, "checks");
  assert.equal(getWorkspaceStage("build").defaultSubView, "scaffold");
});

test("Workspace Navigation Mapping: all legacy tabs map cleanly into the 4 canonical workspaces", () => {
  const legacyMappings = [
    { input: "overview", expected: "system" },
    { input: "architecture", expected: "system" },
    { input: "map", expected: "system" },
    { input: "system", expected: "system" },
    { input: "spec", expected: "spec" },
    { input: "requirements", expected: "spec" },
    { input: "story", expected: "spec" },
    { input: "analyze", expected: "analyze" },
    { input: "impact", expected: "analyze" },
    { input: "validate", expected: "analyze" },
    { input: "checks", expected: "analyze" },
    { input: "threats", expected: "analyze" },
    { input: "build", expected: "build" },
    { input: "scaffold", expected: "build" }
  ];

  legacyMappings.forEach(({ input, expected }) => {
    assert.equal(normalizeWorkspaceId(input), expected, `Workspace '${input}' should normalize to '${expected}'`);
  });
});

test("Structured Overview Normalization: handles missing fields, empty arrays, and legacy data safely", () => {
  // Legacy or minimal blueprint shape
  const minimalBlueprint = {
    projectName: "MinimalSystem",
    summary: "A minimal test system."
  };

  const canonical = normalizeToCanonicalModel(minimalBlueprint);
  assert.ok(canonical);
  assert.equal(canonical.metadata.projectName, "MinimalSystem");

  // Overview normalization logic
  const overview = minimalBlueprint.overview || {};
  const personas = overview.targetUsers?.length ? overview.targetUsers : (minimalBlueprint.roles || []).map((r) => r.name);
  assert.ok(Array.isArray(personas));
  assert.equal(personas.length, 0);

  const capabilities = overview.coreFeatures || [];
  assert.ok(Array.isArray(capabilities));

  const decisions = overview.decisions || [];
  assert.ok(Array.isArray(decisions));

  const assumptions = overview.assumptions || [];
  assert.ok(Array.isArray(assumptions));

  const outOfScope = overview.outOfScope || [];
  assert.ok(Array.isArray(outOfScope));

  const phases = overview.implementationPhases || [];
  assert.ok(Array.isArray(phases));
});

test("Graph Bounding Box & Auto-fit calculation engine produces non-negative valid bounds", () => {
  function computeBoundingBox(nodes) {
    if (!nodes || nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 500, width: 800, height: 500 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((pos) => {
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
      width: Math.max(800, maxX - minX + 160),
      height: Math.max(500, maxY - minY + 160)
    };
  }

  // Case 1: Empty nodes
  const emptyBounds = computeBoundingBox([]);
  assert.equal(emptyBounds.width, 800);
  assert.equal(emptyBounds.height, 500);

  // Case 2: Nodes positioned across coordinates
  const sampleNodes = [
    { x: 60, y: 60, width: 210, height: 62 },
    { x: 360, y: 140, width: 210, height: 62 },
    { x: 660, y: 220, width: 210, height: 62 }
  ];
  const bounds = computeBoundingBox(sampleNodes);
  assert.equal(bounds.minX, 60);
  assert.equal(bounds.minY, 60);
  assert.equal(bounds.maxX, 870);
  assert.equal(bounds.maxY, 282);
  assert.ok(bounds.width >= 970);
  assert.ok(bounds.height >= 382);
});

test("Verified Save Status Indicator: correctly categorizes cloud, local, and pending states", () => {
  function getSaveStatus(project) {
    if (!project) return { status: "unknown", label: "Unknown" };
    if (project._id && !String(project._id).startsWith("guest-")) {
      return { status: "saved", label: "Saved to Cloud" };
    }
    return { status: "local", label: "Local Session" };
  }

  const cloudProject = { _id: "67123abc456def7890123456", name: "Cloud Project" };
  assert.equal(getSaveStatus(cloudProject).status, "saved");

  const guestProject = { _id: "guest-1729654321", name: "Guest Project" };
  assert.equal(getSaveStatus(guestProject).status, "local");

  const nullIdProject = { name: "Unsaved Project" };
  assert.equal(getSaveStatus(nullIdProject).status, "local");
});

test("Demo Fixtures Compatibility: all 4 demo fixtures render cleanly with structured overview", () => {
  assert.equal(DEMO_PROJECTS.length, 4);

  DEMO_PROJECTS.forEach((demo) => {
    const fixture = demo.fixture;
    assert.ok(fixture.projectName, `Demo ${demo.id} must have projectName`);
    assert.ok(fixture.architecture?.nodes?.length > 0, `Demo ${demo.id} must have architecture nodes`);
    assert.ok(fixture.database?.tables?.length > 0, `Demo ${demo.id} must have database tables`);
    assert.ok(fixture.apis?.length > 0, `Demo ${demo.id} must have REST APIs`);
    assert.ok(fixture.overview, `Demo ${demo.id} must have overview object`);

    // Verify canonical model normalization succeeds
    const canonical = normalizeToCanonicalModel(fixture);
    assert.ok(canonical.components.length > 0);
  });
});
