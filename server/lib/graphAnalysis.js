/**
 * graphAnalysis.js
 * 
 * Graph traversal, metric calculation, and impact blast-radius algorithms
 * for the InfraMind Causal Dependency Graph.
 */

/**
 * Builds an indexed adjacency list graph representation from a canonical model
 */
export function buildGraphIndex(canonicalModel) {
  const nodes = [];
  const nodeMap = new Map();

  // Combine all artifacts into unified graph nodes
  const addNode = (id, type, label, data = {}) => {
    if (!id || nodeMap.has(id)) return;
    const node = {
      id,
      type,
      label: label || id,
      data,
      inDegree: 0,
      outDegree: 0,
      upstream: new Set(),
      downstream: new Set()
    };
    nodeMap.set(id, node);
    nodes.push(node);
  };

  (canonicalModel.requirements || []).forEach(r => addNode(r.id, "requirement", r.title, r));
  (canonicalModel.actors || []).forEach(a => addNode(a.id, "actor", a.name, a));
  (canonicalModel.components || []).forEach(c => addNode(c.id, "component", c.label, c));
  (canonicalModel.entities || []).forEach(e => addNode(e.id, "entity", e.name, e));
  (canonicalModel.apis || []).forEach(a => addNode(a.id, "api", `${a.method} ${a.path}`, a));
  (canonicalModel.workflows || []).forEach(w => addNode(w.id, "workflow", w.name, w));
  (canonicalModel.tests || []).forEach(t => addNode(t.id, "test", t.title, t));

  const edges = [];

  // Populate edges and connectivity
  (canonicalModel.dependencies || []).forEach(dep => {
    const sourceNode = nodeMap.get(dep.source);
    const targetNode = nodeMap.get(dep.target);

    if (sourceNode && targetNode) {
      edges.push({
        id: dep.id,
        source: dep.source,
        target: dep.target,
        type: dep.type || "depends_on",
        description: dep.description || "",
        critical: !!dep.critical
      });

      sourceNode.outDegree++;
      sourceNode.downstream.add(dep.target);

      targetNode.inDegree++;
      targetNode.upstream.add(dep.source);
    }
  });

  // Calculate dependency centrality & blast radius for each node
  const totalNodes = nodes.length || 1;

  nodes.forEach(node => {
    // Degree centrality: fraction of nodes connected to this node
    node.centrality = Number(((node.inDegree + node.outDegree) / totalNodes).toFixed(3));
    
    // Blast radius: full transitive downstream reach
    const downstreamTransitive = getTransitiveDownstream(nodeMap, node.id);
    node.blastRadius = downstreamTransitive.size;
    node.blastRadiusIds = Array.from(downstreamTransitive);

    // Upstream dependencies: full transitive upstream reach
    const upstreamTransitive = getTransitiveUpstream(nodeMap, node.id);
    node.upstreamCount = upstreamTransitive.size;
    node.upstreamIds = Array.from(upstreamTransitive);
  });

  return {
    nodes,
    edges,
    nodeMap,
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      hotspots: nodes
        .filter(n => n.blastRadius >= 2 || n.centrality > 0.15)
        .sort((a, b) => b.blastRadius - a.blastRadius)
        .slice(0, 5)
    }
  };
}

/**
 * Calculates the transitive downstream blast radius using Breadth-First Search (BFS)
 */
export function getTransitiveDownstream(nodeMap, startNodeId) {
  const visited = new Set();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const current = nodeMap.get(currentId);
    if (!current) continue;

    for (const downstreamId of current.downstream) {
      if (!visited.has(downstreamId) && downstreamId !== startNodeId) {
        visited.add(downstreamId);
        queue.push(downstreamId);
      }
    }
  }

  return visited;
}

/**
 * Calculates the transitive upstream dependencies using Breadth-First Search (BFS)
 */
export function getTransitiveUpstream(nodeMap, startNodeId) {
  const visited = new Set();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const current = nodeMap.get(currentId);
    if (!current) continue;

    for (const upstreamId of current.upstream) {
      if (!visited.has(upstreamId) && upstreamId !== startNodeId) {
        visited.add(upstreamId);
        queue.push(upstreamId);
      }
    }
  }

  return visited;
}

/**
 * Traverses upstream and downstream paths from a focal node
 */
export function inspectNodeNeighborhood(graphIndex, nodeId) {
  const node = graphIndex.nodeMap.get(nodeId);
  if (!node) return null;

  const directUpstream = Array.from(node.upstream).map(id => graphIndex.nodeMap.get(id)).filter(Boolean);
  const directDownstream = Array.from(node.downstream).map(id => graphIndex.nodeMap.get(id)).filter(Boolean);
  const transitiveDownstream = Array.from(getTransitiveDownstream(graphIndex.nodeMap, nodeId))
    .map(id => graphIndex.nodeMap.get(id))
    .filter(Boolean);

  const directEdges = graphIndex.edges.filter(e => e.source === nodeId || e.target === nodeId);

  return {
    node,
    directUpstream,
    directDownstream,
    transitiveDownstream,
    blastRadius: transitiveDownstream.length,
    edges: directEdges
  };
}
