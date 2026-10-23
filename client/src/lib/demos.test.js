import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_PROJECTS, getDemoById } from "../data/demoProjects/index.js";
import { analyzeBlueprint, toOpenApi } from "./blueprint.js";

test("all 4 prebuilt demo fixtures exist with required metadata", () => {
  assert.equal(DEMO_PROJECTS.length, 4, "Must contain exactly four demo projects");

  const expectedIds = ["commerceflow", "slotwise", "learnsphere", "pulseboard"];
  const ids = DEMO_PROJECTS.map(d => d.id);
  assert.deepEqual(ids, expectedIds, "Demo IDs must match required specification");

  for (const demo of DEMO_PROJECTS) {
    assert.ok(demo.name, `Demo ${demo.id} must have a name`);
    assert.ok(demo.domain, `Demo ${demo.id} must have a domain`);
    assert.ok(demo.description, `Demo ${demo.id} must have a description`);
    assert.ok(demo.fixture, `Demo ${demo.id} must have a precomputed fixture`);

    // Verify fixture schema version and static demo flag
    assert.equal(demo.fixture._isDemo, true, `Demo ${demo.id} fixture must be marked _isDemo: true`);
    assert.equal(demo.fixture._schemaVersion, 1, `Demo ${demo.id} fixture must have _schemaVersion: 1`);
  }
});

test("demo fixtures contain comprehensive, production-grade technical blueprints", () => {
  for (const demo of DEMO_PROJECTS) {
    const f = demo.fixture;
    assert.ok(f.projectName, `Fixture ${demo.id} must have projectName`);
    assert.ok(f.summary, `Fixture ${demo.id} must have summary`);

    // Architecture
    assert.ok(Array.isArray(f.architecture?.nodes), `Fixture ${demo.id} must have architecture nodes`);
    assert.ok(f.architecture.nodes.length >= 4, `Fixture ${demo.id} nodes should be >= 4`);
    assert.ok(Array.isArray(f.architecture?.edges), `Fixture ${demo.id} must have architecture edges`);

    // Database
    assert.ok(Array.isArray(f.database?.tables), `Fixture ${demo.id} must have database tables`);
    assert.ok(f.database.tables.length >= 3, `Fixture ${demo.id} tables should be >= 3`);

    // APIs
    assert.ok(Array.isArray(f.apis), `Fixture ${demo.id} must have REST endpoints`);
    assert.ok(f.apis.length >= 4, `Fixture ${demo.id} APIs should be >= 4`);

    // Scaffold starter files
    assert.ok(Array.isArray(f.scaffold), `Fixture ${demo.id} must have scaffold files`);
    assert.ok(f.scaffold.length >= 3, `Fixture ${demo.id} scaffold files should be >= 3`);

    // Overview
    assert.ok(f.overview?.problem, `Fixture ${demo.id} must have overview.problem`);
    assert.ok(Array.isArray(f.overview?.targetUsers), `Fixture ${demo.id} must have overview.targetUsers`);
    assert.ok(Array.isArray(f.overview?.coreFeatures), `Fixture ${demo.id} must have overview.coreFeatures`);
  }
});

test("deterministic design checks pass on all 4 prebuilt demo fixtures", () => {
  for (const demo of DEMO_PROJECTS) {
    const checks = analyzeBlueprint(demo.fixture);
    const errors = checks.filter(c => c.severity === "error");
    assert.equal(errors.length, 0, `Demo ${demo.id} should have 0 design check errors, got: ${JSON.stringify(errors)}`);

    const openApi = toOpenApi(demo.fixture);
    assert.equal(openApi.openapi, "3.1.0", `Demo ${demo.id} OpenAPI version must be 3.1.0`);
    assert.ok(Object.keys(openApi.paths).length >= 4, `Demo ${demo.id} OpenAPI should have >= 4 paths`);
  }
});

test("MANDATORY CHECK: exploring and loading all 4 demos triggers ZERO AI or network requests", async () => {
  let aiCallCount = 0;
  const originalFetch = globalThis.fetch;

  // Intercept global fetch to spy on any AI generation calls
  globalThis.fetch = async function (url, options) {
    const urlStr = String(url);
    if (urlStr.includes("/api/generate") || urlStr.includes("openrouter.ai") || urlStr.includes("/api/projects")) {
      aiCallCount++;
    }
    if (originalFetch) return originalFetch.apply(this, arguments);
    return new Response(JSON.stringify({ error: "Intercepted" }), { status: 500 });
  };

  try {
    // Simulate user browsing and switching through all four demo projects
    for (const id of ["commerceflow", "slotwise", "learnsphere", "pulseboard"]) {
      const demo = getDemoById(id);
      assert.ok(demo, `Demo ${id} must be retrievable`);

      // Accessing fixture data, running checks, exporting OpenAPI
      const fixture = demo.fixture;
      const _checks = analyzeBlueprint(fixture);
      const _openApi = toOpenApi(fixture);

      // Verify that all data was in-memory static JSON
      assert.ok(fixture.projectName.length > 0);
      assert.ok(fixture.architecture.nodes.length > 0);
    }

    // Assert that ZERO AI or network requests were fired
    assert.equal(aiCallCount, 0, "Navigating all 4 prebuilt demos must trigger exactly 0 AI API requests");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
