import type { EvaluationGrade, Scenario } from "@/content/schema";
import {
  evaluateActionText,
  normalizeActionInput,
  scoreForGrade,
  type EvaluationResult,
} from "./evaluation";
import { applyAction, type RunState } from "./scenario";

export type PipelineStage =
  | "input"
  | "normalization"
  | "action-id"
  | "evaluation"
  | "patch"
  | "unknown";

export interface NormalizationTrace {
  input: string;
  stage: PipelineStage;
  actionId?: string;
  confidence: number;
  grade?: EvaluationGrade;
  scoreDelta?: number;
}

export interface NormalizedActionResult {
  stage: PipelineStage;
  evaluation: EvaluationResult;
  run: RunState;
  applied: boolean;
  trace: NormalizationTrace;
}

/**
 * INPUT → NORMALIZATION → ACTION ID → EVALUATION → PATCH.
 * Interim deterministic string match; world patch only when action is available.
 */
export function processLearnerInput(
  scenario: Scenario,
  run: RunState,
  text: string,
): NormalizedActionResult {
  const normalized = normalizeActionInput(scenario, text);
  if (!normalized.action) {
    const evaluation = evaluateActionText(scenario, run, text);
    return {
      stage: "unknown",
      evaluation,
      run,
      applied: false,
      trace: {
        input: text,
        stage: "unknown",
        confidence: normalized.confidence,
        grade: evaluation.grade,
        scoreDelta: evaluation.scoreDelta,
      },
    };
  }

  const evaluation = evaluateActionText(scenario, run, text);
  let next = run;
  let applied = false;

  const canApply =
    !evaluation.alreadyApplied &&
    !evaluation.unavailable &&
    evaluation.grade !== "unknown" &&
    evaluation.grade !== "unnecessary";

  if (canApply) {
    const beforeCount = next.appliedActions.length;
    next = applyAction(scenario, run, normalized.action.id);
    applied = next.appliedActions.length > beforeCount;
  }

  return {
    stage: applied ? "patch" : evaluation.unavailable ? "evaluation" : "action-id",
    evaluation: { ...evaluation, scoreDelta: scoreForGrade(evaluation.grade) },
    run: next,
    applied,
    trace: {
      input: text,
      stage: applied ? "patch" : "evaluation",
      actionId: normalized.action.id,
      confidence: normalized.confidence,
      grade: evaluation.grade,
      scoreDelta: evaluation.scoreDelta,
    },
  };
}
