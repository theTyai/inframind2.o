const knownMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function analyzeBlueprint(result) {
  const checks = [];
  const nodes = result?.architecture?.nodes ?? [];
  const edges = result?.architecture?.edges ?? [];
  const collections = result?.database?.tables ?? [];
  const apis = result?.apis ?? [];
  const nodeIds = new Set(nodes.map(n => n.id));
  const collectionNames = new Set(collections.map(c => c.name.toLowerCase()));

  const badEdges = edges.filter(e => !nodeIds.has(e.from) || !nodeIds.has(e.to));
  checks.push({
    title: "Architecture connections",
    severity: badEdges.length ? "error" : "pass",
    detail: badEdges.length ? `${badEdges.length} connection(s) point to missing component IDs.` : `All ${edges.length} connection(s) reference existing components.`
  });

  const duplicateNodeIds = nodes.filter((n, i) => nodes.findIndex(x => x.id === n.id) !== i);
  checks.push({ title: "Unique component IDs", severity: duplicateNodeIds.length ? "error" : "pass", detail: duplicateNodeIds.length ? `Duplicate IDs: ${[...new Set(duplicateNodeIds.map(n => n.id))].join(", ")}.` : "Every architecture component has a unique ID." });

  const duplicateCollections = collections.filter((c, i) => collections.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) !== i);
  checks.push({ title: "Collection names", severity: duplicateCollections.length ? "error" : "pass", detail: duplicateCollections.length ? `Duplicate collections: ${[...new Set(duplicateCollections.map(c => c.name))].join(", ")}.` : `${collections.length} collection(s) have unique names.` });

  const badMethods = apis.filter(api => !knownMethods.has(api.method));
  const badPaths = apis.filter(api => !String(api.path || "").startsWith("/"));
  const duplicateRoutes = apis.filter((api, i) => apis.findIndex(x => x.method === api.method && x.path.toLowerCase() === String(api.path).toLowerCase()) !== i);
  checks.push({ title: "REST route validity", severity: badMethods.length || badPaths.length || duplicateRoutes.length ? "error" : "pass", detail: [badMethods.length && `${badMethods.length} unsupported method(s)`, badPaths.length && `${badPaths.length} path(s) should start with /`, duplicateRoutes.length && `${duplicateRoutes.length} duplicate method/path pair(s)`].filter(Boolean).join("; ") || `All ${apis.length} endpoints use supported methods, absolute paths, and unique method/path pairs.` });

  const refs = [];
  for (const collection of collections) for (const field of collection.columns ?? []) {
    if (field.foreignKey) {
      const target = String(field.foreignKey).split(/[.\s]/)[0].toLowerCase();
      if (!collectionNames.has(target) && ![...collectionNames].some(name => target.startsWith(name) || name.startsWith(target))) refs.push(`${collection.name}.${field.name} → ${field.foreignKey}`);
    }
  }
  checks.push({ title: "Collection references", severity: refs.length ? "warning" : "pass", detail: refs.length ? `Review possible unresolved references: ${refs.slice(0, 4).join("; ")}${refs.length > 4 ? ` and ${refs.length - 4} more` : ""}.` : "No obvious unresolved collection references were detected." });

  const noAuthSignal = !/(auth|login|register|token|session|permission|role)/i.test(JSON.stringify({ nodes, apis, collections }));
  checks.push({ title: "Authentication coverage", severity: noAuthSignal ? "warning" : "pass", detail: noAuthSignal ? "No obvious authentication or authorization component/route was detected. Confirm whether this app needs access control." : "Authentication-related concepts appear in the blueprint; manually verify protected routes and role checks." });

  return checks;
}

function safeSchema(body) {
  if (!body) return { type: "object", additionalProperties: true, description: "Schema not specified by the generated blueprint." };
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* use a conservative schema when model output is descriptive prose */ }
  return { type: "object", additionalProperties: true, description: String(body).slice(0, 500) };
}

export function toOpenApi(result) {
  const paths = {};
  for (const api of result?.apis ?? []) {
    const path = String(api.path || "/unknown");
    const method = String(api.method || "GET").toLowerCase();
    paths[path] ??= {};
    paths[path][method] = {
      summary: api.description || `${api.method} ${path}`,
      operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "root"}`,
      responses: Object.fromEntries((api.statusCodes?.length ? api.statusCodes : [200]).map(code => [String(code), { description: code >= 400 ? "Error response" : "Successful response", content: { "application/json": { schema: safeSchema(api.responseBody) } } }]))
    };
    if (["post", "put", "patch"].includes(method) && api.requestBody) {
      paths[path][method].requestBody = { required: true, content: { "application/json": { schema: safeSchema(api.requestBody) } } };
    }
    const params = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: "path", required: true, schema: { type: "string" } }));
    if (params.length) paths[path][method].parameters = params;
  }
  return {
    openapi: "3.1.0",
    info: { title: result?.projectName || "InfraMind API", version: "1.0.0", description: result?.summary || "Generated by InfraMind. Review before production use." },
    servers: [{ url: "http://localhost:5000", description: "Local development" }],
    paths,
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } }
  };
}
