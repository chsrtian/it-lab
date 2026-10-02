import type { Scenario } from "@/content/schema";
import type { DeviceFamilyId } from "@/content/schema";
import type { RunState } from "@/engine";
import { componentActions } from "../interaction";
import type { HotspotData, IndicatorTone } from "@/features/env";
import type { StatusTone } from "@/components/ui";
import { getFamily, familyState } from "./registry";
import type { EvidenceEntry, State } from "./types";

function readPath(state: State, path: string): unknown {
  let cur: unknown = state;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function rawRow(
  label: string,
  raw: unknown,
): { label: string; value: string; tone: StatusTone } | null {
  if (raw === undefined) return null;
  if (typeof raw === "boolean") {
    return { label, value: raw ? "ok" : "fail", tone: raw ? "ok" : "crit" };
  }
  if (Array.isArray(raw)) {
    return { label, value: raw.map((v) => String(v)).join(", "), tone: "unknown" };
  }
  if (raw !== null && typeof raw === "object") return null;
  return { label, value: String(raw), tone: "unknown" };
}

function evidenceRows(
  family: ReturnType<typeof getFamily>,
  state: State,
  entry: EvidenceEntry,
): { label: string; value: string; tone: StatusTone }[] {
  if (!family) return [];
  if (typeof entry === "string") {
    const row = rawRow(family.labels[entry] ?? entry, readPath(state, entry));
    return row ? [row] : [];
  }
  if ("path" in entry) {
    if (entry.when && readPath(state, entry.when) !== true) return [];
    const row = rawRow(family.labels[entry.path] ?? entry.path, readPath(state, entry.path));
    return row ? [row] : [];
  }
  const tone: StatusTone = entry.tone ? entry.tone(state) : "unknown";
  if (entry.when && readPath(state, entry.when) !== true) return [];
  return [{ label: entry.label, value: entry.value(state), tone }];
}

function toneOfIndicator(t: IndicatorTone): StatusTone {
  return t === "off" ? "unknown" : t;
}

/**
 * Pure hotspot builder shared by the equipment SVG and the 3D projection —
 * both renderers are projections of one world state (never per-scenario UI).
 */
export function buildEquipmentHotspot(
  scenario: Scenario,
  run: RunState,
  compId: string,
): HotspotData | null {
  const family = getFamily(scenario.environment.deviceFamily);
  if (!family) return null;
  const meta = family.components.find((c) => c.id === compId);
  if (!meta) return null;

  const state = familyState(run.world, family);
  const view = family.componentState(compId, state);

  const evidence = meta.evidence.flatMap((entry) => evidenceRows(family, state, entry));

  const actions = componentActions(scenario, run, compId);
  const related = actions.find((action) => !action.applied && !action.disabled) ?? actions[0];

  return {
    id: compId,
    label: meta.label,
    identity: meta.identity,
    stateSummary: view.label,
    stateTone: view.tone,
    evidence,
    description: meta.description,
    actions,
    relatedAction: related,
    learnKb: meta.learnKb,
  };
}

export { toneOfIndicator };

/**
 * Narrow the shared `focusTarget.componentId` enum (which also carries
 * hardware bench ids) to a component of this scenario's equipment family.
 */
export function equipmentFocusComponent(environment: {
  focusTarget?: { componentId?: string };
  deviceFamily?: DeviceFamilyId;
}): string | null {
  const id = environment.focusTarget?.componentId;
  if (!id) return null;
  const family = getFamily(environment.deviceFamily);
  return family && family.components.some((c) => c.id === id) ? id : null;
}

/** Same narrowing for `focusTarget.cameraPreset` against family presets. */
export function equipmentFocusPreset(environment: {
  focusTarget?: { cameraPreset?: string };
  deviceFamily?: DeviceFamilyId;
}): string | null {
  const id = environment.focusTarget?.cameraPreset;
  if (!id) return null;
  const family = getFamily(environment.deviceFamily);
  return family && family.cameraPresets.some((p) => p.id === id) ? id : null;
}
