import type { Scenario } from "@/content/schema";
import type { RunState } from "./scenario";
import { evaluateActionDef, scoreForGrade } from "./evaluation";

export interface ScoreBreakdown {
  total: number;
  max: number;
  diagnosticPoints: number;
  fixPoints: number;
  evidencePoints: number;
  hintPenalty: number;
  wrongPenalty: number;
  usedHints: number;
  wrongActions: number;
  grade: "excellent" | "good" | "passing" | "needs-work";
}

const EVIDENCE_COMMANDS = new Set([
  "ping-ok",
  "ping-fail",
  "nslookup-ok",
  "nslookup-fail",
  "nslookup-nxdomain",
  "ipconfig",
  "ip-a",
  "tracert-ok",
  "tracert-fail",
  "ls",
  "whoami",
  "id",
  "pwd",
  "systemctl-status",
  "journalctl",
  "df",
]);

function weights(scenario: Scenario) {
  return {
    diagnosticWeight: scenario.scoring?.diagnosticWeight ?? 2,
    fixWeight: scenario.scoring?.fixWeight ?? 5,
    hintPenalty: scenario.scoring?.hintPenalty ?? 3,
    wrongActionPenalty: scenario.scoring?.wrongActionPenalty ?? 2,
    maxScore: scenario.scoring?.maxScore ?? 100,
  };
}

export function scoreRun(scenario: Scenario, run: RunState): ScoreBreakdown {
  const w = weights(scenario);
  let diagnosticPoints = 0;
  let fixPoints = 0;
  let evidencePoints = 0;
  let wrongActions = 0;

  for (const entry of run.actionLog) {
    if (entry.kind === "hint" || entry.kind === "verify") continue;
    if (entry.kind === "terminal") continue;
    const action = scenario.actions.find((a) => a.id === entry.actionId);
    if (!action) continue;
    if (entry.outcome === "wrong") {
      wrongActions += 1;
      continue;
    }
    const evaluation = evaluateActionDef(action, false);
    const delta = scoreForGrade(evaluation.grade);
    if (delta <= 0) continue;
    if (action.isFix) fixPoints += w.fixWeight;
    else if (action.isDiagnostic) diagnosticPoints += w.diagnosticWeight;
    else diagnosticPoints += Math.max(1, w.diagnosticWeight - 1);
  }

  const seenEvidence = new Set<string>();
  for (const cmd of run.ranCommands) {
    const base = cmd.startsWith("cat:") || cmd.startsWith("grep:") || cmd.startsWith("systemctl-status-")
      ? cmd.split(":")[0] + (cmd.startsWith("systemctl") ? "-status" : "")
      : cmd;
    if (EVIDENCE_COMMANDS.has(cmd) || EVIDENCE_COMMANDS.has(base)) {
      if (!seenEvidence.has(cmd)) {
        seenEvidence.add(cmd);
        evidencePoints += 1;
      }
    }
  }

  const usedHints = run.hintsUsed.length;
  const raw =
    diagnosticPoints +
    fixPoints +
    evidencePoints -
    usedHints * w.hintPenalty -
    wrongActions * w.wrongActionPenalty;
  const total = Math.max(0, Math.min(w.maxScore, raw));

  let grade: ScoreBreakdown["grade"] = "needs-work";
  if (run.status === "verified" || run.status === "completed") {
    const ratio = total / w.maxScore;
    if (ratio >= 0.85) grade = "excellent";
    else if (ratio >= 0.65) grade = "good";
    else grade = "passing";
  } else if (total >= 40) {
    grade = "passing";
  }

  return {
    total,
    max: w.maxScore,
    diagnosticPoints,
    fixPoints,
    evidencePoints,
    hintPenalty: usedHints * w.hintPenalty,
    wrongPenalty: wrongActions * w.wrongActionPenalty,
    usedHints,
    wrongActions,
    grade,
  };
}

export function nextHintLevel(scenario: Scenario, run: RunState): number | null {
  const next = run.hintsUsed.length + 1;
  if (next > scenario.hints.length) return null;
  return next;
}

export function hintPreview(scenario: Scenario, run: RunState): {
  level: number;
  category: string;
  locked: boolean;
}[] {
  return scenario.hints.map((h) => ({
    level: h.level,
    category: h.category ?? "method",
    locked: !run.hintsUsed.includes(h.level),
  }));
}
