import type { DeviceFamilyId } from "@/content/schema";
import type { FamilyDef, State } from "./types";
import { printerFamily } from "./families/printer";
import { routerFamily } from "./families/router";
import { switchFamily } from "./families/switch";
import { accessPointFamily } from "./families/accessPoint";
import { upsFamily } from "./families/ups";
import { patchPanelFamily } from "./families/patchPanel";

export const FAMILIES: Record<DeviceFamilyId, FamilyDef> = {
  printer: printerFamily,
  router: routerFamily,
  switch: switchFamily,
  "access-point": accessPointFamily,
  ups: upsFamily,
  "patch-panel": patchPanelFamily,
};

export function getFamily(id: DeviceFamilyId | undefined | null): FamilyDef | null {
  if (!id) return null;
  return FAMILIES[id] ?? null;
}

/** The family's slice of `run.world` (empty object when absent). */
export function familyState(world: Record<string, unknown>, family: FamilyDef): State {
  const raw = world[family.worldKey];
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as State)
    : {};
}
