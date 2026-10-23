/**
 * workspaceJourney.js
 * 
 * Four primary developer workspaces:
 * - system: "What is my system, what talks to what, where is the data?"
 * - spec: "What did we promise and decide, and what's the API contract?"
 * - analyze: "Is it sound, and what breaks if I change X?"
 * - build: "Give me the code, the OpenAPI file and a running mock"
 */

export const WORKSPACE_TABS = [
  {
    id: "system",
    label: "System",
    question: "What is my system, what talks to what, where is the data?",
    defaultSubView: "components"
  },
  {
    id: "spec",
    label: "Spec",
    question: "What did we promise and decide, and what's the API contract?",
    defaultSubView: "all"
  },
  {
    id: "analyze",
    label: "Analyze",
    question: "Is it sound, and what breaks if I change X?",
    defaultSubView: "checks"
  },
  {
    id: "build",
    label: "Build",
    question: "Give me the code, the OpenAPI file and a running mock",
    defaultSubView: "scaffold"
  }
];

// 5-stage legacy alias list for backwards compatibility
export const WORKSPACE_STAGES = [
  {
    id: "system",
    step: 1,
    label: "System",
    title: "System Architecture & Data",
    hint: "What is my system, what talks to what, where is the data?",
    defaultSubView: "components"
  },
  {
    id: "spec",
    step: 2,
    label: "Spec",
    title: "Product & Technical Specifications",
    hint: "What did we promise and decide, and what's the API contract?",
    defaultSubView: "all"
  },
  {
    id: "analyze",
    step: 3,
    label: "Analyze",
    title: "Soundness & Change Impact",
    hint: "Is it sound, and what breaks if I change X?",
    defaultSubView: "checks"
  },
  {
    id: "build",
    step: 4,
    label: "Build",
    title: "Scaffold, Mock Server & Spec",
    hint: "Give me the code, the OpenAPI file and a running mock",
    defaultSubView: "scaffold"
  }
];

export const WORKSPACE_IDS = WORKSPACE_TABS.map((t) => t.id);

/**
 * Normalizes any legacy or URL workspace identifier into one of the four canonical tabs.
 */
export function normalizeWorkspaceId(id = "system") {
  const lower = String(id).toLowerCase();
  if (["overview", "architecture", "map", "system", "causal", "database", "apis", "components", "data"].includes(lower)) {
    return "system";
  }
  if (["spec", "requirements", "story", "brief", "decisions", "adr", "roadmap"].includes(lower)) {
    return "spec";
  }
  if (["analyze", "impact", "validate", "checks", "threats", "workflows", "api_flows"].includes(lower)) {
    return "analyze";
  }
  if (["build", "scaffold", "openapi", "mock", "diffs", "reality", "history"].includes(lower)) {
    return "build";
  }
  return "system";
}

export function getWorkspaceStage(id) {
  const norm = normalizeWorkspaceId(id);
  return WORKSPACE_TABS.find((t) => t.id === norm) || WORKSPACE_TABS[0];
}

export function getWorkspaceIndex(id) {
  const norm = normalizeWorkspaceId(id);
  const index = WORKSPACE_TABS.findIndex((t) => t.id === norm);
  return index >= 0 ? index : 0;
}
