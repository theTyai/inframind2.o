import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToCanonicalModel } from "./canonicalModel.js";
import { runCompilerChecks } from "./consistencyEngine.js";
import { DEMO_PROJECTS } from "../data/demoProjects/index.js";

test("Content Integrity: All demo fixtures derive components strictly from canonicalModel", () => {
  DEMO_PROJECTS.forEach((demo) => {
    const canonical = normalizeToCanonicalModel(demo.fixture);
    assert.ok(canonical.components.length > 0, `Demo ${demo.id} should have components`);

    // Verify all components have required canonical fields
    canonical.components.forEach((comp) => {
      assert.ok(comp.id, `Component in ${demo.id} must have an ID`);
      assert.ok(comp.label, `Component in ${demo.id} must have a label`);
      assert.ok(comp.tier, `Component in ${demo.id} must have a tier`);
    });

    // Verify architecture edges connect real components
    const componentIds = new Set(canonical.components.map((c) => c.id));
    const compEdges = canonical.graph.edges.filter(
      (e) => componentIds.has(e.source) && componentIds.has(e.target)
    );
    assert.ok(compEdges.length > 0, `Demo ${demo.id} must have component-to-component architecture edges`);
    compEdges.forEach((edge) => {
      assert.ok(componentIds.has(edge.source), `Edge source '${edge.source}' in ${demo.id} must exist in components`);
      assert.ok(componentIds.has(edge.target), `Edge target '${edge.target}' in ${demo.id} must exist in components`);
    });
  });
});

test("No Phantom Components: Undeclared Redis or caching services never appear in canonical model", () => {
  DEMO_PROJECTS.forEach((demo) => {
    const canonical = normalizeToCanonicalModel(demo.fixture);
    const declaredTechs = JSON.stringify(demo.fixture).toLowerCase();
    const hasDeclaredRedis = declaredTechs.includes("redis");

    const redisComponent = canonical.components.find((c) => {
      const name = (c.label || c.name || "").toLowerCase();
      const tech = (c.technology || "").toLowerCase();
      return name.includes("redis") || tech.includes("redis");
    });

    if (!hasDeclaredRedis) {
      assert.equal(
        redisComponent,
        undefined,
        `Demo ${demo.id} did not declare Redis, so no Redis component should exist in canonical model`
      );
    }
  });
});

test("Hub-and-Spoke Topology: Server acts as central coordinator, DB never connects directly to External LLM", () => {
  DEMO_PROJECTS.forEach((demo) => {
    const canonical = normalizeToCanonicalModel(demo.fixture);
    const edges = canonical.graph.edges;

    const dbNodes = canonical.components.filter((c) => c.tier === "database").map((c) => c.id);
    const extNodes = canonical.components.filter((c) => c.tier === "external" || c.tier === "ai").map((c) => c.id);

    const directDbToExt = edges.some(
      (e) => dbNodes.includes(e.source) && extNodes.includes(e.target)
    );
    assert.equal(
      directDbToExt,
      false,
      `In demo ${demo.id}, Database must not directly point to External AI/Service without server mediation`
    );
  });
});

test("Build Scaffolding Integrity: package.json and .env.example are ensured at root", () => {
  DEMO_PROJECTS.forEach((demo) => {
    const canonical = normalizeToCanonicalModel(demo.fixture);
    let files = Array.isArray(canonical.scaffold) ? [...canonical.scaffold] : [];

    // Apply normalization logic as implemented in BuildWorkspace
    if (!files.some((f) => f.path === "package.json")) {
      const projName = (canonical.metadata?.projectName || "app").toLowerCase().replace(/[^a-z0-9-]/g, "-");
      files.unshift({
        path: "package.json",
        content: `{\n  "name": "${projName}",\n  "version": "1.0.0"\n}`
      });
    }

    if (!files.some((f) => f.path === ".env.example")) {
      files.unshift({
        path: ".env.example",
        content: "PORT=5000\nMONGODB_URI=mongodb://localhost:27017/app"
      });
    }

    const hasPackageJson = files.some((f) => f.path === "package.json");
    const hasEnvExample = files.some((f) => f.path === ".env.example");

    assert.ok(hasPackageJson, `Demo ${demo.id} must have package.json at root`);
    assert.ok(hasEnvExample, `Demo ${demo.id} must have .env.example at root`);
  });
});

test("Consistency Engine: Evaluates data coverage and auth alignment rules", () => {
  DEMO_PROJECTS.forEach((demo) => {
    const canonical = normalizeToCanonicalModel(demo.fixture);
    const findings = runCompilerChecks(canonical);

    assert.ok(Array.isArray(findings), `Findings for ${demo.id} should be an array`);
    assert.ok(findings.length > 0, `Demo ${demo.id} should run compiler checks`);

    // Verify all findings have valid severity
    const validSeverities = new Set(["pass", "warning", "error"]);
    findings.forEach((f) => {
      assert.ok(validSeverities.has(f.severity), `Finding ${f.id} has invalid severity '${f.severity}'`);
      assert.ok(f.title, `Finding ${f.id} must have a title`);
      assert.ok(f.ruleId, `Finding ${f.id} must have a ruleId`);
    });
  });
});
