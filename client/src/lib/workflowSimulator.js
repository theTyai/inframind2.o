/**
 * workflowSimulator.js
 * 
 * Deterministic State Machine Simulation Engine for business workflows.
 * Simulates nominal executions, failure paths, guard evaluations, and recovery.
 */

export function createWorkflowSimulation(workflow) {
  const initialState = workflow.initialState || workflow.states?.[0] || "draft";

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    currentState: initialState,
    history: [
      {
        step: 0,
        timestamp: new Date().toISOString(),
        fromState: null,
        toState: initialState,
        event: "INITIALIZE",
        guardEvaluated: "Always True",
        guardPassed: true,
        actionExecuted: "Initialize workflow state machine",
        status: "success"
      }
    ],
    availableEvents: getAvailableEvents(workflow, initialState),
    completed: false,
    failed: false
  };
}

export function fireWorkflowEvent(simulation, workflow, eventName, context = {}) {
  const current = simulation.currentState;
  const transition = (workflow.transitions || []).find(
    t => t.from === current && t.event === eventName
  );

  if (!transition) {
    const errorEntry = {
      step: simulation.history.length,
      timestamp: new Date().toISOString(),
      fromState: current,
      toState: current,
      event: eventName,
      guardEvaluated: "Valid Transition Defined",
      guardPassed: false,
      actionExecuted: "Rejected invalid event for current state",
      status: "rejected",
      error: `Event '${eventName}' is not a valid transition from state '${current}'.`
    };

    return {
      ...simulation,
      history: [...simulation.history, errorEntry]
    };
  }

  // Evaluate guard (deterministic simulation)
  const isFailureTrigger = transition.isFailurePath || eventName.includes("FAIL") || eventName.includes("ERROR");
  const guardPassed = !context.forceFail && (!isFailureTrigger || context.simulateError);

  const targetState = guardPassed ? transition.to : current;
  const isTerminalSuccess = targetState === "completed" || targetState === "fulfilled";
  const isTerminalFailure = targetState === "failed" || targetState === "rejected";

  const historyEntry = {
    step: simulation.history.length,
    timestamp: new Date().toISOString(),
    fromState: current,
    toState: targetState,
    event: eventName,
    guardEvaluated: transition.guard || "Precondition satisfied",
    guardPassed,
    actionExecuted: transition.action || "State mutated",
    status: isFailureTrigger ? "error_handled" : "success"
  };

  const nextSim = {
    ...simulation,
    currentState: targetState,
    history: [...simulation.history, historyEntry],
    completed: isTerminalSuccess,
    failed: isTerminalFailure
  };

  nextSim.availableEvents = getAvailableEvents(workflow, targetState);
  return nextSim;
}

export function getAvailableEvents(workflow, currentState) {
  return (workflow.transitions || [])
    .filter(t => t.from === currentState)
    .map(t => ({
      event: t.event,
      targetState: t.to,
      guard: t.guard,
      action: t.action,
      isFailurePath: !!t.isFailurePath
    }));
}

export const PRESET_SCENARIOS = [
  {
    id: "scen-happy",
    title: "Nominal Happy Path",
    description: "Executes standard sequence with all guards passing and successful completion.",
    events: ["SUBMIT", "VALIDATE_OK", "EXECUTE_SUCCESS"]
  },
  {
    id: "scen-validation-error",
    title: "Payload Validation Rejection",
    description: "Simulates invalid client payload triggering immediate schema validation failure.",
    events: ["SUBMIT", "VALIDATE_FAIL"]
  },
  {
    id: "scen-downstream-timeout",
    title: "Downstream Persistence Error",
    description: "Passes initial validation but fails at persistence layer, triggering rollback.",
    events: ["SUBMIT", "VALIDATE_OK", "EXECUTE_ERROR"]
  }
];
