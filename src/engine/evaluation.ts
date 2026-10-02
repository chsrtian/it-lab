import type { ActionDef, EvaluationGrade, Scenario } from "@/content/schema";
import { evaluateCondition } from "./conditions";

export interface EvaluationResult {
  grade: EvaluationGrade;
  rationale: string;
  actionId?: string;
  scoreDelta: number;
  evidenceGain?: string;
  learnMore?: string;
  alreadyApplied?: boolean;
  unavailable?: boolean;
}

const GRADE_SCORE: Record<EvaluationGrade, number> = {
  optimal: 10,
  good: 7,
  reasonable: 4,
  "low-value": 1,
  premature: -1,
  unnecessary: 0,
  unknown: 0,
  risky: -1,
  wrong: -3,
  harmful: -6,
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "your",
  "are",
  "was",
  "have",
  "has",
  "from",
  "into",
  "then",
  "than",
  "when",
  "what",
  "how",
  "why",
  "can",
  "should",
  "would",
  "could",
  "about",
  "first",
  "then",
  "try",
  "check",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contentTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function tokenOverlap(input: string, candidate: string): number {
  const a = new Set(contentTokens(input));
  const b = new Set(contentTokens(candidate));
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return hits / Math.max(a.size, b.size);
}

export function inferGrade(action: ActionDef, applied: boolean): EvaluationGrade {
  if (applied) return "unnecessary";
  if (action.evaluation) return action.evaluation.grade;
  if (action.isFix) return "optimal";
  if (action.isDiagnostic) return "good";
  return "reasonable";
}

export function scoreForGrade(grade: EvaluationGrade): number {
  return GRADE_SCORE[grade] ?? 0;
}

export interface NormalizedInput {
  actionId?: string;
  action?: ActionDef;
  confidence: number;
  normalizedText: string;
}

/** INPUT → NORMALIZATION → ACTION ID (interim deterministic matcher). */
function rankActions(
  scenario: Scenario,
  text: string,
): { action: ActionDef; score: number }[] {
  const normalized = normalize(text);
  const tokens = contentTokens(text);
  const ranked: { action: ActionDef; score: number }[] = [];

  for (const action of scenario.actions) {
    const candidates = [
      action.label,
      action.id.replace(/-/g, " "),
      ...(action.matchHints ?? []),
    ];
    let score = 0;
    for (const candidate of candidates) {
      const candNorm = normalize(candidate);
      score = Math.max(score, tokenOverlap(normalized, candidate));
      if (candNorm && normalized.includes(candNorm)) score = Math.max(score, 0.95);
      const candTokens = contentTokens(candidate);
      if (candTokens.length > 0) {
        const hits = candTokens.filter((t) => tokens.includes(t)).length;
        const coverage = hits / candTokens.length;
        if (coverage >= 0.6) score = Math.max(score, 0.6 + coverage * 0.35);
      }
    }
    if (score >= 0.55) ranked.push({ action, score });
  }

  // Stable sort: ties keep scenario action order, so the earliest action wins
  // (the first run of a shared command matches the first step that uses it).
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export function normalizeActionInput(
  scenario: Scenario,
  text: string,
): NormalizedInput {
  const best = rankActions(scenario, text)[0];
  return {
    actionId: best?.action.id,
    action: best?.action,
    confidence: best?.score ?? 0,
    normalizedText: normalize(text),
  };
}

export function matchActionByText(
  scenario: Scenario,
  text: string,
  appliedActions?: readonly string[],
): ActionDef | undefined {
  const ranked = rankActions(scenario, text);
  const top = ranked[0];
  if (!top) return undefined;
  if (!appliedActions || !appliedActions.includes(top.action.id)) return top.action;
  // The best match is already applied. Two guided steps may share one command
  // (run a lookup to see the failure, run it again to verify the fix), so fall
  // back to the best NOT-yet-applied action — but only when it scores at least
  // as high as the applied one, so re-running a diagnostic can never drag in a
  // merely-similar later action ("systemctl status x" must not apply "restart").
  const pending = ranked.find((r) => !appliedActions.includes(r.action.id));
  return pending && pending.score >= top.score ? pending.action : top.action;
}

export function evaluateActionText(
  scenario: Scenario,
  run: {
    appliedActions: string[];
    world: Record<string, unknown>;
    ranCommands: string[];
  },
  text: string,
): EvaluationResult {
  const normalized = normalizeActionInput(scenario, text);
  const action = normalized.action;
  if (!action) {
    return {
      grade: "unknown",
      rationale:
        "I could not map that to a known diagnostic step. Try inspecting the environment or asking a clarifying question first.",
      scoreDelta: 0,
      learnMore: "troubleshooting-method",
    };
  }

  const applied = run.appliedActions.includes(action.id);
  let grade = inferGrade(action, applied);

  if (!applied && action.appliesWhen && grade !== "harmful" && grade !== "wrong" && grade !== "risky") {
    const ready = evaluateCondition(action.appliesWhen, {
      world: run.world,
      ranCommands: new Set(run.ranCommands),
      appliedActions: run.appliedActions,
    });
    if (!ready) {
      grade = "premature";
    }
  }

  const rationale =
    action.evaluation?.rationale ??
    (applied
      ? "That step was already completed earlier in this session."
      : grade === "premature"
        ? "You cannot justify that step yet — gather more evidence so your next move is grounded."
        : action.feedback ??
          (action.isFix
            ? "This is a corrective action — confirm evidence before applying."
            : action.isDiagnostic
              ? "Gathering evidence before changing state is the right approach."
              : "Review whether this step advances your hypothesis."));

  return {
    grade,
    rationale,
    actionId: action.id,
    scoreDelta: scoreForGrade(grade),
    evidenceGain: action.evaluation?.evidenceGain,
    learnMore: action.evaluation?.learnMore,
    alreadyApplied: applied,
    unavailable: grade === "premature",
  };
}

export function evaluateActionDef(
  action: ActionDef,
  applied: boolean,
): EvaluationResult {
  const grade = inferGrade(action, applied);
  return {
    grade,
    rationale:
      action.evaluation?.rationale ??
      (applied
        ? "Already applied."
        : action.feedback ?? "Action recorded."),
    actionId: action.id,
    scoreDelta: scoreForGrade(grade),
    evidenceGain: action.evaluation?.evidenceGain,
    alreadyApplied: applied,
  };
}
