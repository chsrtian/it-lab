import type { GuidedStep, Scenario } from "@/content/schema";
import type { RunState } from "./scenario";
import { evaluateCondition } from "./conditions";
import { resolveStepCommand } from "./commandRegistry";

export function isStepComplete(step: GuidedStep, run: RunState): boolean {
  if (step.actionId !== undefined) {
    if (!run.appliedActions.includes(step.actionId)) return false;
  } else if (step.commandId !== undefined) {
    if (!run.ranCommands.includes(step.commandId)) return false;
  }
  if (
    step.completeWhen !== undefined &&
    !evaluateCondition(step.completeWhen, {
      world: run.world,
      ranCommands: new Set(run.ranCommands),
      appliedActions: run.appliedActions,
    })
  ) {
    return false;
  }
  return true;
}


export function nextTroubleshootingStep(scenario: Scenario, run: RunState) {
  return scenario.guidedWalkthrough?.steps.find(step => !isStepComplete(step, run));
}

export function resolveGuideInteraction(step: GuidedStep, scenario: Scenario) {
  const action = step.actionId
    ? scenario.actions.find((candidate) => candidate.id === step.actionId)
    : undefined;
  const cue = step.cue ?? (action?.kind === "terminal" || step.commandId ? "TYPE" : action?.kind === "inspect" ? "INSPECT" : action ? "CLICK" : "OBSERVE");
  const terminal = cue === "TYPE";
  const componentId = action?.component ?? action?.inspectTarget ?? step.target.componentId;
  const surfaceId = terminal ? "terminal-input" : step.target.componentId;
  const label = terminal ? "Terminal input" : step.target.label;
  return {
    action,
    cue,
    componentId,
    surfaceId,
    label,
    instruction: terminal
      ? `Open Terminal and enter “${resolveStepCommand(step, scenario)?.text ?? step.commandId}”. ${step.explanation}`
      : action
        ? `Use ${step.target.label} in the lab to: ${action.label}. ${step.explanation}`
        : step.explanation,
  };
}
