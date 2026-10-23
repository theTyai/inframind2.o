import test from "node:test";
import assert from "node:assert/strict";
import Revision from "./models/Revision.js";
import { autoRepairBlueprint, PIPELINE_STAGES } from "./services/generationPipeline.js";
import { INFRAMIND_OPENAPI_SPEC } from "./routes/docs.js";

test("Revision model: computes consistent sha256 content hashes", () => {
  const bp1 = { projectName: "TestApp", version: 1 };
  const bp2 = { projectName: "TestApp", version: 1 };
  const bp3 = { projectName: "TestApp", version: 2 };

  const hash1 = Revision.computeHash(bp1);
  const hash2 = Revision.computeHash(bp2);
  const hash3 = Revision.computeHash(bp3);

  assert.equal(hash1, hash2, "Identical blueprints must produce identical content hashes");
  assert.notEqual(hash1, hash3, "Different blueprints must produce distinct content hashes");
  assert.equal(hash1.length, 64, "SHA-256 hash must be 64 hexadecimal characters");
});

test("Pipeline stages: defines all 8 required pipeline steps in order", () => {
  assert.equal(PIPELINE_STAGES.length, 8);
  assert.equal(PIPELINE_STAGES[0].id, "clarify");
  assert.equal(PIPELINE_STAGES[4].id, "compile");
  assert.equal(PIPELINE_STAGES[5].id, "repair");
  assert.equal(PIPELINE_STAGES[7].id, "complete");
});

test("Auto-Repair Engine: repairs orphaned edges pointing to missing nodes", () => {
  const brokenBlueprint = {
    architecture: {
      nodes: [
        { id: "node1", label: "Frontend", type: "frontend" },
        { id: "node2", label: "Backend", type: "backend" }
      ],
      edges: [
        { from: "node1", to: "node2", label: "valid" },
        { from: "node1", to: "ghost_node_99", label: "broken" },
        { from: "non_existent", to: "node2", label: "broken" }
      ]
    },
    apis: [],
    database: { tables: [] }
  };

  const { repairedBlueprint, repairsApplied } = autoRepairBlueprint(brokenBlueprint);

  assert.equal(repairedBlueprint.architecture.edges.length, 1, "Only valid edges should remain");
  assert.equal(repairedBlueprint.architecture.edges[0].from, "node1");
  assert.equal(repairedBlueprint.architecture.edges[0].to, "node2");
  assert.ok(repairsApplied >= 2, "Should record at least 2 pruned edge repairs");
});

test("Auto-Repair Engine: removes duplicate REST route signatures", () => {
  const blueprintWithDuplicates = {
    architecture: { nodes: [], edges: [] },
    apis: [
      { method: "GET", path: "/api/tasks", description: "Get tasks", authRequired: true },
      { method: "GET", path: "/api/tasks", description: "Duplicate", authRequired: false },
      { method: "POST", path: "/api/tasks", description: "Create task", authRequired: true }
    ],
    database: { tables: [] }
  };

  const { repairedBlueprint, repairsApplied } = autoRepairBlueprint(blueprintWithDuplicates);

  assert.equal(repairedBlueprint.apis.length, 2, "Duplicate route must be deduplicated");
  assert.equal(repairsApplied, 1, "One duplicate route repair recorded");
});

test("Auto-Repair Engine: enforces authRequired on sensitive administrative routes", () => {
  const blueprintWithUnauthAdmin = {
    architecture: { nodes: [], edges: [] },
    apis: [
      { method: "GET", path: "/api/public/status", description: "Public health", authRequired: false },
      { method: "DELETE", path: "/api/admin/users/:id", description: "Delete user", authRequired: false }
    ],
    database: { tables: [] }
  };

  const { repairedBlueprint, repairsApplied } = autoRepairBlueprint(blueprintWithUnauthAdmin);

  assert.equal(repairedBlueprint.apis[0].authRequired, false, "Public route remains open");
  assert.equal(repairedBlueprint.apis[1].authRequired, true, "Admin route must have authRequired enforced");
  assert.ok(repairsApplied >= 1);
});

test("OpenAPI Dogfooding: spec documents core endpoints adhering to OpenAPI 3.1.0", () => {
  assert.equal(INFRAMIND_OPENAPI_SPEC.openapi, "3.1.0");
  assert.ok(INFRAMIND_OPENAPI_SPEC.paths["/api/health"]);
  assert.ok(INFRAMIND_OPENAPI_SPEC.paths["/api/projects"]);
  assert.ok(INFRAMIND_OPENAPI_SPEC.paths["/api/projects/{id}/generate-stream"]);
  assert.ok(INFRAMIND_OPENAPI_SPEC.paths["/api/projects/{id}/patch"]);
  assert.ok(INFRAMIND_OPENAPI_SPEC.paths["/api/mock/{projectId}/{path}"]);
});
