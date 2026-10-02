import type { ActionDef, Condition, Scenario } from "@/content/schema";
import {
  applyPatch,
  deriveWorld,
  evaluateAll,
  evaluateCondition,
  type EvalContext,
} from "./conditions";
import { matchActionByText } from "./evaluation";

export type RunMode = "guided" | "practice" | "challenge";

export type RunStatus = "in_progress" | "verified" | "completed";

export interface LearnerActionRecord {
  actionId: string;
  label: string;
  at: number;
  kind: "ui" | "terminal" | "inspect" | "hint" | "verify";
  feedback?: string;
  outcome?: "ok" | "wrong" | "neutral";
}

export interface RunState {
  scenarioId: string;
  mode: RunMode;
  status: RunStatus;
  world: Record<string, unknown>;
  ranCommands: string[];
  appliedActions: string[];
  actionLog: LearnerActionRecord[];
  hintsUsed: number[];
  hypothesesSelected: string[];
  conceptsRevealed: string[];
  lastFeedback: string | null;
  lastVerifyFailures: string[];
  startedAt: number;
  completedAt: number | null;
}

function cloneWorld(world: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(world)) as Record<string, unknown>;
}

function toCtx(run: RunState): EvalContext {
  return {
    world: run.world,
    ranCommands: new Set(run.ranCommands),
    appliedActions: run.appliedActions,
  };
}

function conditionLabel(condition: Condition): string {
  switch (condition.type) {
    case "stateEquals":
      return `${condition.path} === ${JSON.stringify(condition.value)}`;
    case "stateIn":
      return `${condition.path} in ${JSON.stringify(condition.values)}`;
    case "commandRan":
      return `ran command: ${condition.commandId}`;
    case "all":
      return condition.conditions.map(conditionLabel).join(" AND ");
    case "any":
      return `(${condition.conditions.map(conditionLabel).join(" OR ")})`;
    case "not":
      return `NOT (${conditionLabel(condition.condition)})`;
    default:
      return "condition";
  }
}

export function createRun(scenario: Scenario, mode: RunMode): RunState {
  return {
    scenarioId: scenario.id,
    mode,
    status: "in_progress",
    world: cloneWorld(scenario.environment.initialWorld),
    ranCommands: [],
    appliedActions: [],
    actionLog: [],
    hintsUsed: [],
    hypothesesSelected: [],
    conceptsRevealed: [...(scenario.conceptsOnStart ?? [])],
    lastFeedback: null,
    lastVerifyFailures: [],
    startedAt: Date.now(),
    completedAt: null,
  };
}

function checkWrongPaths(
  scenario: Scenario,
  run: RunState,
): { feedback: string; consequence?: Record<string, unknown> } | null {
  const ctx = toCtx(run);
  for (const wrong of scenario.wrongPaths) {
    if (evaluateCondition(wrong.when, ctx)) {
      return { feedback: wrong.feedback, consequence: wrong.consequence };
    }
  }
  return null;
}

export function applyAction(
  scenario: Scenario,
  run: RunState,
  actionId: string,
): RunState {
  const action = scenario.actions.find((a) => a.id === actionId);
  if (!action) {
    return { ...run, lastFeedback: `Unknown action: ${actionId}` };
  }
  if (run.appliedActions.includes(actionId)) {
    return { ...run, lastFeedback: "That step was already applied." };
  }
  if (action.appliesWhen && !evaluateCondition(action.appliesWhen, toCtx(run))) {
    return {
      ...run,
      lastFeedback: "You cannot do that yet — gather more evidence first.",
    };
  }

  let world = run.world;
  if (action.patch) {
    world = deriveWorld(applyPatch(world, action.patch));
  } else {
    world = deriveWorld(world);
  }

  let next: RunState = {
    ...run,
    world,
    appliedActions: [...run.appliedActions, actionId],
    conceptsRevealed: [
      ...new Set([...run.conceptsRevealed, ...(action.revealsConcepts ?? [])]),
    ],
    lastFeedback: action.feedback ?? null,
    actionLog: [
      ...run.actionLog,
      {
        actionId: action.id,
        label: action.label,
        at: Date.now(),
        kind: action.kind,
        feedback: action.feedback,
        outcome: "ok",
      },
    ],
  };

  const wrong = checkWrongPaths(scenario, next);
  if (wrong) {
    next = {
      ...next,
      world: wrong.consequence ? applyPatch(next.world, wrong.consequence) : next.world,
      lastFeedback: wrong.feedback,
      actionLog: [
        ...next.actionLog.slice(0, -1),
        {
          ...next.actionLog[next.actionLog.length - 1],
          outcome: "wrong",
          feedback: wrong.feedback,
        },
      ],
    };
  }

  return next;
}

export function recordCommand(
  scenario: Scenario,
  run: RunState,
  commandId: string,
  outputSummary: string,
  worldPatch?: Record<string, unknown>,
): RunState {
  const already = run.ranCommands.includes(commandId);
  let world = run.world;
  if (worldPatch && Object.keys(worldPatch).length > 0) {
    world = deriveWorld(applyPatch(world, worldPatch));
  }

  const actionLog = already
    ? run.actionLog
    : [
        ...run.actionLog,
        {
          actionId: `cmd:${commandId}`,
          label: outputSummary,
          at: Date.now(),
          kind: "terminal" as const,
          outcome: "neutral" as const,
        },
      ];

  let next: RunState = {
    ...run,
    world,
    ranCommands: already ? run.ranCommands : [...run.ranCommands, commandId],
    actionLog,
    lastFeedback: worldPatch ? `Command applied state change: ${outputSummary}` : run.lastFeedback,
  };

  // Terminal freeform may map to a scenario action (e.g. "ping gateway" diagnostics).
  // Passing appliedActions lets an equally-strong match land on a later step when
  // the learner re-runs a command the guide already recorded (verify steps).
  const matched = matchActionByText(scenario, outputSummary, next.appliedActions);
  if (matched && !next.appliedActions.includes(matched.id)) {
    const ready =
      !matched.appliesWhen ||
      evaluateCondition(matched.appliesWhen, {
        world: next.world,
        ranCommands: new Set(next.ranCommands),
        appliedActions: next.appliedActions,
      });
    if (ready) {
      next = applyAction(scenario, next, matched.id);
      return next;
    }
  }

  const wrong = checkWrongPaths(scenario, next);
  if (wrong) {
    next = {
      ...next,
      world: wrong.consequence ? applyPatch(next.world, wrong.consequence) : next.world,
      lastFeedback: wrong.feedback,
    };
  }
  return next;
}

export function requestHint(scenario: Scenario, run: RunState): RunState {
  const nextLevel = Math.min(run.hintsUsed.length + 1, scenario.hints.length);
  if (run.hintsUsed.includes(nextLevel)) return run;
  const hint = scenario.hints[nextLevel - 1];
  return {
    ...run,
    hintsUsed: [...run.hintsUsed, nextLevel],
    lastFeedback: `Hint ${hint.level}: ${hint.text}`,
    actionLog: [
      ...run.actionLog,
      {
        actionId: `hint:${nextLevel}`,
        label: `Used hint ${nextLevel}`,
        at: Date.now(),
        kind: "hint",
        feedback: hint.text,
        outcome: "neutral",
      },
    ],
  };
}

export function toggleHypothesis(run: RunState, hypothesisId: string): RunState {
  const has = run.hypothesesSelected.includes(hypothesisId);
  return {
    ...run,
    hypothesesSelected: has
      ? run.hypothesesSelected.filter((id) => id !== hypothesisId)
      : [...run.hypothesesSelected, hypothesisId],
  };
}

export function canVerify(scenario: Scenario, run: RunState): boolean {
  return evaluateAll(scenario.verificationSteps, toCtx(run));
}

export function verify(scenario: Scenario, run: RunState): RunState {
  const ctx = toCtx(run);
  const failed = scenario.verificationSteps
    .filter((c) => !evaluateCondition(c, ctx))
    .map(conditionLabel);

  const logEntry: LearnerActionRecord = {
    actionId: "verify",
    label: failed.length ? "Verification failed" : "Verification passed",
    at: Date.now(),
    kind: "verify",
    outcome: failed.length ? "wrong" : "ok",
    feedback: failed.length ? `Still failing: ${failed.join("; ")}` : "All checks passed",
  };

  if (failed.length) {
    return {
      ...run,
      status: "in_progress",
      lastVerifyFailures: failed,
      lastFeedback: `Not fixed yet. Failing checks: ${failed.join("; ")}`,
      actionLog: [...run.actionLog, logEntry],
    };
  }

  const success = evaluateAll(scenario.successConditions, ctx);
  if (!success) {
    return {
      ...run,
      status: "in_progress",
      lastVerifyFailures: ["Success conditions not fully met"],
      lastFeedback: "Checks look better, but the issue is not fully resolved.",
      actionLog: [...run.actionLog, logEntry],
    };
  }

  return {
    ...run,
    status: "verified",
    lastVerifyFailures: [],
    lastFeedback: "Verification passed — root cause resolved.",
    completedAt: Date.now(),
    actionLog: [...run.actionLog, logEntry],
  };
}

export function completeRun(run: RunState): RunState {
  return { ...run, status: "completed" };
}

export function isActionAvailable(_scenario: Scenario, run: RunState, action: ActionDef): boolean {
  if (run.appliedActions.includes(action.id)) return false;
  if (action.appliesWhen && !evaluateCondition(action.appliesWhen, toCtx(run))) return false;
  return true;
}

export function availableActions(scenario: Scenario, run: RunState): ActionDef[] {
  return scenario.actions.filter((a) => isActionAvailable(scenario, run, a));
}
