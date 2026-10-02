import { nextTroubleshootingStep, resolveGuideInteraction } from "./interactionContract";
import { availableActions } from "./scenario";
import type { ConversationScript, Scenario } from "@/content/schema";
import type { EvaluationGrade } from "@/content/schema";
import { evaluateActionText, type EvaluationResult } from "./evaluation";
import { evaluateCondition, type EvalContext } from "./conditions";
import type { RunState } from "./scenario";

export interface ConversationMessage {
  id: string;
  role: "customer" | "mentor" | "learner";
  text: string;
  at: number;
  evaluation?: EvaluationGrade;
  actionId?: string;
}

export interface ConversationState {
  messages: ConversationMessage[];
  revealedConcepts: string[];
  askedCustomerKeys: string[];
  mentorTipsShown: number;
}

function defaultScript(scenario: Scenario): ConversationScript {
  return {
    persona: scenario.ticket.user,
    opening: scenario.ticket.symptomPlainLanguage,
    followUpQuestions: [
      "When did you first notice this?",
      "Has anything changed on this machine recently?",
      "Does the same thing happen for other users?",
    ],
    replies: [],
    defaultReply:
      "I am not sure — I only know what I see from my side. Can you check something on the machine?",
    mentorPrompts: [
      "State your next diagnostic step in plain language, then apply it.",
      "Confirm the hypothesis with evidence before making changes.",
    ],
  };
}

export function getConversationScript(scenario: Scenario): ConversationScript {
  return scenario.conversation ?? defaultScript(scenario);
}

export function createConversation(scenario: Scenario): ConversationState {
  const script = getConversationScript(scenario);
  return {
    messages: [
      {
        id: "c-open",
        role: "customer",
        text: script.opening,
        at: Date.now(),
      },
    ],
    revealedConcepts: [],
    askedCustomerKeys: [],
    mentorTipsShown: 0,
  };
}

function matchReply(
  script: ConversationScript,
  question: string,
  asked: string[],
  ctx?: EvalContext,
): { response: string; key: string; reveals: string[] } | undefined {
  const q = question.toLowerCase();
  let best:
    | { reply: (typeof script.replies)[number]; score: number }
    | undefined;

  for (const reply of script.replies) {
    if (reply.once && asked.includes(reply.match[0])) continue;
    if (reply.when) {
      if (!ctx || !evaluateCondition(reply.when, ctx)) continue;
    }
    let score = 0;
    for (const needle of reply.match) {
      const n = needle.toLowerCase();
      if (q.includes(n)) score = Math.max(score, 1);
      else {
        const tokens = n.split(/\s+/).filter((t) => t.length > 3);
        const hits = tokens.filter((t) => q.includes(t)).length;
        if (tokens.length > 0 && hits / tokens.length >= 0.5) {
          score = Math.max(score, hits / tokens.length);
        }
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { reply, score };
    }
  }

  if (!best) return undefined;
  return {
    response: best.reply.response,
    key: best.reply.match[0],
    reveals: best.reply.revealsConcepts,
  };
}

export function askCustomer(
  scenario: Scenario,
  state: ConversationState,
  question: string,
  run?: RunState,
): ConversationState {
  const script = getConversationScript(scenario);
  const trimmed = question.trim();
  if (!trimmed) return state;

  const learnerMsg: ConversationMessage = {
    id: `l-${Date.now()}`,
    role: "learner",
    text: trimmed,
    at: Date.now(),
  };

  const ctx: EvalContext | undefined = run
    ? {
        world: run.world,
        ranCommands: new Set(run.ranCommands),
        appliedActions: run.appliedActions,
      }
    : undefined;
  const hit = matchReply(script, trimmed, state.askedCustomerKeys, ctx);
  const responseText = hit?.response ?? script.defaultReply;
  const customerMsg: ConversationMessage = {
    id: `c-${Date.now()}`,
    role: "customer",
    text: responseText,
    at: Date.now() + 1,
  };

  const newConcepts = hit?.reveals ?? [];
  return {
    ...state,
    messages: [...state.messages, learnerMsg, customerMsg],
    revealedConcepts: [...new Set([...state.revealedConcepts, ...newConcepts])],
    askedCustomerKeys: hit ? [...state.askedCustomerKeys, hit.key] : state.askedCustomerKeys,
  };
}

const GRADE_LABEL: Record<string, string> = {
  optimal: "Strong diagnostic move",
  good: "Good next step",
  reasonable: "Reasonable, but weak evidence",
  "low-value": "Low-value step — keep hunting for stronger evidence",
  premature: "Premature — you need more evidence first",
  unnecessary: "Already done",
  unknown: "Unrecognized step",
  risky: "Risky without confirmation",
  wrong: "Off track",
  harmful: "Harmful — avoid",
};

export interface MentorEvaluation extends EvaluationResult {
  reply: string;
  learnMore?: string;
}

export interface LearningLoopCard {
  actionLabel: string;
  evaluation: EvaluationGrade;
  rationale: string;
  evidenceGain?: string;
  learned: string[];
  stillUnknown: string[];
  nextOptions: string[];
  learnMore?: string;
}

export function buildLearningLoop(
  scenario: Scenario,
  run: RunState,
  evaluation: EvaluationResult,
  actionLabel: string,
): LearningLoopCard {
  const learned: string[] = [];
  if (evaluation.evidenceGain) learned.push(evaluation.evidenceGain);
  const applied = new Set(run.appliedActions);
  for (const a of scenario.actions) {
    if (a.isDiagnostic && applied.has(a.id) && a.evaluation?.evidenceGain) {
      if (!learned.includes(a.evaluation.evidenceGain)) {
        learned.push(a.evaluation.evidenceGain);
      }
    }
  }
  if (learned.length === 0) learned.push("No new evidence recorded yet.");

  const stillUnknown = scenario.actions
    .filter((action) => action.isDiagnostic && !applied.has(action.id))
    .slice(0, 2).map((action) => "Not yet tested: " + action.label);
  if (!stillUnknown.length) stillUnknown.push("Confirm the repair with final verification.");

  const step = nextTroubleshootingStep(scenario, run);
  const nextOptions = step
    ? [resolveGuideInteraction(step, scenario).instruction]
    : scenario.guidedWalkthrough
      ? ["Run Verify fix to confirm the repaired system."]
      : availableActions(scenario, run)
          .filter((action) => !applied.has(action.id) && action.evaluation?.grade === "optimal")
          .slice(0, 1).map((action) => action.label);
  if (!nextOptions.length) nextOptions.push("Review the recorded evidence, then verify the fix.");

  return {
    actionLabel,
    evaluation: evaluation.grade,
    rationale: evaluation.rationale,
    evidenceGain: evaluation.evidenceGain,
    learned,
    stillUnknown,
    nextOptions,
    learnMore: evaluation.learnMore ?? "troubleshooting-method",
  };
}

export function submitDiagnosis(
  scenario: Scenario,
  run: RunState,
  text: string,
): MentorEvaluation {
  const evaluation = evaluateActionText(scenario, run, text);
  const header = GRADE_LABEL[evaluation.grade] ?? "Noted";
  let reply = `${header}. ${evaluation.rationale}`;
  if (evaluation.grade === "unknown") {
    reply += " Tip: inspect the environment or use the action list for known steps.";
  } else if (evaluation.grade === "optimal" || evaluation.grade === "good") {
    reply += " Apply it when ready and record the evidence it produces.";
  } else if (evaluation.grade === "premature") {
    reply += " Try a cheaper check first so your next step is justified.";
  } else if (evaluation.grade === "low-value") {
    reply += " Prefer actions that directly test a hypothesis.";
  }

  return { ...evaluation, reply };
}

export function explainConcept(
  scenario: Scenario,
  state: ConversationState,
  concept: string,
): ConversationState {
  const key = normalizeConcept(concept);
  if (!key) return state;
  const explanation =
    CONCEPT_GLOSSARY[key] ??
    scenario.conversation?.mentorPrompts.find((p) =>
      normalizeConcept(p).includes(key),
    );

  const text = explanation
    ? `Concept — ${key}: ${explanation}`
    : `I do not have a glossary entry for "${key}" yet. Try asking about DNS, DHCP, permissions, services, or evidence-first troubleshooting.`;

  return {
    ...state,
    revealedConcepts: [...new Set([...state.revealedConcepts, key])],
    messages: [
      ...state.messages,
      {
        id: `m-${Date.now()}`,
        role: "mentor",
        text,
        at: Date.now(),
      },
    ],
  };
}

function normalizeConcept(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const CONCEPT_GLOSSARY: Record<string, string> = {
  dns: "DNS turns names into IP addresses. When lookups fail, confirm the resolver path before changing hosts.",
  dhcp: "DHCP hands out IP, gateway, and DNS settings. Addressing problems often start here.",
  gateway: "The default gateway is the exit from your local subnet. No gateway means no route off-LAN.",
  permissions: "Unix permissions decide who can read, write, or execute. Match the mode to the process that needs access.",
  "least-privilege": "Grant only the minimum access required for the job, and only for as long as needed.",
  services: "Services are long-running programs. Check unit status and recent logs before restarting blindly.",
  systemd: "systemd manages Linux services via units. status, start, stop, and restart are the core verbs.",
  "event-logs": "Windows Event Viewer records system, security, and application history. Start with the timestamp of the failure.",
  "boot-repair": "Boot failures often stem from BCD, disk order, or missing partitions. Confirm disk health before repair tools.",
  phishing: "Phishing uses urgency and fake authority to steal credentials. Verify the sender and never open unexpected attachments.",
  evidence: "Evidence-first troubleshooting means observe and test before you change state.",
  hypothesis: "A hypothesis is a testable claim about the root cause. Design the next action to confirm or reject it.",
  "name-resolution": "Name resolution is the path from hostname to IP. Break it into steps: client config, resolver, zone data.",
  "ip-conflict": "Duplicate IPs break reachability. Check DHCP reservations and static assignments on the same subnet.",
  "disk-space": "Low free space degrades performance and can break updates. Find the consumer before deleting blindly.",
  "database-connection": "DB connection failures are usually wrong host/port/credentials or a service that is not listening.",
  "account-lockout": "Account lockouts follow repeated failed logins. Find the source device before unlocking.",
  "system-logs": "System logs are the timeline of a host. Align entries with the incident window.",
};

export function mentorHint(scenario: Scenario, state: ConversationState): ConversationState {
  const script = getConversationScript(scenario);
  if (state.mentorTipsShown >= script.mentorPrompts.length) return state;
  const tip = script.mentorPrompts[state.mentorTipsShown];
  return {
    ...state,
    mentorTipsShown: state.mentorTipsShown + 1,
    messages: [
      ...state.messages,
      {
        id: `m-${Date.now()}`,
        role: "mentor",
        text: tip,
        at: Date.now(),
      },
    ],
  };
}
