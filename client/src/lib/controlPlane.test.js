import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToCanonicalModel } from "./canonicalModel.js";
import { buildGraphIndex, inspectNodeNeighborhood } from "./graphAnalysis.js";
import { runCompilerChecks } from "./consistencyEngine.js";
import { simulateChangeImpact } from "./impactSimulator.js";
import { createWorkflowSimulation, fireWorkflowEvent } from "./workflowSimulator.js";
import { executeApiFlowMock } from "./apiFlowEngine.js";
import { compareCanonicalModels } from "./semanticDiff.js";
import { analyzeRepositoryDrift } from "./repoRealityCheck.js";

const sampleBlueprint = {
  projectName: "ECommerceCore",
  summary: "Multi-tenant e-commerce platform.",
  architecture: {
    nodes: [
      { id: "client-web", label: "Web Storefront", type: "frontend" },
      { id: "api-gw", label: "API Gateway", type: "gateway" },
      { id: "order-service", label: "Order Service", type: "service" },
      { id: "db-mongo", label: "MongoDB Cluster", type: "database" }
    ],
    edges: [
      { from: "client-web", to: "api-gw", label: "HTTPS / REST" },
      { from: "api-gw", to: "order-service", label: "gRPC" },
      { from: "order-service", to: "db-mongo", label: "Mongoose Query" }
    ]
  },
  database: {
    tables: [
      {
        name: "Order",
        columns: [
          { name: "id", type: "ObjectId", primaryKey: true, nullable: false },
          { name: "tenantId", type: "String", primaryKey: false, nullable: false },
          { name: "totalAmount", type: "Number", primaryKey: false, nullable: false }
        ]
      }
    ]
  },
  apis: [
    { method: "POST", path: "/api/orders", description: "Create customer order", requestBody: '{"type":"object"}', responseBody: '{"type":"object"}', statusCodes: [201] },
    { method: "GET", path: "/api/orders", description: "List customer orders", requestBody: "", responseBody: '{"type":"array"}', statusCodes: [200] }
  ],
  roles: [
    { name: "Customer", purpose: "Places orders", permissions: ["create_order", "view_own_orders"] }
  ],
  workflows: [
    { name: "Checkout Flow", actor: "Customer", steps: ["Add to Cart", "Submit Order", "Payment Confirmation"] }
  ],
  scaffold: [
    {
      path: "server/routes/orders.js",
      content: `
        import express from 'express';
        import { requireAuth } from '../middleware/auth.js';
        const router = express.Router();
        router.post('/api/orders', requireAuth, (req, res) => res.json({ id: '123' }));
        export default router;
      `
    }
  ]
};

test("Canonical Model: normalizes legacy blueprint into structured typed graph with stable IDs", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  assert.equal(model.schemaVersion, "2.0.0");
  assert.ok(model.components.length >= 4);
  assert.ok(model.entities.length >= 1);
  assert.ok(model.apis.length >= 2);
  assert.ok(model.threats.length > 0);
  assert.ok(model.workflows[0].transitions.length > 0);
  assert.equal(model.components.find(c => c.id === "client-web").tier, "frontend");
  assert.equal(model.components.find(c => c.id === "db-mongo").tier, "database");
});

test("Graph Analysis: calculates degrees, centrality, and downstream blast radius", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  const graph = buildGraphIndex(model);
  
  assert.ok(graph.nodes.length > 0);
  assert.ok(graph.edges.length > 0);

  const apiGwNode = graph.nodeMap.get("api-gw");
  assert.ok(apiGwNode);
  assert.ok(apiGwNode.blastRadius > 0);

  const neighborhood = inspectNodeNeighborhood(graph, "api-gw");
  assert.ok(neighborhood.transitiveDownstream.length > 0);
});

test("Consistency Engine: validates graph integrity, API uniqueness, and security", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  const findings = runCompilerChecks(model);

  assert.ok(findings.length > 0);
  const uniqueIdFinding = findings.find(f => f.ruleId === "RULE_GRAPH_UNIQUE_IDS");
  assert.equal(uniqueIdFinding.severity, "pass");

  const routeFinding = findings.find(f => f.ruleId === "RULE_API_DUPLICATE_ROUTES");
  assert.equal(routeFinding.severity, "pass");
});

test("Change Impact Simulator: calculates blast radius and catches new risks in proposed patches", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  
  // Propose modifying the Order entity
  const proposal = {
    type: "modify",
    targetId: model.entities[0].id,
    description: "Modify Order entity schema constraints",
    patch: { tenantScoped: false }
  };

  const simulation = simulateChangeImpact(model, proposal);
  assert.ok(simulation.blastRadiusCount >= 1);
  assert.ok(simulation.affectedArtifacts.length >= 1);
  assert.ok(simulation.proposedModel);
});

test("Workflow Simulator: steps through events deterministically and evaluates guards", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  const wf = model.workflows[0];

  let sim = createWorkflowSimulation(wf);
  assert.equal(sim.currentState, "draft");

  sim = fireWorkflowEvent(sim, wf, "SUBMIT");
  assert.equal(sim.currentState, "pending_validation");

  sim = fireWorkflowEvent(sim, wf, "VALIDATE_OK");
  assert.equal(sim.currentState, "processing");

  sim = fireWorkflowEvent(sim, wf, "EXECUTE_SUCCESS");
  assert.equal(sim.currentState, "completed");
  assert.equal(sim.completed, true);
});

test("API Flow Engine: executes mock workflow chain, records assertions and variables", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  const flow = model.apiFlows[0];
  assert.ok(flow);

  const runResult = executeApiFlowMock(flow);
  assert.equal(runResult.success, true);
  assert.ok(runResult.steps.length >= 4);
  assert.ok(runResult.totalDurationMs >= 0);
});

test("Semantic Version Diff: detects added/modified/removed artifacts and generates DDR", () => {
  const modelA = normalizeToCanonicalModel(sampleBlueprint);
  const modelB = structuredClone(modelA);
  
  modelB.apis.push({
    id: "api-new",
    method: "DELETE",
    path: "/api/orders/:id",
    description: "Cancel order"
  });

  const diffResult = compareCanonicalModels(modelA, modelB);
  assert.equal(diffResult.diff.apis.added.length, 1);
  assert.equal(diffResult.diff.apis.added[0].id, "api-new");
  assert.ok(diffResult.ddr.keyChanges.length > 0);
});

test("Repository Reality Check: identifies implemented routes and flags ghost routes", () => {
  const model = normalizeToCanonicalModel(sampleBlueprint);
  const files = sampleBlueprint.scaffold;

  const driftResult = analyzeRepositoryDrift(files, model);
  assert.ok(driftResult.extractedRoutesCount >= 1);
  assert.ok(driftResult.findings.some(f => f.type === "GHOST_BLUEPRINT_ROUTE"));
});
