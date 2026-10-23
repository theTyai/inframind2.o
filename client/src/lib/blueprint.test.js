import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBlueprint, toOpenApi } from "./blueprint.js";

const sample = {
  projectName: "TestService", summary: "A test API",
  architecture: { nodes: [{ id: "client", label: "Client" }, { id: "api", label: "API" }], edges: [{ from: "client", to: "api", label: "HTTP" }] },
  database: { tables: [{ name: "User", columns: [{ name: "email", type: "String", foreignKey: null }] }] },
  apis: [{ method: "POST", path: "/api/users", description: "Create user", requestBody: '{"type":"object"}', responseBody: '{"type":"object"}', statusCodes: [201] }],
  scaffold: []
};

test("valid blueprint passes core structural checks", () => {
  const checks = analyzeBlueprint(sample);
  assert.equal(checks.find(c => c.title === "Architecture connections").severity, "pass");
  assert.equal(checks.find(c => c.title === "REST route validity").severity, "pass");
});

test("duplicate routes and invalid edges are reported", () => {
  const broken = structuredClone(sample);
  broken.architecture.edges.push({ from: "missing", to: "api", label: "bad" });
  broken.apis.push({ ...broken.apis[0] });
  const checks = analyzeBlueprint(broken);
  assert.equal(checks.find(c => c.title === "Architecture connections").severity, "error");
  assert.equal(checks.find(c => c.title === "REST route validity").severity, "error");
});

test("OpenAPI export includes OpenAPI 3.1 paths and request schema", () => {
  const spec = toOpenApi(sample);
  assert.equal(spec.openapi, "3.1.0");
  assert.equal(spec.paths["/api/users"].post.responses["201"].description, "Successful response");
  assert.equal(spec.paths["/api/users"].post.requestBody.content["application/json"].schema.type, "object");
});
