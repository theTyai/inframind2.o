/**
 * impactSimulator.js
 * 
 * Change Impact Simulation Engine for InfraMind Control Plane.
 * Computes deterministic ripple effects, blast radius, and proposed patches
 * before applying architectural modifications.
 */

import { buildGraphIndex, getTransitiveDownstream } from "./graphAnalysis.js";
import { runCompilerChecks } from "./consistencyEngine.js";

/**
 * Simulates the architectural impact of a proposed change on a canonical project model.
 * 
 * @param {Object} currentModel - The active canonical model
 * @param {Object} changeProposal - { type: "modify"|"add"|"delete", targetId: string, description: string, patch: Object }
 * @returns {Object} Complete simulation result with blast radius, diff, and new findings
 */
export function simulateChangeImpact(currentModel, changeProposal) {
  const currentGraph = buildGraphIndex(currentModel);
  const targetNode = currentGraph.nodeMap.get(changeProposal.targetId);

  // 1. Calculate affected artifacts (Direct + Transitive Downstream)
  const directAffected = new Set();
  const transitiveAffected = new Set();

  if (targetNode) {
    directAffected.add(targetNode.id);
    // Direct neighbors (both upstream callers and downstream dependents)
    targetNode.upstream.forEach(id => directAffected.add(id));
    targetNode.downstream.forEach(id => directAffected.add(id));

    // Full transitive downstream blast radius
    const downstream = getTransitiveDownstream(currentGraph.nodeMap, targetNode.id);
    downstream.forEach(id => transitiveAffected.add(id));
  } else {
    // If it's a general change proposal without an explicit node target,
    // match artifacts by keyword association
    const kw = (changeProposal.description || "").toLowerCase();
    currentGraph.nodes.forEach(node => {
      const label = (node.label || "").toLowerCase();
      if (kw.includes(label) || label.split(/\s+/).some(w => w.length > 3 && kw.includes(w))) {
        directAffected.add(node.id);
        const downstream = getTransitiveDownstream(currentGraph.nodeMap, node.id);
        downstream.forEach(id => transitiveAffected.add(id));
      }
    });
  }

  // 2. Build structured affected artifacts list with reason
  const affectedList = [];
  const allAffectedIds = new Set([...directAffected, ...transitiveAffected]);

  allAffectedIds.forEach(id => {
    const node = currentGraph.nodeMap.get(id);
    if (!node) return;

    let reason = "Transitive dependency in change blast radius";
    let severity = "medium";

    if (id === changeProposal.targetId) {
      reason = "Direct modification target";
      severity = "high";
    } else if (directAffected.has(id)) {
      reason = "Direct neighbor with connected interface or data contract";
      severity = "high";
    }

    affectedList.push({
      id: node.id,
      type: node.type,
      label: node.label,
      severity,
      reason
    });
  });

  // 3. Create proposed patched model
  const proposedModel = structuredClone(currentModel);
  applyPatchToModel(proposedModel, changeProposal);

  // 4. Run compiler checks on both current and proposed models
  const currentFindings = runCompilerChecks(currentModel);
  const proposedFindings = runCompilerChecks(proposedModel);

  // Compare findings to see what was introduced or resolved
  const currentRuleKeys = new Set(currentFindings.filter(f => f.severity !== "pass").map(f => `${f.ruleId}:${f.title}`));
  const introducedFindings = proposedFindings.filter(f => f.severity !== "pass" && !currentRuleKeys.has(`${f.ruleId}:${f.title}`));
  const resolvedFindings = currentFindings.filter(f => f.severity !== "pass" && !proposedFindings.some(pf => pf.severity !== "pass" && `${pf.ruleId}:${pf.title}` === `${f.ruleId}:${f.title}`));

  return {
    proposal: changeProposal,
    targetNode: targetNode ? { id: targetNode.id, type: targetNode.type, label: targetNode.label } : null,
    blastRadiusCount: allAffectedIds.size,
    affectedArtifacts: affectedList,
    introducedFindings,
    resolvedFindings,
    proposedModel,
    summary: {
      directCount: directAffected.size,
      transitiveCount: transitiveAffected.size,
      newRisksCount: introducedFindings.filter(f => f.severity === "error").length,
      newWarningsCount: introducedFindings.filter(f => f.severity === "warning").length,
      resolvedCount: resolvedFindings.length
    }
  };
}

/**
 * Applies a change proposal in-memory to a canonical model
 */
function applyPatchToModel(model, proposal) {
  const { type, targetId, patch = {} } = proposal;

  if (type === "modify") {
    // Check components
    const comp = (model.components || []).find(c => c.id === targetId);
    if (comp) Object.assign(comp, patch);

    // Check entities
    const ent = (model.entities || []).find(e => e.id === targetId);
    if (ent) {
      if (patch.name) ent.name = patch.name;
      if (patch.fields) ent.fields = patch.fields;
      if (patch.tenantScoped !== undefined) ent.tenantScoped = patch.tenantScoped;
    }

    // Check APIs
    const api = (model.apis || []).find(a => a.id === targetId);
    if (api) Object.assign(api, patch);

    // Check requirements
    const req = (model.requirements || []).find(r => r.id === targetId);
    if (req) Object.assign(req, patch);
  } else if (type === "add") {
    if (patch.type === "api") {
      model.apis.push({
        id: `api-${(model.apis?.length || 0) + 1}`,
        method: patch.method || "GET",
        path: patch.path || "/api/new-resource",
        description: patch.description || "New API endpoint",
        authRequired: patch.authRequired !== false,
        requestBody: patch.requestBody || "",
        responseBody: patch.responseBody || "",
        statusCodes: [200]
      });
    } else if (patch.type === "entity") {
      model.entities.push({
        id: `ent-${(patch.name || "new_collection").toLowerCase()}`,
        name: patch.name || "NewCollection",
        description: patch.description || "New data collection",
        fields: patch.fields || [{ name: "id", type: "ObjectId", required: true, isId: true }],
        tenantScoped: !!patch.tenantScoped
      });
    } else if (patch.type === "component") {
      model.components.push({
        id: `comp-${(patch.label || "new_service").toLowerCase().replace(/\s+/g, "-")}`,
        label: patch.label || "New Service",
        componentType: patch.componentType || "service",
        tier: patch.tier || "service",
        trustBoundary: patch.trustBoundary || "Internal Core Services (Trusted Private Network)",
        description: patch.description || "New architecture service"
      });
    }
  } else if (type === "delete") {
    model.components = (model.components || []).filter(c => c.id !== targetId);
    model.entities = (model.entities || []).filter(e => e.id !== targetId);
    model.apis = (model.apis || []).filter(a => a.id !== targetId);
    model.requirements = (model.requirements || []).filter(r => r.id !== targetId);
    model.workflows = (model.workflows || []).filter(w => w.id !== targetId);
    // Clean up dependent edges
    model.dependencies = (model.dependencies || []).filter(
      d => d.source !== targetId && d.target !== targetId
    );
  }

  model.metadata.updatedAt = new Date().toISOString();
}
