import type { IndicatorTone } from "@/features/env";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag, num } from "../types";

export const PATCH_PANEL_PORTS = 12;
export const PATCH_SWITCH_PORTS = 8;

export interface PatchVisuals {
  /** LED tone for each patch-panel port position (passive — always "off"; kept for layout). */
  panelMarks: IndicatorTone[];
  /** LED tone per switch port on the far end of the trace. */
  switchPortLeds: IndicatorTone[];
  /** Index of the switch port the patch cable currently lands on (0-based). */
  activeSwitchIndex: number;
  /** Index of the panel port the patch cable currently lands on (0-based). */
  activePanelIndex: number;
  /**
   * Index of the panel port the horizontal run lands on (0-based).
   * Null until the run has been toned out — `horizontalPort` is evidence
   * (`when: "horizontalTraced"`) and must not leak into geometry early.
   */
  activeRunIndex: number | null;
}

export function patchPanelVisuals(state: State): PatchVisuals {
  const switchPort = num(state, "switchPortNumber") ?? 1;
  const panelPort = num(state, "patchPanelPort") ?? 1;
  const runPort = num(state, "horizontalPort") ?? 1;
  const patchChecked = flag(state, "patchChecked");
  const linkComplete =
    flag(state, "pathOk") &&
    flag(state, "endpointPowered") &&
    flag(state, "switchPortEnabled");
  const leds: IndicatorTone[] = [];
  for (let i = 1; i <= PATCH_SWITCH_PORTS; i++) {
    if (i === switchPort) {
      if (!flag(state, "switchPortEnabled")) leds.push(patchChecked ? "warn" : "off");
      else if (linkComplete) leds.push("ok");
      else leds.push("off");
    } else {
      leds.push("off");
    }
  }
  return {
    panelMarks: Array.from({ length: PATCH_PANEL_PORTS }, () => "off" as IndicatorTone),
    switchPortLeds: leds,
    activeSwitchIndex: Math.min(Math.max(switchPort - 1, 0), PATCH_SWITCH_PORTS - 1),
    activePanelIndex: Math.min(Math.max(panelPort - 1, 0), PATCH_PANEL_PORTS - 1),
    activeRunIndex: flag(state, "horizontalTraced")
      ? Math.min(Math.max(runPort - 1, 0), PATCH_PANEL_PORTS - 1)
      : null,
  };
}

function status(state: State): FamilyStatus {
  const jackTraced = flag(state, "jackTraced");
  const patchChecked = flag(state, "patchChecked");
  const horizontalTraced = flag(state, "horizontalTraced");
  if (!flag(state, "endpointSeated")) return { tone: "crit", label: "Endpoint unplugged" };
  if (jackTraced && !flag(state, "horizontalSeated"))
    return { tone: "crit", label: "Keystone loose" };
  if (patchChecked && !flag(state, "patchSeated"))
    return { tone: "crit", label: "Patch cable loose" };
  if (horizontalTraced && state.panelMatch === false)
    return { tone: "crit", label: "Wrong panel port" };
  if (patchChecked && !flag(state, "switchPortEnabled"))
    return { tone: "warn", label: "Switch port down" };
  if (flag(state, "pathOk")) return { tone: "ok", label: "Linked" };
  if (!jackTraced || !horizontalTraced || !patchChecked)
    return { tone: "unknown", label: "Path not fully traced" };
  return { tone: "warn", label: "No link" };
}

function chain(state: State): ChainStepView[] {
  const jackTraced = flag(state, "jackTraced");
  const traced = flag(state, "horizontalTraced");
  const patchChecked = flag(state, "patchChecked");
  return [
    {
      id: "endpoint",
      label: "Endpoint",
      component: "ethernet-cable",
      state: flag(state, "endpointSeated") ? "Seated" : "Loose",
      tone: flag(state, "endpointSeated") ? "ok" : "crit",
    },
    {
      id: "jack",
      label: "Wall jack",
      component: "wall-jack",
      state: !jackTraced
        ? "Not probed"
        : flag(state, "horizontalSeated")
          ? "Terminated"
          : "Not terminated",
      tone: !jackTraced ? "unknown" : flag(state, "horizontalSeated") ? "ok" : "crit",
    },
    {
      id: "horizontal",
      label: "Horizontal run",
      component: "ethernet-cable",
      state: traced ? `Lands on panel ${num(state, "horizontalPort") ?? "?"}` : "Not traced",
      tone: traced ? "ok" : "unknown",
    },
    {
      id: "panel",
      label: "Panel port",
      component: "patch-panel",
      state: !traced
        ? "Untraced"
        : state.panelMatch === true
          ? `Port ${num(state, "patchPanelPort") ?? "?"} matches`
          : "Wrong port",
      tone: !traced ? "unknown" : state.panelMatch === true ? "ok" : "crit",
    },
    {
      id: "patch",
      label: "Patch cable",
      component: "ethernet-cable",
      state: !patchChecked
        ? "Not checked"
        : flag(state, "patchSeated")
          ? "Seated"
          : "Loose",
      tone: !patchChecked ? "unknown" : flag(state, "patchSeated") ? "ok" : "crit",
    },
    {
      id: "switch",
      label: "Switch port",
      component: "switch-port",
      state: flag(state, "switchPortEnabled")
        ? `Port ${num(state, "switchPortNumber") ?? "?"} enabled`
        : patchChecked
          ? `Port ${num(state, "switchPortNumber") ?? "?"} disabled`
          : "Not checked",
      tone: flag(state, "switchPortEnabled") ? "ok" : patchChecked ? "warn" : "unknown",
    },
  ];
}

function componentState(id: string, state: State): ComponentStateView {
  const jackTraced = flag(state, "jackTraced");
  const horizontalTraced = flag(state, "horizontalTraced");
  const patchChecked = flag(state, "patchChecked");
  switch (id) {
    case "wall-jack":
      if (!flag(state, "endpointSeated")) return { tone: "crit", label: "Patch to device loose" };
      if (!jackTraced) return { tone: "unknown", label: "Not probed yet" };
      if (!flag(state, "horizontalSeated")) return { tone: "crit", label: "Keystone not seated" };
      return { tone: "ok", label: "Terminated" };
    case "ethernet-cable": {
      if (!flag(state, "endpointSeated")) return { tone: "crit", label: "Device end loose" };
      if (!jackTraced) return { tone: "unknown", label: "Not traced past jack" };
      if (!flag(state, "horizontalSeated")) return { tone: "crit", label: "Run broken at jack" };
      if (!horizontalTraced) return { tone: "unknown", label: "Run not traced to panel" };
      if (state.panelMatch === false) return { tone: "crit", label: "Runs to a different port" };
      if (!patchChecked) return { tone: "unknown", label: "Patch lead not checked" };
      if (!flag(state, "patchSeated")) return { tone: "crit", label: "Patch end loose" };
      return { tone: "ok", label: "Cabling sound" };
    }
    case "patch-panel":
      if (!horizontalTraced) return { tone: "unknown", label: "Not traced yet" };
      if (state.panelMatch === false)
        return {
          tone: "crit",
          label: `Cable in ${num(state, "patchPanelPort") ?? "?"}, run lands on ${
            num(state, "horizontalPort") ?? "?"
          }`,
        };
      return { tone: "ok", label: `Port ${num(state, "patchPanelPort") ?? "?"} aligned` };
    case "switch-port":
      if (!flag(state, "switchPortEnabled"))
        return patchChecked
          ? { tone: "warn", label: "Admin down" }
          : { tone: "unknown", label: "Port not checked" };
      if (flag(state, "pathOk")) return { tone: "ok", label: "Link up" };
      return { tone: "crit", label: "No link" };
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

export const patchPanelFamily: FamilyDef = {
  id: "patch-panel",
  worldKey: "patch",
  label: "Patch panel",
  chainLabel: "Link path",
  labels: {
    endpointSeated: "Device patch",
    endpointPowered: "Device powered",
    jackTraced: "Jack probed",
    horizontalSeated: "Keystone",
    horizontalTraced: "Horizontal traced",
    horizontalPort: "Run lands on panel",
    patchPanelPort: "Patched into panel",
    labelPanelPort: "Label says",
    panelMatch: "Panel match",
    patchChecked: "Patch lead checked",
    patchSeated: "Patch cable",
    switchPortNumber: "Switch port",
    switchPortEnabled: "Port enabled",
    pathOk: "End-to-end link",
  },
  cameraPresets: [
    { id: "patch-full", label: "Path", pos: [0.55, 0.4, 0.75], target: [0, 0.05, 0] },
    { id: "patch-ports", label: "Panel ports", pos: [0.0, 0.18, 0.55], target: [0, 0.04, 0.18] },
    {
      id: "patch-wall-jack",
      label: "Wall jack",
      pos: [-0.62, 0.1, 0.34],
      target: [-0.4, 0.0, 0.12],
    },
  ],
  components: [
    {
      id: "patch-panel",
      label: "Patch panel",
      identity: "12-port Cat6 panel · comms cabinet",
      description:
        "Passive cross-connect. Each keystone lands a horizontal run from a wall jack; a patch cable then bridges to the switch. Labels can lie — trace before you trust.",
      evidence: [
        "labelPanelPort",
        "patchPanelPort",
        { path: "horizontalPort", when: "horizontalTraced" },
        { path: "panelMatch", when: "horizontalTraced" },
      ],
      learnKb: "network-cabling-basics",
    },
    {
      id: "wall-jack",
      label: "Wall jack",
      identity: "Keystone jack · desk 3-14",
      description:
        "The user-visible end. A jack that looks seated can still have an unseated keystone behind it.",
      evidence: [
        "endpointSeated",
        { path: "horizontalSeated", when: "jackTraced" },
        "endpointPowered",
      ],
    },
    {
      id: "ethernet-cable",
      label: "Cabling",
      identity: "Horizontal run + patch leads",
      description:
        "Two different cables in one path: the fixed horizontal run behind the wall, and the patch lead crossing the cabinet. Trace them separately.",
      evidence: [
        "endpointSeated",
        { path: "horizontalSeated", when: "jackTraced" },
        { path: "horizontalPort", when: "horizontalTraced" },
        { path: "patchSeated", when: "patchChecked" },
        "patchPanelPort",
      ],
      learnKb: "network-cabling-basics",
    },
    {
      id: "switch-port",
      label: "Switch port",
      identity: "Access port · edge switch",
      description:
        "Far end of the patch lead. Link lights prove the physical path only when the port is enabled and every segment seats.",
      evidence: [
        "switchPortNumber",
        { path: "switchPortEnabled", when: "patchChecked" },
        "pathOk",
      ],
      learnKb: "ip-addressing-basics",
    },
  ],
  status,
  chain,
  componentState,
};
