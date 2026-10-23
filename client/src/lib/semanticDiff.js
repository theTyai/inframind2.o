/**
 * semanticDiff.js
 * 
 * Semantic Version Comparison Engine for InfraMind Control Plane.
 * Compares two canonical models across stable IDs to produce
 * a structured diff and an automated Design Decision Record (DDR).
 */

export function compareCanonicalModels(baseModel, targetModel) {
  const diff = {
    components: compareCollection(baseModel?.components || [], targetModel?.components || [], "id", "label"),
    entities: compareCollection(baseModel?.entities || [], targetModel?.entities || [], "id", "name"),
    apis: compareCollection(
      baseModel?.apis || [],
      targetModel?.apis || [],
      "id",
      item => `${item.method} ${item.path}`
    ),
    requirements: compareCollection(baseModel?.requirements || [], targetModel?.requirements || [], "id", "title"),
    workflows: compareCollection(baseModel?.workflows || [], targetModel?.workflows || [], "id", "name"),
    dependencies: compareCollection(
      baseModel?.dependencies || [],
      targetModel?.dependencies || [],
      "id",
      item => `${item.source} → ${item.target} (${item.type})`
    )
  };

  const totalAdded = Object.values(diff).reduce((acc, cat) => acc + cat.added.length, 0);
  const totalRemoved = Object.values(diff).reduce((acc, cat) => acc + cat.removed.length, 0);
  const totalModified = Object.values(diff).reduce((acc, cat) => acc + cat.modified.length, 0);

  // Generate automated Design Decision Record (DDR)
  const ddr = {
    title: `Architectural Revision Diff: ${baseModel?.metadata?.projectName || "Base"} → ${targetModel?.metadata?.projectName || "Target"}`,
    timestamp: new Date().toISOString(),
    executiveSummary: `This revision introduces ${totalAdded} new artifact(s), modifies ${totalModified} existing definition(s), and decommissions ${totalRemoved} item(s).`,
    keyChanges: [
      diff.components.added.length > 0 && `Added ${diff.components.added.length} architecture service(s): ${diff.components.added.map(c => c.label).join(", ")}`,
      diff.entities.added.length > 0 && `Introduced ${diff.entities.added.length} new MongoDB collection(s): ${diff.entities.added.map(e => e.name).join(", ")}`,
      diff.apis.added.length > 0 && `Added ${diff.apis.added.length} new REST route(s): ${diff.apis.added.map(a => `${a.method} ${a.path}`).join(", ")}`,
      diff.apis.removed.length > 0 && `Decommissioned ${diff.apis.removed.length} route(s): ${diff.apis.removed.map(a => `${a.method} ${a.path}`).join(", ")}`
    ].filter(Boolean),
    tradeoffs: [
      "Extending domain scope increases overall maintenance and test surface.",
      "New network dependencies require strict circuit breakers and timeout policies."
    ]
  };

  return {
    diff,
    ddr,
    stats: {
      added: totalAdded,
      removed: totalRemoved,
      modified: totalModified
    }
  };
}

function compareCollection(baseItems, targetItems, idKey, labelFn) {
  const baseMap = new Map(baseItems.map(item => [item[idKey], item]));
  const targetMap = new Map(targetItems.map(item => [item[idKey], item]));

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  targetItems.forEach(targetItem => {
    const id = targetItem[idKey];
    const baseItem = baseMap.get(id);
    const label = typeof labelFn === "function" ? labelFn(targetItem) : targetItem[labelFn];

    if (!baseItem) {
      added.push({ id, label, item: targetItem });
    } else {
      // Check for deep equality difference
      const baseStr = JSON.stringify(baseItem);
      const targetStr = JSON.stringify(targetItem);
      if (baseStr !== targetStr) {
        modified.push({ id, label, base: baseItem, target: targetItem });
      } else {
        unchanged.push({ id, label, item: targetItem });
      }
    }
  });

  baseItems.forEach(baseItem => {
    const id = baseItem[idKey];
    if (!targetMap.has(id)) {
      const label = typeof labelFn === "function" ? labelFn(baseItem) : baseItem[labelFn];
      removed.push({ id, label, item: baseItem });
    }
  });

  return { added, removed, modified, unchanged };
}
