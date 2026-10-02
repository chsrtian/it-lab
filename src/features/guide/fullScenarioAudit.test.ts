import { describe, it, expect, beforeAll } from "vitest";
import { getScenarios } from "@/content";
import type { Scenario, Condition, ActionDef } from "@/content/schema";
import {
  createRun,
  availableActions,
  applyAction,
  executeSimulatedCommand,
  recordCommand,
  resolveStepCommand,
} from "@/engine";
import {
  isStepComplete,
  guideStepCue,
  guideStepDoneWhen,
  validateCueAffordance,
  EXTRA_GUIDE_TARGET_IDS,
} from "@/features/guide/logic";

/**
 * Machine-readable end-to-end audit of every guided step in every scenario.
 * One row per step; any row with status FAIL fails the suite. The row states
 * exactly which contract broke: target, cue affordance, command resolution,
 * command executability, action reachability with the Guide OFF, completion
 * by TYPING the command the guide shows, completion by the Actions rail, and
 * the learner-facing instruction texts.
 */
interface AuditRow {
  scenario: string;
  step: string;
  cue: string;
  target: string;
  targetResolved: boolean;
  cueAffordanceOk: boolean;
  commandText: string | null;
  commandPurpose: string | null;
  commandResolved: boolean;
  commandExecutes: boolean;
  reachableBeforeAct: boolean;
  typedCompletes: boolean | null;
  railCompletes: boolean | null;
  completionReached: boolean;
  textNonEmpty: boolean;
  status: "PASS" | "FAIL";
  errors: string[];
}

const UNKNOWN_COMMAND = /not recognized as an internal|command not found/;

function conditionPaths(condition: Condition): string[] {
  switch (condition.type) {
    case "stateEquals":
    case "stateIn":
      return [condition.path];
    case "commandRan":
      return [];
    case "all":
    case "any":
      return condition.conditions.flatMap(conditionPaths);
    case "not":
      return conditionPaths(condition.condition);
  }
}

function patchTouchesPath(
  patch: Record<string, unknown> | undefined,
  path: string,
): boolean {
  if (!patch) return false;
  let cursor: unknown = patch;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return false;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor !== undefined;
}

/**
 * The action a learner performs when interacting with the step's target to
 * satisfy a completeWhen-only step (same derivation guideStepCue uses to
 * label the cue).
 */
function findFlipAction(
  scenario: Scenario,
  completeWhen: Condition,
  applied: readonly string[],
): ActionDef | undefined {
  const paths = conditionPaths(completeWhen);
  return scenario.actions.find(
    (action) =>
      !applied.includes(action.id) && paths.some((p) => patchTouchesPath(action.patch, p)),
  );
}

export function auditScenario(scenario: Scenario): AuditRow[] {
  const rows: AuditRow[] = [];
  const walkthrough = scenario.guidedWalkthrough;
  if (!walkthrough) return rows;

  const visibleTargets = new Set<string>([
    ...scenario.environment.components,
    ...EXTRA_GUIDE_TARGET_IDS,
  ]);
  const shell = scenario.environment.shell;

  let run = createRun(scenario, "guided");

  for (const step of walkthrough.steps) {
    const errors: string[] = [];
    const cue = guideStepCue(step, scenario);
    const target = step.target.componentId;

    const targetResolved = visibleTargets.has(target);
    if (!targetResolved) errors.push(`target "${target}" is not visible`);

    const affordanceErrors = validateCueAffordance(step, scenario);
    const cueAffordanceOk = affordanceErrors.length === 0;
    errors.push(...affordanceErrors);

    const resolved = step.commandId ? resolveStepCommand(step, scenario) : null;
    const isType = cue === "TYPE";
    let commandResolved = true;
    let commandExecutes = true;
    let commandText: string | null = null;
    let commandPurpose: string | null = null;

    if (step.commandId) {
      commandText = resolved?.text ?? null;
      commandPurpose = resolved?.purpose ?? null;
      commandResolved =
        !!resolved && resolved.text.trim().length > 0 && resolved.purpose.trim().length > 0;
      if (!commandResolved) {
        errors.push(`commandId "${step.commandId}" does not resolve to a runnable command`);
      }
      if (isType && resolved) {
        const probe = executeSimulatedCommand(
          { scenario, world: run.world, shell },
          resolved.text,
        );
        const rejected =
          probe.error === true && probe.output.some((line) => UNKNOWN_COMMAND.test(line));
        commandExecutes = !rejected;
        if (rejected) {
          errors.push(`typing "${resolved.text}" is rejected by the allowlist/unknown command`);
        }
      }
    } else if (isType) {
      commandResolved = false;
      errors.push("cue TYPE without a commandId");
    }

    const textNonEmpty =
      step.title.trim().length > 0 &&
      step.explanation.trim().length > 0 &&
      step.why.trim().length > 0 &&
      step.expectedObservation.trim().length > 0 &&
      step.target.label.trim().length > 0 &&
      guideStepDoneWhen(step, scenario).trim().length > 0;
    if (!textNonEmpty) errors.push("instruction text (title/explanation/why/look-for/label/done-when) empty");

    let reachableBeforeAct = true;
    let typedCompletes: boolean | null = null;
    let railCompletes: boolean | null = null;
    const alreadyComplete = isStepComplete(step, run);

    if (!alreadyComplete) {
      if (step.actionId) {
        reachableBeforeAct = availableActions(scenario, run).some(
          (a) => a.id === step.actionId,
        );
        if (!reachableBeforeAct) {
          errors.push(`action "${step.actionId}" not reachable with the Guide OFF at this point`);
        }
      }

      if (isType && step.commandId && resolved) {
        const result = executeSimulatedCommand(
          { scenario, world: run.world, shell },
          resolved.text,
        );
        if (result.commandId) {
          run = recordCommand(scenario, run, result.commandId, resolved.text, result.worldPatch);
        }
        typedCompletes = isStepComplete(step, run);
        if (!typedCompletes) {
          errors.push(`typing the shown command "${resolved.text}" did not complete the step`);
        }
      }

      if (step.actionId && !isStepComplete(step, run)) {
        run = applyAction(scenario, run, step.actionId);
        railCompletes = isStepComplete(step, run);
        if (!railCompletes) {
          errors.push(`Actions-rail apply of "${step.actionId}" did not complete the step`);
        }
      }

      if (
        step.actionId === undefined &&
        step.completeWhen !== undefined &&
        !isStepComplete(step, run)
      ) {
        const flip = findFlipAction(scenario, step.completeWhen, run.appliedActions);
        if (flip) {
          const flipReachable = availableActions(scenario, run).some((a) => a.id === flip.id);
          if (!flipReachable) {
            reachableBeforeAct = false;
            errors.push(
              `action "${flip.id}" (satisfies completeWhen) not reachable with the Guide OFF at this point`,
            );
          } else {
            run = applyAction(scenario, run, flip.id);
            if (!isStepComplete(step, run)) {
              errors.push(
                `action "${flip.id}" applied but the step's completion condition still does not hold`,
              );
            }
          }
        } else {
          errors.push("no scenario action flips this step's completion condition");
        }
      }
    }

    const completionReached = isStepComplete(step, run);
    if (!completionReached) {
      errors.push(`step never completed during walkthrough replay`);
    }

    rows.push({
      scenario: scenario.id,
      step: step.id,
      cue,
      target,
      targetResolved,
      cueAffordanceOk,
      commandText,
      commandPurpose,
      commandResolved,
      commandExecutes,
      reachableBeforeAct,
      typedCompletes,
      railCompletes,
      completionReached,
      textNonEmpty,
      status: errors.length === 0 ? "PASS" : "FAIL",
      errors,
    });
  }

  return rows;
}

describe("Full cross-domain scenario audit (all guided steps)", () => {
  const allRows: AuditRow[] = [];

  beforeAll(() => {
    for (const scenario of getScenarios()) {
      allRows.push(...auditScenario(scenario));
    }
  });

  it("every guided step across every scenario passes every audit check", () => {
    const failRows = allRows.filter((r) => r.status === "FAIL");
    expect(
      failRows,
      failRows.map((r) => `${r.scenario}/${r.step}: ${r.errors.join("; ")}`).join("\n"),
    ).toHaveLength(0);
  });

  it("audit covers every scenario that has a guided walkthrough", () => {
    const guided = getScenarios().filter((s) => s.guidedWalkthrough);
    expect(guided.length).toBe(100);
    expect(allRows.length).toBeGreaterThan(400);
  });

  it("no duplicate step ids within a scenario", () => {
    for (const scenario of getScenarios()) {
      const seen = new Set<string>();
      for (const step of scenario.guidedWalkthrough?.steps ?? []) {
        expect(seen.has(step.id), `${scenario.id}: duplicate step ${step.id}`).toBe(false);
        seen.add(step.id);
      }
    }
  });

  it("every TYPE step shows a non-empty, purposeful command that executes", () => {
    const typeRows = allRows.filter((r) => r.cue === "TYPE");
    expect(typeRows.length).toBeGreaterThan(50);
    for (const row of typeRows) {
      expect(row.commandResolved, `${row.scenario}/${row.step} resolves`).toBe(true);
      expect(row.commandExecutes, `${row.scenario}/${row.step} executes "${row.commandText}"`).toBe(true);
      expect((row.commandText ?? "").length, `${row.scenario}/${row.step} text`).toBeGreaterThan(0);
      expect((row.commandPurpose ?? "").length, `${row.scenario}/${row.step} purpose`).toBeGreaterThan(0);
    }
  });

  it("every TYPE step completes by typing the exact command the guide shows", () => {
    const typeRows = allRows.filter((r) => r.cue === "TYPE" && r.typedCompletes !== null);
    for (const row of typeRows) {
      expect(row.typedCompletes, `${row.scenario}/${row.step} typing "${row.commandText}"`).toBe(true);
    }
  });

  it("every action-driven step is reachable with the Guide OFF and completes from the rail", () => {
    const actionRows = allRows.filter((r) => r.railCompletes !== null);
    for (const row of actionRows) {
      expect(row.reachableBeforeAct, `${row.scenario}/${row.step} reachable`).toBe(true);
      expect(row.railCompletes, `${row.scenario}/${row.step} rail`).toBe(true);
    }
  });

  it("every guided step shows non-empty instruction text", () => {
    for (const row of allRows) {
      expect(row.textNonEmpty, `${row.scenario}/${row.step}`).toBe(true);
    }
  });
});

