/**
 * apiFlowEngine.js
 * 
 * Visual API Workflow & Mock Execution Engine.
 * Safely executes API flow chains locally with simulated network responses,
 * variable extraction, assertions, and run history.
 */

export function executeApiFlowMock(flow, initialVariables = {}) {
  const startTime = Date.now();
  const runId = `run-${Date.now()}`;
  const variableStore = { ...initialVariables };
  const stepLogs = [];
  let currentStepIndex = 1;
  let overallSuccess = true;

  const nodeMap = new Map((flow.nodes || []).map(n => [n.id, n]));
  const edgeMap = new Map();
  (flow.edges || []).forEach(e => edgeMap.set(e.from, e.to));

  // Find start node
  let currentNode = (flow.nodes || []).find(n => n.type === "start") || flow.nodes?.[0];

  while (currentNode) {
    const stepStart = Date.now();
    let stepOutcome = {
      step: currentStepIndex++,
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      label: currentNode.label,
      durationMs: 0,
      status: "success",
      details: ""
    };

    if (currentNode.type === "start") {
      stepOutcome.details = "Flow execution initialized.";
    } else if (currentNode.type === "auth") {
      const token = `jwt_mock_${Math.random().toString(36).substring(2, 10)}`;
      const varName = currentNode.config?.tokenVar || "AUTH_TOKEN";
      variableStore[varName] = token;
      stepOutcome.details = `Generated mock JWT token stored in {{${varName}}}`;
    } else if (currentNode.type === "http") {
      const method = currentNode.config?.method || "GET";
      const path = currentNode.config?.path || "/api/resource";
      const expectedStatus = currentNode.config?.expectedStatus || 200;

      // Mock response payload
      const mockPayload = {
        status: expectedStatus,
        data: {
          id: `rec_${Math.floor(Math.random() * 9000 + 1000)}`,
          resource: path.split("/").filter(Boolean).pop() || "item",
          timestamp: new Date().toISOString(),
          simulated: true
        }
      };

      variableStore["LAST_RESPONSE"] = mockPayload;
      stepOutcome.details = `${method} ${path} → Mock HTTP ${expectedStatus} OK (${JSON.stringify(mockPayload.data)})`;
    } else if (currentNode.type === "assertion") {
      const expr = currentNode.config?.expression || "response.status === 200";
      // Deterministic check
      const passed = !currentNode.config?.simulateFail;
      if (!passed) {
        stepOutcome.status = "failed";
        stepOutcome.details = `Assertion failed: [${expr}] evaluated to false`;
        overallSuccess = false;
      } else {
        stepOutcome.details = `Assertion passed: [${expr}] matches simulated response`;
        if (currentNode.config?.extractVar) {
          variableStore[currentNode.config.extractVar] = variableStore["LAST_RESPONSE"]?.data?.id || "mock-id-123";
        }
      }
    } else if (currentNode.type === "end") {
      stepOutcome.details = "Flow execution completed.";
      stepOutcome.durationMs = 2;
      stepLogs.push(stepOutcome);
      break;
    }

    stepOutcome.durationMs = Math.max(1, Date.now() - stepStart);
    stepLogs.push(stepOutcome);

    // If step failed, stop flow
    if (stepOutcome.status === "failed") {
      break;
    }

    // Traverse next node
    const nextNodeId = edgeMap.get(currentNode.id);
    currentNode = nextNodeId ? nodeMap.get(nextNodeId) : null;
  }

  return {
    runId,
    flowId: flow.id,
    flowName: flow.name,
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    success: overallSuccess,
    steps: stepLogs,
    exportedVariables: variableStore
  };
}
