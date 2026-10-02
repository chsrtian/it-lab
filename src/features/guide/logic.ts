import { isStepComplete } from "@/engine/interactionContract";
export { isStepComplete, resolveGuideInteraction } from "@/engine/interactionContract";
import type { Condition, GuidedStep, Scenario } from "@/content/schema";
import { environmentSchema, GUIDE_CUES } from "@/content/schema";
import { getArticle } from "@/content";
import { type RunState, getCommandDisplay } from "@/engine";

export { GUIDE_CUES };

/**
 * Targetable lab objects that are NOT listed in `environment.components` but
 * resolve to real DOM anchors (`data-guide-anchor` / ReactFlow `data-id`) in
 * `GuideTargetLayer`. Keep in sync with the labs that render them.
 */
export const EXTRA_GUIDE_TARGET_IDS = [
  "terminal", // ScenarioPage dock terminal button/panel
  "customer", // ScenarioPage dock customer button
  "actions", // ScenarioPage dock actions button
  "evidence", // ScenarioPage dock evidence button
  "hints", // ScenarioPage dock hints button
  "learn", // ScenarioPage dock learn button
  "journal", // ScenarioPage dock journal button
  "dev", // ScenarioPage dock dev button
  "host",
  "gateway",
  "dhcp",
  "dns",
  "internet", // NetworkLab topology nodes
  "printer-panel", // fine-grained printer sub-anchor (PrinterSvg control panel)
] as const;

/** Derived guide position — never stored, never a parallel state machine. */
export interface GuideProgress {
  hasGuide: boolean;
  status: "hidden" | "active" | "complete";
  /** 0-based current step; `total` when complete; 0 when hidden. */
  index: number;
  /** Current step, or null when hidden or complete. */
  step: GuidedStep | null;
  total: number;
}

/**
 * A step is complete when every trigger it declares holds against the REAL
 * RunState: the scenario action was applied, the engine command ran, and/or
 * the completion condition (world flags / evidence gates) evaluates true.
 *
 * `commandId` only gates completion when it is the step's ONLY trigger. When
 * the step also names an action, the command is the display/validation
 * contract (what to type, which allowlist entry it needs) and completion
 * follows the action — the terminal engine emits dynamic command ids
 * ("cat:/etc/app.conf", "systemctl-status:nginx") that would otherwise leave
 * a step permanently stuck even though its action was applied.
 */

/**
 * Derives the current guide step as the FIRST incomplete step in walkthrough
 * order. Reopening the guide, exiting mid-way, or acting out of order all
 * resolve from the simulation itself — there is no stored progress.
 */
export function guideProgress(scenario: Scenario, run: RunState): GuideProgress {
  const walkthrough = scenario.guidedWalkthrough;
  if (!walkthrough) {
    return { hasGuide: false, status: "hidden", index: 0, step: null, total: 0 };
  }
  const total = walkthrough.steps.length;
  const index = walkthrough.steps.findIndex((step) => !isStepComplete(step, run));
  if (index === -1) {
    return { hasGuide: true, status: "complete", index: total, step: null, total };
  }
  return { hasGuide: true, status: "active", index, step: walkthrough.steps[index] ?? null, total };
}

/**
 * Content validation for authored walkthroughs: unique step ids, at least one
 * completion trigger per step, and referential integrity against the
 * scenario's actions, visible components, camera presets, and KB articles.
 * `commandId` is validated for resolvability (registry entry, shell, and
 * terminal allowlist) on every TYPE step via `validateCueAffordance`.
 * Returns human-readable errors; empty array = valid.
 */
export function validateGuidedWalkthrough(scenario: Scenario): string[] {
  const walkthrough = scenario.guidedWalkthrough;
  if (!walkthrough) return [];
  const errors: string[] = [];
  const visibleTargets = new Set<string>([
    ...scenario.environment.components,
    ...EXTRA_GUIDE_TARGET_IDS,
  ]);
  const cameraPresets = new Set<string>(
    environmentSchema.shape.focusTarget.unwrap().shape.cameraPreset.options,
  );
  const seen = new Set<string>();
  walkthrough.steps.forEach((step, i) => {
    const at = `guided step ${i + 1} (${step.id})`;
    if (seen.has(step.id)) errors.push(`${at}: duplicate step id "${step.id}"`);
    seen.add(step.id);
    if (!step.actionId && !step.commandId && !step.completeWhen) {
      errors.push(`${at}: missing completion trigger (actionId, commandId, or completeWhen)`);
    }
    if (step.actionId && !scenario.actions.some((a) => a.id === step.actionId)) {
      errors.push(`${at}: unknown actionId "${step.actionId}"`);
    }
    if (!visibleTargets.has(step.target.componentId)) {
      errors.push(
        `${at}: target.componentId "${step.target.componentId}" is not visible in this scenario`,
      );
    }
    if (step.target.cameraPreset && !cameraPresets.has(step.target.cameraPreset)) {
      errors.push(`${at}: unknown cameraPreset "${step.target.cameraPreset}"`);
    }
    if (step.conceptId && !getArticle(step.conceptId)) {
      errors.push(`${at}: unknown conceptId "${step.conceptId}"`);
    }
    errors.push(...validateCueAffordance(step, scenario));
  });
  return errors;
}

/**
 * Validates that a step's authored/derived cue matches an actual interaction
 * affordance on its target component. Prevents CLICK on INSPECT-only targets,
 * TYPE without a resolvable command, etc.
 */
export function validateCueAffordance(step: GuidedStep, scenario: Scenario): string[] {
  const errors: string[] = [];
  const cue = step.cue ?? guideStepCue(step, scenario);
  const at = `guided step (${step.id})`;
  const targetId = step.target.componentId;

  // Find the scenario action this step completes on
  const action = step.actionId
    ? scenario.actions.find((a) => a.id === step.actionId)
    : undefined;

  switch (cue) {
    case "CLICK": {
      // Must have a clickable UI affordance: Windows tab, Linux view button,
      // Network node/link, Security check, Equipment chain step, Hardware hotspot with kind="ui"
      const hasClickAffordance =
        action?.kind === "ui" ||
        ["event-viewer", "task-manager", "services", "device-manager", "storage", "filesystem", "process-list", "service-manager", "package-manager", "terminal", "backup-console"].includes(targetId) ||
        ["host", "gateway", "dhcp", "dns", "internet"].includes(targetId) ||
        ["printer-panel", "printer-network", "printer-paper", "printer-cartridge", "router", "router-wan", "router-lan", "router-dhcp", "router-nat", "switch", "switch-port", "switch-uplink", "switch-vlan", "access-point", "ap-radio", "ap-poe", "ups", "ups-input", "ups-output", "ups-battery", "patch-panel", "wall-jack", "ethernet-cable"].includes(targetId);
      if (!hasClickAffordance) {
        errors.push(`${at}: cue "CLICK" but target "${targetId}" has no clickable affordance (action kind=${action?.kind})`);
      }
      break;
    }

    case "TOGGLE": {
      // Must target a toggleable control: PSU rocker, service start/stop, etc.
      const hasToggleAffordance =
        action?.kind === "ui" &&
        (targetId === "power-supply" || targetId.includes("service") || targetId === "services");
      if (!hasToggleAffordance) {
        errors.push(`${at}: cue "TOGGLE" but target "${targetId}" has no toggle control`);
      }
      break;
    }

    case "CONNECT": {
      // Must be a cable/seatable component
      const hasConnectAffordance =
        ["cable", "power-supply", "front-panel", "ram", "gpu", "storage", "printer-network", "printer-cartridge", "router-wan", "router-lan", "switch-port", "switch-uplink", "ap-poe", "ups-input", "ups-output", "ethernet-cable", "patch-panel", "wall-jack"].includes(targetId);
      if (!hasConnectAffordance) {
        errors.push(`${at}: cue "CONNECT" but target "${targetId}" is not a connectable component`);
      }
      break;
    }

    case "INSPECT": {
      // Must open an inspector/evidence panel (action.kind === "inspect" OR target has inspector)
      const hasInspectAffordance =
        action?.kind === "inspect" ||
        (scenario.environment.components as readonly string[]).includes(targetId) ||
        (EXTRA_GUIDE_TARGET_IDS as readonly string[]).includes(targetId);
      if (!hasInspectAffordance) {
        errors.push(`${at}: cue "INSPECT" but target "${targetId}" has no inspector panel`);
      }
      break;
    }

    case "TYPE":
      // Must have a resolvable commandId that maps to a real command
      if (!step.commandId) {
        errors.push(`${at}: cue "TYPE" but no commandId on step`);
      } else if (!getCommandDisplay(step.commandId, scenario)) {
        errors.push(`${at}: cue "TYPE" but commandId "${step.commandId}" not resolvable for this scenario/shell`);
      }
      break;

    case "OBSERVE":
    case "VERIFY":
      // Read-only cues - no affordance needed, but warn if actionId present (should be OBSERVE)
      if (action?.kind === "ui" && cue === "OBSERVE") {
        errors.push(`${at}: cue "OBSERVE" but action "${step.actionId}" is kind="ui" (should be CLICK/TOGGLE/CONNECT)`);
      }
      break;
  }
  return errors;
}

/**
 * What the learner must DO for a step. When the schema authors a `cue` it is
 * authoritative (it is the reticle's label, the hint and the affordance).
 * Otherwise the cue is derived from the step's completion data
 * (action.kind, commandId, completeWhen) — CLICK/TYPE/INSPECT come straight
 * from the action vocabulary; OBSERVE is the honest fallback for read-only
 * steps.
 */
export type GuideCue = (typeof GUIDE_CUES)[number];

/** A physical object and the operation performed on it are distinct targets.
 * Rendering, instructions and audits consume this same resolved contract. */

function cueForAction(scenario: Scenario, actionId: string): GuideCue {
  const action = scenario.actions.find((candidate) => candidate.id === actionId);
  if (action?.kind === "terminal") return "TYPE";
  if (action?.kind === "inspect") return "INSPECT";
  return "CLICK";
}

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

function conditionRunsCommand(condition: Condition): boolean {
  switch (condition.type) {
    case "commandRan":
      return true;
    case "all":
    case "any":
      return condition.conditions.some(conditionRunsCommand);
    case "not":
      return conditionRunsCommand(condition.condition);
    default:
      return false;
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

export function guideStepCue(step: GuidedStep, scenario: Scenario): GuideCue {
  if (step.cue) return step.cue;
  if (step.actionId !== undefined) return cueForAction(scenario, step.actionId);
  if (step.commandId !== undefined) return "TYPE";
  if (step.completeWhen !== undefined) {
    if (conditionRunsCommand(step.completeWhen)) return "TYPE";
    // A world flag only flips through a scenario action — find the action
    // whose patch touches the same path and inherit its kind.
    for (const path of conditionPaths(step.completeWhen)) {
      const action = scenario.actions.find((candidate) =>
        patchTouchesPath(candidate.patch, path),
      );
      if (action) return cueForAction(scenario, action.id);
    }
    return "OBSERVE";
  }
  return "OBSERVE";
}

/**
 * The "DONE WHEN" line: what must be true for this step to count as done.
 * Authored text wins; otherwise it is stated from the completion trigger —
 * the learner is never left guessing what "done" means.
 */
export function guideStepDoneWhen(step: GuidedStep, scenario: Scenario): string {
  if (step.doneWhen) return step.doneWhen;
  if (step.actionId !== undefined) {
    const action = scenario.actions.find((candidate) => candidate.id === step.actionId);
    return `The action "${action?.label ?? step.actionId}" has been applied.`;
  }
  if (step.commandId !== undefined) {
    return "This step's command has run in the terminal.";
  }
  if (step.completeWhen !== undefined) {
    const condition = step.completeWhen;
    if (condition.type === "stateEquals") {
      return `The simulation reads ${condition.path} = ${JSON.stringify(condition.value)}.`;
    }
    const first = conditionPaths(condition)[0];
    return first
      ? `The simulation reads ${first} to be in the expected state.`
      : "The simulation has recorded this evidence.";
  }
  return "The simulation has recorded this step.";
}
