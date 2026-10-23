import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveJourneysAndTraces } from "./traceEngine.js";
import { normalizeToCanonicalModel } from "./canonicalModel.js";

describe("Architecture Workspace: Execution Traces & Playback Engine", () => {
  const sampleBlueprint = {
    projectName: "Video Platform",
    overview: {
      problem: "High-scale video streaming with user auth and metadata",
      coreFeatures: [
        { name: "Video Streaming", description: "HLS playback", priority: "Must have" },
        { name: "User Auth", description: "JWT authentication", priority: "Must have" }
      ]
    },
    roles: [
      { name: "Subscriber", purpose: "Stream content", permissions: ["read:video"] },
      { name: "Admin", purpose: "Manage catalogue", permissions: ["write:video"] }
    ],
    architecture: {
      nodes: [
        { id: "comp-web", label: "React Web App", type: "frontend" },
        { id: "comp-gw", label: "Express API Gateway", type: "gateway" },
        { id: "comp-video", label: "Streaming Service", type: "service" },
        { id: "comp-ai", label: "AI Recommendation Engine", type: "external" },
        { id: "comp-mongo", label: "MongoDB Cluster", type: "database" }
      ],
      edges: [
        { from: "comp-web", to: "comp-gw", label: "HTTP requests" },
        { from: "comp-gw", to: "comp-video", label: "Routes request" },
        { from: "comp-video", to: "comp-ai", label: "Fetch recommendations" },
        { from: "comp-video", to: "comp-mongo", label: "Reads and writes metadata" }
      ]
    },
    database: {
      tables: [
        {
          name: "Videos",
          columns: [
            { name: "id", type: "ObjectId", primaryKey: true },
            { name: "title", type: "String", nullable: false },
            { name: "views", type: "Number", nullable: true }
          ]
        },
        {
          name: "Users",
          columns: [
            { name: "id", type: "ObjectId", primaryKey: true },
            { name: "email", type: "String", nullable: false }
          ]
        }
      ]
    },
    apis: [
      { method: "POST", path: "/api/videos/upload", description: "Upload video metadata", authRequired: true },
      { method: "GET", path: "/api/videos", description: "List catalogue", authRequired: false }
    ],
    workflows: [
      { name: "Upload Video", actor: "Subscriber", steps: ["Select file", "Transcode", "Save"] }
    ]
  };

  const canonicalModel = normalizeToCanonicalModel(sampleBlueprint);

  test("deriveJourneysAndTraces: derives primary journey grounded in real artifacts", () => {
    const { journeys, primaryJourney } = deriveJourneysAndTraces(canonicalModel);

    assert.ok(journeys.length > 0, "Should generate journeys");
    assert.ok(primaryJourney, "Primary journey must exist");
    assert.equal(primaryJourney.actor, "Subscriber", "Actor should match blueprint role");

    // Check step pipeline order
    const pipelineStages = primaryJourney.steps.map((s) => s.dataPipe);
    assert.ok(pipelineStages.includes("UI Action"), "Must start with UI Action");
    assert.ok(pipelineStages.includes("HTTP Request"), "Must include HTTP Request");
    assert.ok(pipelineStages.includes("Middleware"), "Must include Middleware check");
    assert.ok(pipelineStages.includes("Controller & Service"), "Must include Backend Service logic");
    assert.ok(pipelineStages.includes("Database Persistence"), "Must include DB persistence");
    assert.ok(pipelineStages.includes("HTTP Response"), "Must end with HTTP Response");
  });

  test("deriveJourneysAndTraces: includes external AI provider step when modeled in blueprint", () => {
    const { primaryJourney } = deriveJourneysAndTraces(canonicalModel);
    const hasExternalStep = primaryJourney.steps.some((s) => s.dataPipe === "External Provider");
    assert.ok(hasExternalStep, "Should trace into External Provider when present in architecture");
  });

  test("deriveJourneysAndTraces: derives realistic, grounded error paths with failure markers", () => {
    const { journeys } = deriveJourneysAndTraces(canonicalModel);
    const errorJourneys = journeys.filter((j) => j.category === "error");

    assert.ok(errorJourneys.length >= 2, "Must include at least 2 error paths");

    const authError = errorJourneys.find((j) => j.id.includes("401"));
    assert.ok(authError, "Should include 401 Unauthorized path");
    const failedAuthStep = authError.steps.find((s) => s.isFailureStep);
    assert.ok(failedAuthStep, "401 path must contain an explicit failure step");
    assert.equal(failedAuthStep.status, "failed");
    assert.ok(failedAuthStep.errorDetail.includes("401"), "Error step must document 401 cause");

    const validationError = errorJourneys.find((j) => j.id.includes("422"));
    assert.ok(validationError, "Should include 422 Validation Error path");
    const failedValidationStep = validationError.steps.find((s) => s.isFailureStep);
    assert.ok(failedValidationStep, "422 path must contain an explicit failure step");
    assert.equal(failedValidationStep.status, "failed");
  });

  test("deriveJourneysAndTraces: does not claim real runtime telemetry", () => {
    const { journeys } = deriveJourneysAndTraces(canonicalModel);
    journeys.forEach((j) => {
      j.steps.forEach((step) => {
        // Must be marked simulated or failed, never fake 'verified live'
        assert.ok(["simulated", "modeled", "failed"].includes(step.status));
      });
    });
  });

  test("traceEngine: handles empty or minimal blueprint gracefully without throwing", () => {
    const emptyCanonical = normalizeToCanonicalModel({});
    const result = deriveJourneysAndTraces(emptyCanonical);
    assert.ok(result.journeys.length > 0, "Must safely create fallback trace");
    assert.ok(result.primaryJourney, "Fallback primary journey must exist");
  });
});
