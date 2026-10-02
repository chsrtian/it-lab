import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { evaluateCondition } from "@/engine/conditions";

/** Explicit semantic ownership. Search hints are for command/search matching,
 * never for deciding which physical object owns an operation. */
export function componentActions(scenario: Scenario, run: RunState, componentId: string) {
  return scenario.actions
    .filter((action) => action.component === componentId || action.inspectTarget === componentId)
    .filter((action) => action.kind !== "terminal")
    .map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      applied: run.appliedActions.includes(action.id),
      disabled: !!action.appliesWhen && !evaluateCondition(action.appliesWhen, {
        world: run.world,
        ranCommands: new Set(run.ranCommands),
        appliedActions: run.appliedActions,
      }),
    }));
}
