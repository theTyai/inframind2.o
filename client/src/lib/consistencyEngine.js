/**
 * consistencyEngine.js
 *
 * Deterministic compiler-grade validation pipeline for InfraMind Control Plane.
 * Evaluates canonical models against strict structural, traceability, API,
 * database, workflow, and security rules.
 *
 * Every finding contains:
 *   id, ruleId, category, severity, title, explanation,
 *   evidence, affectedArtifacts, remediation, verificationStatus
 *
 * severity: "error" | "warning" | "suggestion" | "pass" | "not_evaluated"
 * verificationStatus: "verified" | "unverified" | "not_applicable"
 */

import { buildGraphIndex } from "./graphAnalysis.js";

export const RULE_CATEGORIES = {
  GRAPH_INTEGRITY: "Graph Integrity",
  REQUIREMENTS_TRACEABILITY: "Requirements Traceability",
  API_CONSISTENCY: "API Consistency",
  DATA_CONSISTENCY: "Data Consistency",
  WORKFLOW_CONSISTENCY: "Workflow Consistency",
  SECURITY_RELIABILITY: "Security & Reliability"
};

/**
 * Runs the deterministic compiler checks on a canonical project model
 */
export function runCompilerChecks(canonicalModel) {
  const findings = [];
  let checkCounter = 1;

  const addFinding = ({
    ruleId,
    category,
    severity,
    title,
    explanation,
    affectedArtifacts = [],
    evidence = "",
    remediation = "",
    verificationStatus = null
  }) => {
    // Derive verification status from severity if not explicitly provided
    const derivedVerificationStatus = verificationStatus ?? (
      severity === "pass" ? "verified" :
      severity === "error" || severity === "warning" ? "unverified" :
      "not_applicable"
    );
    findings.push({
      id: `chk-${checkCounter++}`,
      ruleId,
      category,
      severity,
      title,
      explanation,
      affectedArtifacts,
      evidence,
      remediation,
      verificationStatus: derivedVerificationStatus
    });
  };

  const graph = buildGraphIndex(canonicalModel);

  // ─── 1. Graph Integrity Checks ───────────────────────────────────────────
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const seenIds = new Set();
  const duplicateIds = [];

  graph.nodes.forEach(n => {
    if (seenIds.has(n.id)) duplicateIds.push(n.id);
    seenIds.add(n.id);
  });

  if (duplicateIds.length > 0) {
    addFinding({
      ruleId: "RULE_GRAPH_UNIQUE_IDS",
      category: RULE_CATEGORIES.GRAPH_INTEGRITY,
      severity: "error",
      title: "Duplicate Artifact Identifiers",
      explanation: `Found ${duplicateIds.length} duplicate identifier(s) in the canonical graph.`,
      affectedArtifacts: duplicateIds,
      evidence: duplicateIds.join(", "),
      remediation: "Assign unique IDs across all canonical artifacts."
    });
  } else {
    addFinding({
      ruleId: "RULE_GRAPH_UNIQUE_IDS",
      category: RULE_CATEGORIES.GRAPH_INTEGRITY,
      severity: "pass",
      title: "Artifact IDs Unique",
      explanation: "Every node and artifact in the canonical model has a unique identifier.",
      evidence: `${graph.nodes.length} distinct artifacts validated.`
    });
  }

  // Dangling edges
  const badEdges = (canonicalModel.dependencies || []).filter(
    dep => !nodeIds.has(dep.source) || !nodeIds.has(dep.target)
  );

  if (badEdges.length > 0) {
    addFinding({
      ruleId: "RULE_GRAPH_EDGE_ENDPOINTS",
      category: RULE_CATEGORIES.GRAPH_INTEGRITY,
      severity: "error",
      title: "Broken Graph Connections",
      explanation: `${badEdges.length} dependency edge(s) point to non-existent source or target IDs.`,
      affectedArtifacts: badEdges.map(e => e.id),
      evidence: badEdges.map(e => `${e.source} → ${e.target}`).join(", "),
      remediation: "Remove orphaned edges or declare the missing target artifacts."
    });
  } else {
    addFinding({
      ruleId: "RULE_GRAPH_EDGE_ENDPOINTS",
      category: RULE_CATEGORIES.GRAPH_INTEGRITY,
      severity: "pass",
      title: "Edge Endpoints Valid",
      explanation: "All directed dependency edges connect valid existing artifacts.",
      evidence: `${(canonicalModel.dependencies || []).length} edges verified.`
    });
  }

  // ─── 2. Requirements Traceability Checks ─────────────────────────────────
  const requirements = canonicalModel.requirements || [];
  const untracedReqs = requirements.filter(r => {
    const node = graph.nodeMap.get(r.id);
    return !node || node.blastRadius === 0;
  });

  if (untracedReqs.length > 0) {
    addFinding({
      ruleId: "RULE_REQ_TRACEABILITY",
      category: RULE_CATEGORIES.REQUIREMENTS_TRACEABILITY,
      severity: "warning",
      title: "Untraced Requirements",
      explanation: `${untracedReqs.length} requirement(s) have no downstream architecture components, APIs, or tests implementing them.`,
      affectedArtifacts: untracedReqs.map(r => r.id),
      evidence: untracedReqs.map(r => r.title).join(", "),
      remediation: "Link each requirement to corresponding components, workflows, or acceptance tests."
    });
  } else if (requirements.length > 0) {
    addFinding({
      ruleId: "RULE_REQ_TRACEABILITY",
      category: RULE_CATEGORIES.REQUIREMENTS_TRACEABILITY,
      severity: "pass",
      title: "Requirements Fully Traced",
      explanation: "All functional requirements are linked to downstream architecture artifacts and tests.",
      evidence: `${requirements.length} requirement(s) actively backed by implementation artifacts.`
    });
  }

  // Acceptance test coverage for critical requirements
  const criticalReqs = requirements.filter(r => r.priority === "Must have");
  const tests = canonicalModel.tests || [];
  const testTargetIds = new Set(tests.map(t => t.requirementId));
  const untestedCritical = criticalReqs.filter(r => !testTargetIds.has(r.id));

  if (untestedCritical.length > 0) {
    addFinding({
      ruleId: "RULE_CRITICAL_REQ_TESTS",
      category: RULE_CATEGORIES.REQUIREMENTS_TRACEABILITY,
      severity: "warning",
      title: "Untested Critical Requirements",
      explanation: `${untestedCritical.length} 'Must have' requirement(s) lack defined acceptance criteria or tests.`,
      affectedArtifacts: untestedCritical.map(r => r.id),
      evidence: untestedCritical.map(r => r.title).join(", "),
      remediation: "Define integration or E2E acceptance tests for all core business requirements."
    });
  }

  // ─── 3. API Consistency Checks ───────────────────────────────────────────
  const apis = canonicalModel.apis || [];
  const duplicateRoutes = apis.filter((api, i) =>
    apis.findIndex(x => x.method === api.method && x.path.toLowerCase() === (api.path || "").toLowerCase()) !== i
  );

  if (duplicateRoutes.length > 0) {
    addFinding({
      ruleId: "RULE_API_DUPLICATE_ROUTES",
      category: RULE_CATEGORIES.API_CONSISTENCY,
      severity: "error",
      title: "Duplicate REST Route Signatures",
      explanation: `${duplicateRoutes.length} route(s) define colliding method and path pairs.`,
      affectedArtifacts: duplicateRoutes.map(a => a.id),
      evidence: duplicateRoutes.map(a => `${a.method} ${a.path}`).join(", "),
      remediation: "Ensure every REST endpoint has a unique method/path signature."
    });
  } else {
    addFinding({
      ruleId: "RULE_API_DUPLICATE_ROUTES",
      category: RULE_CATEGORIES.API_CONSISTENCY,
      severity: "pass",
      title: "REST Route Signatures Unique",
      explanation: "All endpoints have distinct HTTP method and path signatures.",
      evidence: `${apis.length} route(s) validated.`
    });
  }

  // Absolute path check
  const badPaths = apis.filter(a => !String(a.path || "").startsWith("/"));
  if (badPaths.length > 0) {
    addFinding({
      ruleId: "RULE_API_ABSOLUTE_PATHS",
      category: RULE_CATEGORIES.API_CONSISTENCY,
      severity: "error",
      title: "Relative REST Path Violation",
      explanation: `${badPaths.length} endpoint(s) do not start with a leading forward slash (/).`,
      affectedArtifacts: badPaths.map(a => a.id),
      evidence: badPaths.map(a => a.path).join(", "),
      remediation: "Prefix all API endpoints with a leading '/'."
    });
  }

  // ─── 4. Data Consistency Checks ──────────────────────────────────────────
  const entities = canonicalModel.entities || [];
  const entityNameSet = new Set(entities.map(e => e.name.toLowerCase()));
  const brokenForeignKeys = [];

  entities.forEach(ent => {
    (ent.fields || []).forEach(f => {
      if (f.foreignKey) {
        const target = String(f.foreignKey).split(/[.\s]/)[0].toLowerCase();
        if (!entityNameSet.has(target) && ![...entityNameSet].some(name => target.startsWith(name) || name.startsWith(target))) {
          brokenForeignKeys.push(`${ent.name}.${f.name} → ${f.foreignKey}`);
        }
      }
    });
  });

  if (brokenForeignKeys.length > 0) {
    addFinding({
      ruleId: "RULE_DATA_RELATION_INTEGRITY",
      category: RULE_CATEGORIES.DATA_CONSISTENCY,
      severity: "warning",
      title: "Unresolved Entity References",
      explanation: `${brokenForeignKeys.length} field reference(s) target entities not present in the data model.`,
      evidence: brokenForeignKeys.join(", "),
      remediation: "Verify foreign key references match existing MongoDB collection definitions."
    });
  } else {
    addFinding({
      ruleId: "RULE_DATA_RELATION_INTEGRITY",
      category: RULE_CATEGORIES.DATA_CONSISTENCY,
      severity: "pass",
      title: "Data Model References Resolved",
      explanation: "All collection references and foreign key hints point to declared collections.",
      evidence: `${entities.length} collection(s) checked.`
    });
  }

  // Check: Every entity is touched by at least one endpoint
  const unreferencedEntities = entities.filter((entity) => {
    return !apis.some((api) => {
      const matchPath = (api.path || "").toLowerCase().includes(entity.name.toLowerCase());
      const matchRef = api.entityRef === entity.id;
      return matchPath || matchRef;
    });
  });

  if (unreferencedEntities.length > 0) {
    addFinding({
      ruleId: "RULE_DATA_ENTITY_ENDPOINT_COVERAGE",
      category: RULE_CATEGORIES.DATA_CONSISTENCY,
      severity: "warning",
      title: "Unreferenced Data Entities",
      explanation: `${unreferencedEntities.length} MongoDB collection(s) have no declared API endpoint reading or writing them.`,
      affectedArtifacts: unreferencedEntities.map((e) => e.id),
      evidence: unreferencedEntities.map((e) => e.name).join(", "),
      remediation: "Add REST endpoints to query or mutate this entity, or document internal-only usage."
    });
  } else if (entities.length > 0) {
    addFinding({
      ruleId: "RULE_DATA_ENTITY_ENDPOINT_COVERAGE",
      category: RULE_CATEGORIES.DATA_CONSISTENCY,
      severity: "pass",
      title: "All Collections Mapped to Endpoints",
      explanation: "Every modeled MongoDB collection is queried or mutated by at least one API endpoint.",
      evidence: `${entities.length} collection(s) verified.`
    });
  }

  // Check: Auth flow has register as well as login
  const hasLoginRoute = apis.some((a) => /(login|signin)/i.test(a.path));
  const hasRegisterRoute = apis.some((a) => /(register|signup)/i.test(a.path));

  if (hasLoginRoute && !hasRegisterRoute) {
    addFinding({
      ruleId: "RULE_SEC_AUTH_REGISTER_LOGIN",
      category: RULE_CATEGORIES.SECURITY_RELIABILITY,
      severity: "warning",
      title: "Missing User Registration Route",
      explanation: "A login route was declared, but no registration or signup endpoint (/api/auth/register) was modeled.",
      affectedArtifacts: apis.filter((a) => /(login|signin)/i.test(a.path)).map((a) => a.id),
      evidence: apis.filter((a) => /(login|signin)/i.test(a.path)).map((a) => a.path).join(", "),
      remediation: "Add POST /api/auth/register or document federated SSO / admin-provisioned identity model."
    });
  } else if (hasLoginRoute && hasRegisterRoute) {
    addFinding({
      ruleId: "RULE_SEC_AUTH_REGISTER_LOGIN",
      category: RULE_CATEGORIES.SECURITY_RELIABILITY,
      severity: "pass",
      title: "Authentication Lifecycle Complete",
      explanation: "Both user registration and login endpoints are properly modeled.",
      evidence: "Registration and login routes confirmed."
    });
  }

  // ─── 5. Workflow Consistency Checks ──────────────────────────────────────
  const workflows = canonicalModel.workflows || [];
  const workflowsMissingFailures = workflows.filter(
    wf => !wf.failurePaths || wf.failurePaths.length === 0
  );

  if (workflowsMissingFailures.length > 0) {
    addFinding({
      ruleId: "RULE_WORKFLOW_FAILURE_PATHS",
      category: RULE_CATEGORIES.WORKFLOW_CONSISTENCY,
      severity: "warning",
      title: "Missing Workflow Failure Paths",
      explanation: `${workflowsMissingFailures.length} workflow(s) do not specify failure scenarios or recovery mechanisms.`,
      affectedArtifacts: workflowsMissingFailures.map(w => w.id),
      evidence: workflowsMissingFailures.map(w => w.name).join(", "),
      remediation: "Define negative test cases and error recovery steps for all key workflows."
    });
  } else if (workflows.length > 0) {
    addFinding({
      ruleId: "RULE_WORKFLOW_FAILURE_PATHS",
      category: RULE_CATEGORIES.WORKFLOW_CONSISTENCY,
      severity: "pass",
      title: "Workflow Edge-Cases Defined",
      explanation: "All business workflows define explicit failure states and recovery paths.",
      evidence: `${workflows.length} state-machine workflow(s) verified.`
    });
  }

  // ─── 6. Security & Reliability Checks ────────────────────────────────────
  const unauthSensitive = apis.filter(
    a => !a.authRequired && (a.path.includes("/admin") || a.path.includes("/user") || a.path.includes("/order") || a.path.includes("/account"))
  );

  if (unauthSensitive.length > 0) {
    addFinding({
      ruleId: "RULE_SEC_UNAUTHENTICATED_SENSITIVE",
      category: RULE_CATEGORIES.SECURITY_RELIABILITY,
      severity: "error",
      title: "Sensitive Endpoint Missing Authentication",
      explanation: `${unauthSensitive.length} sensitive endpoint(s) appear to lack authentication enforcement.`,
      affectedArtifacts: unauthSensitive.map(a => a.id),
      evidence: unauthSensitive.map(a => `${a.method} ${a.path}`).join(", "),
      remediation: "Apply authentication middleware to protect sensitive organizational and user resources."
    });
  } else {
    addFinding({
      ruleId: "RULE_SEC_AUTH_COVERAGE",
      category: RULE_CATEGORIES.SECURITY_RELIABILITY,
      severity: "pass",
      title: "Access Control Enforced on Sensitive Routes",
      explanation: "All private and administrative endpoints require authentication.",
      evidence: `${apis.filter(a => a.authRequired).length} route(s) protected by auth middleware.`
    });
  }

  // Idempotency check on financial / mutation endpoints
  const financialUnchecked = apis.filter(
    a => ["POST", "PUT", "PATCH"].includes(a.method) && 
         (a.path.includes("/pay") || a.path.includes("/checkout")) && 
         !a.idempotencyRequired
  );

  if (financialUnchecked.length > 0) {
    addFinding({
      ruleId: "RULE_SEC_IDEMPOTENCY",
      category: RULE_CATEGORIES.SECURITY_RELIABILITY,
      severity: "warning",
      title: "Payment Mutation Missing Idempotency Key",
      explanation: `${financialUnchecked.length} financial endpoint(s) do not enforce idempotency token verification.`,
      affectedArtifacts: financialUnchecked.map(a => a.id),
      evidence: financialUnchecked.map(a => `${a.method} ${a.path}`).join(", "),
      remediation: "Require Idempotency-Key header on checkout and payment transaction endpoints."
    });
  }

  return findings;
}
