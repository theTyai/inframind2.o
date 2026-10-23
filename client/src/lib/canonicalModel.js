/**
 * canonicalModel.js
 * 
 * Defines the Canonical Project Model for InfraMind Control Plane.
 * Normalizes any legacy or generated blueprint into a structured,
 * versioned graph with stable IDs and typed relationships.
 */

export const CANONICAL_SCHEMA_VERSION = "2.0.0";

/**
 * Standard relationship types between canonical artifacts
 */
export const RELATIONSHIP_TYPES = {
  DEPENDS_ON: "depends_on",
  READS: "reads",
  WRITES: "writes",
  EXPOSES: "exposes",
  AUTHORIZES: "authorizes",
  TRIGGERS: "triggers",
  VALIDATES: "validates",
  TESTED_BY: "tested_by",
  IMPLEMENTED_BY: "implemented_by",
  EXECUTES_ON: "executes_on"
};

/**
 * Artifact Types in the Canonical Model
 */
export const ARTIFACT_TYPES = {
  REQUIREMENT: "requirement",
  ACTOR: "actor",
  COMPONENT: "component",
  ENTITY: "entity",
  API: "api",
  WORKFLOW: "workflow",
  TEST: "test",
  FILE: "file"
};

/**
 * Trust boundaries for threat modeling
 */
export const TRUST_BOUNDARIES = {
  PUBLIC_INTERNET: "Public Internet (Untrusted)",
  DMZ_GATEWAY: "DMZ / API Gateway (Perimeter)",
  INTERNAL_SERVICES: "Internal Core Services (Trusted Private Network)",
  SECURE_DATA: "Secure Data Tier (Restricted Storage)",
  EXTERNAL_PROVIDER: "External 3rd-Party Providers"
};

/**
 * Deterministically normalizes any blueprint (legacy or generated)
 * into a complete, validated Canonical Project Model.
 */
export function normalizeToCanonicalModel(blueprint = {}) {
  const normalized = {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    metadata: {
      projectName: blueprint.projectName || blueprint.overview?.projectName || "InfraMind System",
      // Prefer overview.summary (more descriptive) over blueprint.summary
      summary: blueprint.overview?.summary || blueprint.summary || "Full-stack system blueprint.",
      targetPlatform: "MongoDB · Express · React · Node",
      createdAt: blueprint.createdAt || new Date().toISOString(),
      updatedAt: blueprint.updatedAt || new Date().toISOString()
    },
    requirements: [],
    actors: [],
    components: [],
    dependencies: [],
    entities: [],
    apis: [],
    workflows: [],
    threats: [],
    apiFlows: [],
    tests: [],
    scaffold: Array.isArray(blueprint.scaffold) ? blueprint.scaffold : [],
    overview: blueprint.overview || {}
  };

  // 1. Requirements Normalization
  const coreFeatures = blueprint.overview?.coreFeatures || [];
  if (coreFeatures.length > 0) {
    normalized.requirements = coreFeatures.map((feat, idx) => ({
      id: `req-${idx + 1}`,
      type: ARTIFACT_TYPES.REQUIREMENT,
      title: feat.name || `Requirement ${idx + 1}`,
      description: feat.description || feat.name || "",
      priority: feat.priority || "Must have",
      category: "functional",
      status: "approved"
    }));
  } else if (blueprint.overview?.problem) {
    normalized.requirements = [
      {
        id: "req-1",
        type: ARTIFACT_TYPES.REQUIREMENT,
        title: "Core System Objective",
        description: blueprint.overview.problem,
        priority: "Must have",
        category: "functional",
        status: "approved"
      }
    ];
  } else {
    normalized.requirements = [
      {
        id: "req-1",
        type: ARTIFACT_TYPES.REQUIREMENT,
        title: "Core Application Functionality",
        description: blueprint.summary || "Primary application requirements",
        priority: "Must have",
        category: "functional",
        status: "approved"
      }
    ];
  }

  // 2. Actors Normalization
  const rawRoles = blueprint.roles || [];
  if (rawRoles.length > 0) {
    normalized.actors = rawRoles.map((role, idx) => ({
      id: `actor-${idx + 1}`,
      type: ARTIFACT_TYPES.ACTOR,
      name: role.name || `Role ${idx + 1}`,
      purpose: role.purpose || "System participant",
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      restrictions: Array.isArray(role.restrictions) ? role.restrictions : ["Least privilege access"],
      workflows: Array.isArray(role.workflows) ? role.workflows : []
    }));
  } else {
    const targetUsers = blueprint.overview?.targetUsers || ["End User", "Administrator"];
    normalized.actors = targetUsers.map((user, idx) => ({
      id: `actor-${idx + 1}`,
      type: ARTIFACT_TYPES.ACTOR,
      name: user,
      purpose: `Primary user persona: ${user}`,
      permissions: ["Access user dashboard", "Manage own records"],
      restrictions: ["Cannot access unauthorized tenant data"],
      workflows: []
    }));
  }

  // 3. Components Normalization
  const rawNodes = blueprint.architecture?.nodes || [];
  normalized.components = rawNodes.map((node, idx) => {
    const id = node.id || `comp-${idx + 1}`;
    const typeLower = (node.type || "service").toLowerCase();
    
    // Assign architectural tier and trust boundary
    let tier = "service";
    let trustBoundary = TRUST_BOUNDARIES.INTERNAL_SERVICES;

    if (typeLower.includes("front") || typeLower.includes("client") || typeLower.includes("ui") || typeLower.includes("web") || typeLower.includes("mobile")) {
      tier = "frontend";
      trustBoundary = TRUST_BOUNDARIES.PUBLIC_INTERNET;
    } else if (typeLower.includes("gateway") || typeLower.includes("proxy") || typeLower.includes("ingress")) {
      tier = "gateway";
      trustBoundary = TRUST_BOUNDARIES.DMZ_GATEWAY;
    } else if (typeLower.includes("data") || typeLower.includes("mongo") || typeLower.includes("sql") || typeLower.includes("storage") || typeLower.includes("cache") || typeLower.includes("redis")) {
      tier = "database";
      trustBoundary = TRUST_BOUNDARIES.SECURE_DATA;
    } else if (typeLower.includes("queue") || typeLower.includes("kafka") || typeLower.includes("rabbit") || typeLower.includes("worker") || typeLower.includes("job")) {
      tier = "worker";
      trustBoundary = TRUST_BOUNDARIES.INTERNAL_SERVICES;
    } else if (typeLower.includes("external") || typeLower.includes("third") || typeLower.includes("stripe") || typeLower.includes("oauth") || typeLower.includes("mail")) {
      tier = "external";
      trustBoundary = TRUST_BOUNDARIES.EXTERNAL_PROVIDER;
    }

    return {
      id,
      type: ARTIFACT_TYPES.COMPONENT,
      label: node.label || node.name || id,
      componentType: node.type || "service",
      tier,
      trustBoundary,
      description: node.description || `${node.label || id} service component.`
    };
  });

  // 4. Dependencies / Graph Edges Normalization
  const compIdSet = new Set(normalized.components.map(c => c.id));
  const rawEdges = blueprint.architecture?.edges || [];
  let edgeCounter = 1;

  normalized.dependencies = rawEdges
    .filter(e => compIdSet.has(e.from) && compIdSet.has(e.to))
    .map(edge => {
      const label = edge.label || "communicates with";
      let relType = RELATIONSHIP_TYPES.DEPENDS_ON;
      const lower = label.toLowerCase();
      if (lower.includes("read") || lower.includes("query") || lower.includes("fetch")) relType = RELATIONSHIP_TYPES.READS;
      else if (lower.includes("write") || lower.includes("save") || lower.includes("persist")) relType = RELATIONSHIP_TYPES.WRITES;
      else if (lower.includes("auth") || lower.includes("token")) relType = RELATIONSHIP_TYPES.AUTHORIZES;
      else if (lower.includes("trigger") || lower.includes("event") || lower.includes("publish")) relType = RELATIONSHIP_TYPES.TRIGGERS;

      return {
        id: `dep-${edgeCounter++}`,
        source: edge.from,
        target: edge.to,
        type: relType,
        description: edge.label || "Component relationship",
        critical: true
      };
    });

  // 5. Data Entities Normalization
  const rawTables = blueprint.database?.tables || [];
  normalized.entities = rawTables.map((tbl, idx) => {
    const id = `ent-${tbl.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const columns = tbl.columns || [];
    const hasTenantField = columns.some(c => /tenant|org|account|user/i.test(c.name));

    return {
      id,
      type: ARTIFACT_TYPES.ENTITY,
      name: tbl.name,
      description: `MongoDB ${tbl.name} collection`,
      fields: columns.map(c => ({
        name: c.name,
        type: c.type || "String",
        required: !c.nullable,
        isId: !!c.primaryKey,
        foreignKey: c.foreignKey || null
      })),
      tenantScoped: hasTenantField
    };
  });

  // 6. APIs Normalization
  const rawApis = blueprint.apis || [];
  normalized.apis = rawApis.map((api, idx) => {
    const id = `api-${idx + 1}`;
    const path = api.path || "/api";
    const method = (api.method || "GET").toUpperCase();
    
    // Associate with matching entity if name matches path
    const matchingEntity = normalized.entities.find(e => 
      path.toLowerCase().includes(e.name.toLowerCase())
    );

    const isPublic = path.includes("/auth") || path.includes("/public") || path.includes("/health");
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    return {
      id,
      type: ARTIFACT_TYPES.API,
      method,
      path,
      description: api.description || `${method} ${path}`,
      authRequired: !isPublic,
      idempotencyRequired: isMutation && (path.includes("/pay") || path.includes("/order") || path.includes("/checkout")),
      requestBody: api.requestBody || "",
      responseBody: api.responseBody || "",
      statusCodes: api.statusCodes || [200],
      entityRef: matchingEntity ? matchingEntity.id : null
    };
  });

  // Cross-link APIs to Entities & Components in dependencies
  const dbComponent = normalized.components.find(c => c.tier === "database") || normalized.components[0];
  const backendComponent = normalized.components.find(c => c.tier === "service" || c.tier === "gateway") || normalized.components[0];

  normalized.apis.forEach((api, idx) => {
    if (backendComponent) {
      normalized.dependencies.push({
        id: `dep-${edgeCounter++}`,
        source: backendComponent.id,
        target: api.id,
        type: RELATIONSHIP_TYPES.EXPOSES,
        description: `Exposes ${api.method} ${api.path}`,
        critical: false
      });
    }
    if (api.entityRef) {
      normalized.dependencies.push({
        id: `dep-${edgeCounter++}`,
        source: api.id,
        target: api.entityRef,
        type: ["POST", "PUT", "PATCH", "DELETE"].includes(api.method) ? RELATIONSHIP_TYPES.WRITES : RELATIONSHIP_TYPES.READS,
        description: `${api.method} mutates/queries entity`,
        critical: true
      });
    }
  });

  // 7. Workflows Normalization with Executable State Machine States
  const rawWorkflows = blueprint.workflows || [];
  normalized.workflows = rawWorkflows.map((wf, idx) => {
    const id = `wf-${idx + 1}`;
    const steps = Array.isArray(wf.steps) ? wf.steps : ["Initiate", "Execute", "Complete"];
    
    // Build deterministic state-machine states and transitions
    const states = ["draft", "pending_validation", "processing", "completed", "failed"];
    const transitions = [
      { from: "draft", to: "pending_validation", event: "SUBMIT", guard: "Payload conforms to schema", action: "Validate input" },
      { from: "pending_validation", to: "processing", event: "VALIDATE_OK", guard: "Actor authorized", action: "Route to service" },
      { from: "pending_validation", to: "failed", event: "VALIDATE_FAIL", guard: "Invalid schema or unauthorized", action: "Return error response", isFailurePath: true },
      { from: "processing", to: "completed", event: "EXECUTE_SUCCESS", guard: "Persistence committed", action: "Emit event & respond" },
      { from: "processing", to: "failed", event: "EXECUTE_ERROR", guard: "Database timeout or constraint violation", action: "Rollback transaction", isFailurePath: true }
    ];

    const failurePaths = [
      { trigger: "Validation Failure", consequence: "Request rejected with 400 Bad Request", recovery: "Fix invalid fields and resubmit" },
      { trigger: "Authorization Denied", consequence: "403 Forbidden emitted, action logged to audit", recovery: "Request role escalation" },
      { trigger: "Database Timeout", consequence: "504 Gateway Timeout, transaction rolled back", recovery: "Client retries with idempotency key" }
    ];

    return {
      id,
      type: ARTIFACT_TYPES.WORKFLOW,
      name: wf.name || `Workflow ${idx + 1}`,
      actor: wf.actor || (normalized.actors[0]?.name || "User"),
      steps,
      outcome: wf.outcome || "Successful execution of business workflow.",
      states,
      initialState: "draft",
      transitions,
      failurePaths
    };
  });

  // Link Workflows to Actors and Components
  normalized.workflows.forEach(wf => {
    const actorObj = normalized.actors.find(a => a.name.toLowerCase() === wf.actor.toLowerCase()) || normalized.actors[0];
    if (actorObj) {
      normalized.dependencies.push({
        id: `dep-${edgeCounter++}`,
        source: actorObj.id,
        target: wf.id,
        type: RELATIONSHIP_TYPES.TRIGGERS,
        description: `${actorObj.name} triggers ${wf.name}`,
        critical: true
      });
    }
  });

  // 8. Baseline Threat Model Generation (STRIDE + Reliability)
  let threatCounter = 1;
  
  // Threat: Public endpoints without auth
  const unauthApis = normalized.apis.filter(a => !a.authRequired);
  if (unauthApis.length > 0) {
    normalized.threats.push({
      id: `thr-${threatCounter++}`,
      componentId: backendComponent?.id || "comp-gateway",
      category: "Elevation of Privilege",
      strideCategory: "E",
      title: "Publicly accessible endpoint perimeter",
      scenario: `Public routes (${unauthApis.map(a => a.path).slice(0, 3).join(", ")}) expose attack surface to unauthenticated traffic.`,
      preconditions: "Direct internet route exposure without edge WAF or rate limiting.",
      potentialImpact: "Resource exhaustion, credential brute-forcing, or account enumeration.",
      mitigation: "Apply strict IP rate-limiting, CAPTCHA on signup/login, and centralized request validation middleware.",
      verificationApproach: "Automated vulnerability scan + rate limit load testing.",
      status: "mitigated",
      severity: "medium"
    });
  }

  // Threat: Sensitive mutations needing idempotency
  const financialApis = normalized.apis.filter(a => a.idempotencyRequired);
  if (financialApis.length > 0) {
    normalized.threats.push({
      id: `thr-${threatCounter++}`,
      componentId: backendComponent?.id || "comp-service",
      category: "Tampering & Race Conditions",
      strideCategory: "T",
      title: "Duplicate mutation execution on retry",
      scenario: `Payment or order endpoints (${financialApis.map(a => a.path).join(", ")}) called multiple times during network retries.`,
      preconditions: "Client experiences network drop after server commits transaction.",
      potentialImpact: "Double-billing, duplicate order placement, inconsistent inventory.",
      mitigation: "Enforce Idempotency-Key headers backed by Redis deduplication with a 24-hour TTL.",
      verificationApproach: "Integration test simulating concurrent duplicate POST requests with identical Idempotency-Key.",
      status: "open",
      severity: "high"
    });
  }

  // Threat: Cross-tenant data isolation
  const multiTenantEntities = normalized.entities.filter(e => e.tenantScoped);
  if (multiTenantEntities.length > 0) {
    normalized.threats.push({
      id: `thr-${threatCounter++}`,
      componentId: dbComponent?.id || "comp-db",
      category: "Information Disclosure",
      strideCategory: "I",
      title: "Tenant data leakage across organization boundaries",
      scenario: "Missing tenant ID filter in database query allows User A to view User B's organizational data.",
      preconditions: "Developer creates direct query without appending req.user.orgId filter.",
      potentialImpact: "Severe privacy breach and cross-tenant data contamination.",
      mitigation: "Implement Mongoose middleware/plugins to automatically enforce organization scoping on all queries.",
      verificationApproach: "Tenant isolation integration tests attempting cross-tenant ID queries.",
      status: "mitigated",
      severity: "critical"
    });
  }

  // Threat: Data Store Denial of Service
  normalized.threats.push({
    id: `thr-${threatCounter++}`,
    componentId: dbComponent?.id || "comp-db",
    category: "Denial of Service",
    strideCategory: "D",
    title: "Database connection pool exhaustion and unindexed query load",
    scenario: "Unindexed searches across large collections cause high CPU utilization, blocking connection pool.",
    preconditions: "High traffic spike on search or list endpoints without pagination limits.",
    potentialImpact: "Cascading failure bringing down all backend services.",
    mitigation: "Strict pagination caps (max limit 100), compound indexes on sorted fields, connection pool size tuning.",
    verificationApproach: "Query explain-plan assertions in CI pipeline.",
    status: "mitigated",
    severity: "medium"
  });

  // 9. Baseline Tests Linked to Requirements
  normalized.requirements.forEach((req, idx) => {
    normalized.tests.push({
      id: `test-${idx + 1}`,
      requirementId: req.id,
      title: `Verify ${req.title}`,
      type: idx === 0 ? "e2e" : "integration",
      scenario: `Ensure that ${req.description.slice(0, 80)} functions as expected under nominal and boundary conditions.`,
      status: "passed"
    });

    // Link requirement to test in dependencies
    normalized.dependencies.push({
      id: `dep-${edgeCounter++}`,
      source: req.id,
      target: `test-${idx + 1}`,
      type: RELATIONSHIP_TYPES.TESTED_BY,
      description: `Requirement validated by automated test suite`,
      critical: false
    });
  });

  // 10. Default Visual API Flow
  if (normalized.apis.length >= 2) {
    const api1 = normalized.apis[0];
    const api2 = normalized.apis[1];
    normalized.apiFlows = [
      {
        id: "flow-1",
        name: `${api1.method} → ${api2.method} Execution Flow`,
        description: `Sequential test flow demonstrating chained API calls and data propagation.`,
        nodes: [
          { id: "node-start", type: "start", label: "Start Flow", config: {} },
          { id: "node-auth", type: "auth", label: "Acquire JWT Token", config: { authType: "Bearer", tokenVar: "AUTH_TOKEN" } },
          { id: "node-req1", type: "http", label: `${api1.method} ${api1.path}`, config: { method: api1.method, path: api1.path, expectedStatus: 200 } },
          { id: "node-assert", type: "assertion", label: "Assert Status 200 & Extract ID", config: { expression: "response.status === 200", extractVar: "RECORD_ID" } },
          { id: "node-req2", type: "http", label: `${api2.method} ${api2.path}`, config: { method: api2.method, path: api2.path, expectedStatus: 200 } },
          { id: "node-end", type: "end", label: "Flow Completed", config: {} }
        ],
        edges: [
          { from: "node-start", to: "node-auth" },
          { from: "node-auth", to: "node-req1" },
          { from: "node-req1", to: "node-assert" },
          { from: "node-assert", to: "node-req2" },
          { from: "node-req2", to: "node-end" }
        ]
      }
    ];
  }

  return normalized;
}
