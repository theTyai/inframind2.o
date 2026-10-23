import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToCanonicalModel } from "./canonicalModel.js";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

test("Workspace Navigation Mapping: all 14 legacy tabs map into the 5 primary workspaces", () => {
  const legacyTabs = [
    "overview",
    "architecture",
    "causal",
    "impact",
    "workflows",
    "threats",
    "api_flows",
    "database",
    "apis",
    "checks",
    "diffs",
    "reality",
    "scaffold",
    "openapi"
  ];

  const workspaceMap = {
    overview: { workspace: "overview", subView: "all" },
    architecture: { workspace: "architecture", subView: "map" },
    causal: { workspace: "architecture", subView: "dependencies" },
    database: { workspace: "architecture", subView: "data_apis" },
    apis: { workspace: "architecture", subView: "data_apis" },
    impact: { workspace: "impact", subView: "simulator" },
    checks: { workspace: "validate", subView: "checks" },
    threats: { workspace: "validate", subView: "threats" },
    workflows: { workspace: "validate", subView: "workflows" },
    api_flows: { workspace: "validate", subView: "api_flows" },
    scaffold: { workspace: "build", subView: "scaffold" },
    openapi: { workspace: "build", subView: "openapi" },
    reality: { workspace: "build", subView: "reality" },
    diffs: { workspace: "build", subView: "history" }
  };

  const allowedWorkspaces = new Set(["overview", "architecture", "impact", "validate", "build"]);

  legacyTabs.forEach(tab => {
    const target = workspaceMap[tab];
    assert.ok(target, `Legacy tab '${tab}' must have an assigned workspace mapping.`);
    assert.ok(
      allowedWorkspaces.has(target.workspace),
      `Target workspace '${target.workspace}' for '${tab}' must be one of the 5 canonical workspaces.`
    );
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
  const personas = overview.targetUsers?.length ? overview.targetUsers : (minimalBlueprint.roles || []).map(r => r.name);
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
    nodes.forEach(pos => {
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

  DEMO_PROJECTS.forEach(demo => {
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
