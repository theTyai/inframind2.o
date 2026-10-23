import express from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";

const router = express.Router({ mergeParams: true });

// Prebuilt demo fixtures fallback when inspecting demos without DB connection
const DEMO_BLUEPRINTS = {
  commerceflow: {
    apis: [
      { method: "POST", path: "/api/orders", statusCodes: [201], responseBody: '{"orderId":"ord_99812","status":"confirmed","total":149.99}' },
      { method: "GET", path: "/api/orders/:id", statusCodes: [200], responseBody: '{"orderId":"ord_99812","items":[{"sku":"SKU-1","qty":2}],"status":"processing"}' },
      { method: "POST", path: "/api/payments/charge", statusCodes: [200], responseBody: '{"transactionId":"tx_88124","status":"succeeded","amount":149.99}' },
      { method: "GET", path: "/api/catalog/products", statusCodes: [200], responseBody: '{"products":[{"id":"p_1","title":"Wireless Sensor Node","price":89.50}]}' }
    ]
  },
  learnsphere: {
    apis: [
      { method: "POST", path: "/api/auth/register", statusCodes: [201], responseBody: '{"userId":"usr_441","email":"student@learnsphere.io","role":"student"}' },
      { method: "GET", path: "/api/courses", statusCodes: [200], responseBody: '{"courses":[{"id":"crs_101","title":"System Design Fundamentals","modules":8}]}' },
      { method: "POST", path: "/api/courses/:id/enroll", statusCodes: [200], responseBody: '{"enrollmentId":"enr_771","status":"active"}' }
    ]
  },
  slotwise: {
    apis: [
      { method: "GET", path: "/api/availability", statusCodes: [200], responseBody: '{"slots":["09:00","10:30","14:00","16:30"]}' },
      { method: "POST", path: "/api/appointments", statusCodes: [201], responseBody: '{"appointmentId":"apt_331","confirmedSlot":"10:30","status":"scheduled"}' }
    ]
  },
  pulseboard: {
    apis: [
      { method: "GET", path: "/api/telemetry/stats", statusCodes: [200], responseBody: '{"nodes":24,"p99LatencyMs":42.8,"errorRate":0.001}' },
      { method: "POST", path: "/api/incidents", statusCodes: [201], responseBody: '{"incidentId":"inc_110","severity":"high","status":"investigating"}' }
    ]
  }
};

function matchPathPattern(routePath, requestedPath) {
  // Normalize leading/trailing slashes
  const rSegments = routePath.replace(/^\/+|\/+$/g, "").split("/");
  const qSegments = requestedPath.replace(/^\/+|\/+$/g, "").split("/");

  if (rSegments.length !== qSegments.length) return false;

  for (let i = 0; i < rSegments.length; i++) {
    const rSeg = rSegments[i];
    const qSeg = qSegments[i];
    // Parameter like :id or {id}
    if (rSeg.startsWith(":") || (rSeg.startsWith("{") && rSeg.endsWith("}"))) {
      continue;
    }
    if (rSeg.toLowerCase() !== qSeg.toLowerCase()) return false;
  }
  return true;
}

/**
 * Live Mock Handler for any project blueprint
 */
router.all("/:projectId/*?", async (req, res) => {
  const { projectId } = req.params;
  const requestedSubPath = "/" + (req.params[0] || "");
  const method = req.method.toUpperCase();

  let blueprint = null;

  // 1. Check if demo fixture
  const cleanDemoId = projectId.replace(/^demo-/, "").toLowerCase();
  if (DEMO_BLUEPRINTS[cleanDemoId]) {
    blueprint = DEMO_BLUEPRINTS[cleanDemoId];
  } else if (mongoose.Types.ObjectId.isValid(projectId)) {
    // 2. Fetch from MongoDB
    try {
      const project = await Project.findById(projectId).lean();
      if (project?.blueprint) {
        blueprint = project.blueprint;
      }
    } catch {
      // ignore db error, continue
    }
  }

  if (!blueprint) {
    return res.status(404).json({
      error: `Mock Server: Blueprint '${projectId}' not found or has no active blueprint.`,
      tip: "Ensure the project is saved or use a valid demo ID like 'commerceflow' or 'learnsphere'."
    });
  }

  const apis = blueprint.apis || [];

  // Match API endpoint by method and path
  const matchedApi = apis.find(api => {
    if ((api.method || "GET").toUpperCase() !== method) return false;
    const apiPath = api.path.startsWith("/") ? api.path : `/${api.path}`;
    return apiPath === requestedSubPath || matchPathPattern(apiPath, requestedSubPath);
  });

  if (!matchedApi) {
    return res.status(404).json({
      error: "Route not declared in this blueprint's OpenAPI specification.",
      requestedMethod: method,
      requestedPath: requestedSubPath,
      availableRoutes: apis.map(a => `${(a.method || "GET").toUpperCase()} ${a.path}`)
    });
  }

  // Determine status code
  const statusCode = (matchedApi.statusCodes && matchedApi.statusCodes[0]) || (method === "POST" ? 201 : 200);

  // Set mock telemetry headers
  res.setHeader("X-InfraMind-Mock", "true");
  res.setHeader("X-Blueprint-Route", `${matchedApi.method} ${matchedApi.path}`);
  res.setHeader("X-Mock-Engine", "Deterministic OpenAPI v3.1 Engine");

  // Determine response body
  if (matchedApi.responseBody) {
    try {
      const parsed = JSON.parse(matchedApi.responseBody);
      return res.status(statusCode).json(parsed);
    } catch {
      // If responseBody is not raw JSON, return structured wrapper
      return res.status(statusCode).json({
        data: matchedApi.responseBody,
        description: matchedApi.description,
        mockNotice: "Synthesized from blueprint responseBody contract."
      });
    }
  }

  // Fallback default response
  return res.status(statusCode).json({
    status: "ok",
    route: `${matchedApi.method} ${matchedApi.path}`,
    description: matchedApi.description,
    timestamp: new Date().toISOString()
  });
});

export default router;
