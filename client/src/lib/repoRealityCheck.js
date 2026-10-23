/**
 * repoRealityCheck.js
 * 
 * Code-to-Architecture Drift Detection Engine for InfraMind Control Plane.
 * Parses JavaScript/Express/Mongoose code files without execution, extracts
 * structural facts, and compares them with the canonical blueprint.
 */

/**
 * Analyzes code files against a canonical project model to find architectural drift.
 * 
 * @param {Array<{path: string, content: string}>} files - Source code files
 * @param {Object} canonicalModel - The active canonical blueprint
 * @returns {Object} Drift findings with line numbers, evidence, and sync actions
 */
export function analyzeRepositoryDrift(files = [], canonicalModel = {}) {
  const extractedRoutes = [];
  const extractedModels = [];

  // Parse each file using regex-based structural extraction
  files.forEach(file => {
    const lines = (file.content || "").split("\n");
    const filePath = file.path || "unknown.js";

    lines.forEach((line, lineIdx) => {
      const lineNum = lineIdx + 1;

      // Match Express route declarations: router.get('/path', ...), app.post("/path", ...)
      const routeMatch = line.match(/(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/i);
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const rawPath = routeMatch[2];
        const hasAuth = /(requireAuth|auth|protect|verifyToken|authenticate|jwt)/i.test(line);

        extractedRoutes.push({
          method,
          path: rawPath,
          filePath,
          line: lineNum,
          hasAuth,
          rawCode: line.trim()
        });
      }

      // Match Mongoose Model: mongoose.model('Name', ...)
      const modelMatch = line.match(/mongoose\.model\s*\(\s*["']([^"']+)["']/i);
      if (modelMatch) {
        extractedModels.push({
          name: modelMatch[1],
          filePath,
          line: lineNum,
          rawCode: line.trim()
        });
      }
    });
  });

  const findings = [];
  let findingCounter = 1;

  // 1. Ghost Blueprint Routes: In blueprint, but NOT found in source code
  const blueprintApis = canonicalModel.apis || [];
  blueprintApis.forEach(api => {
    const foundInCode = extractedRoutes.find(
      r => r.method === api.method && pathsMatch(r.path, api.path)
    );

    if (!foundInCode) {
      findings.push({
        id: `drift-${findingCounter++}`,
        type: "GHOST_BLUEPRINT_ROUTE",
        severity: "warning",
        title: "Blueprint Endpoint Missing in Codebase",
        description: `The canonical blueprint specifies ${api.method} ${api.path}, but no matching Express route was detected in the code files.`,
        relatedArtifact: api.id,
        confidence: "High (0.92)",
        evidence: `Expected route: ${api.method} ${api.path}`,
        remediation: "Implement the missing Express route handler or remove deprecated endpoint from architecture."
      });
    }
  });

  // 2. Undocumented Code Routes: In code, but NOT declared in blueprint
  extractedRoutes.forEach(codeRoute => {
    const foundInBlueprint = blueprintApis.find(
      api => api.method === codeRoute.method && pathsMatch(codeRoute.path, api.path)
    );

    if (!foundInBlueprint) {
      findings.push({
        id: `drift-${findingCounter++}`,
        type: "UNDOCUMENTED_CODE_ROUTE",
        severity: "suggestion",
        title: "Undocumented Endpoint Detected in Code",
        description: `Express route ${codeRoute.method} ${codeRoute.path} is implemented in code but absent from the architecture specification.`,
        filePath: codeRoute.filePath,
        line: codeRoute.line,
        confidence: "High (0.95)",
        evidence: `${codeRoute.filePath}:${codeRoute.line} → ${codeRoute.rawCode}`,
        remediation: "Add this endpoint to the canonical blueprint or check if it is private/debug tooling."
      });
    }

    // 3. Security Gap: Route appears to lack authentication in code
    const isSensitive = codeRoute.path.includes("/admin") || codeRoute.path.includes("/order") || codeRoute.path.includes("/user");
    if (isSensitive && !codeRoute.hasAuth && codeRoute.method !== "GET") {
      findings.push({
        id: `drift-${findingCounter++}`,
        type: "SECURITY_GAP",
        severity: "error",
        title: "Sensitive Route Appears Unprotected in Code",
        description: `Route ${codeRoute.method} ${codeRoute.path} handles sensitive mutations but does not reference auth middleware on its declaration line.`,
        filePath: codeRoute.filePath,
        line: codeRoute.line,
        confidence: "Medium (0.80)",
        evidence: `${codeRoute.filePath}:${codeRoute.line} → ${codeRoute.rawCode}`,
        remediation: "Mount requireAuth or equivalent JWT verification middleware on this route."
      });
    }
  });

  // 4. Model Sync Verification
  const blueprintEntities = canonicalModel.entities || [];
  blueprintEntities.forEach(ent => {
    const foundModel = extractedModels.find(
      m => m.name.toLowerCase() === ent.name.toLowerCase()
    );

    if (!foundModel) {
      findings.push({
        id: `drift-${findingCounter++}`,
        type: "MISSING_DATA_MODEL",
        severity: "warning",
        title: "MongoDB Collection Missing Mongoose Model",
        description: `Collection '${ent.name}' is defined in data models, but no corresponding mongoose.model('${ent.name}', ...) was located in source files.`,
        relatedArtifact: ent.id,
        confidence: "High (0.88)",
        evidence: `Expected model definition for '${ent.name}'`,
        remediation: "Create the Mongoose schema file for this collection."
      });
    }
  });

  return {
    scannedFilesCount: files.length,
    extractedRoutesCount: extractedRoutes.length,
    extractedModelsCount: extractedModels.length,
    findings,
    summary: {
      ghostRoutes: findings.filter(f => f.type === "GHOST_BLUEPRINT_ROUTE").length,
      undocumentedRoutes: findings.filter(f => f.type === "UNDOCUMENTED_CODE_ROUTE").length,
      securityGaps: findings.filter(f => f.type === "SECURITY_GAP").length,
      missingModels: findings.filter(f => f.type === "MISSING_DATA_MODEL").length
    }
  };
}

function pathsMatch(p1, p2) {
  const norm1 = String(p1 || "").replace(/\/+/g, "/").replace(/:[^/]+/g, "*").replace(/\{[^}]+\}/g, "*").toLowerCase();
  const norm2 = String(p2 || "").replace(/\/+/g, "/").replace(/:[^/]+/g, "*").replace(/\{[^}]+\}/g, "*").toLowerCase();
  return norm1 === norm2 || norm1.endsWith(norm2) || norm2.endsWith(norm1);
}
