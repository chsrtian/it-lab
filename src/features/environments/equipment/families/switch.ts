import type { IndicatorTone } from "@/features/env";
import type { StatusTone } from "@/components/ui";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag } from "../types";

export interface SwitchPortState {
  id: number;
  cableSeated: boolean;
  enabled: boolean;
  faulty: boolean;
  vlan: number;
  poe: boolean;
}

/** Sanitized view of `world.switch.ports` (array — replaced, never merged). */
export function switchPorts(state: State): SwitchPortState[] {
  const raw = state.ports;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p, i) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    return [
      {
        id: typeof o.id === "number" ? o.id : i + 1,
        cableSeated: o.cableSeated === true,
        enabled: o.enabled !== false,
        faulty: o.faulty === true,
        vlan: typeof o.vlan === "number" ? o.vlan : 1,
        poe: o.poe === true,
      },
    ];
  });
}

function linkCount(state: State): number {
  return switchPorts(state).filter((_, i) => portFlag(state, i, "link")).length;
}

/** port.link/path live in world (engine-derived). Read them back safely. */
function portFlag(state: State, index: number, key: "link" | "path"): boolean {
  const raw = state.ports;
  if (!Array.isArray(raw)) return false;
  const p = raw[index] as Record<string, unknown> | undefined;
  return p?.[key] === true;
}

export interface SwitchVisuals {
  powerLed: IndicatorTone;
  uplinkLed: IndicatorTone;
  poeLed: IndicatorTone | null;
  /**
   * Trunk badge tone. Off until `trunkChecked` (the membership list is
   * evidence), then `ok` only when every linked port's VLAN is actually
   * routed — so a checked-but-mismatched trunk reads `warn`, never green.
   */
  trunkTone: IndicatorTone;
  /** VLANs the trunk carries (badge readout; engine-defaults to [1]). */
  trunkCarries: number[];
  /** Link LED per access port (index-aligned with `switchPorts`). */
  portLeds: IndicatorTone[];
}

export function switchVisuals(state: State): SwitchVisuals {
  const ports = switchPorts(state);
  const linked = ports.filter((_, i) => portFlag(state, i, "link")).length;
  const routed = ports.filter((_, i) => portFlag(state, i, "path")).length;
  const rawTrunk = Array.isArray(state.trunkCarries)
    ? state.trunkCarries.filter((n): n is number => typeof n === "number")
    : [];
  return {
    powerLed: flag(state, "powerOk") ? "ok" : "off",
    uplinkLed: flag(state, "uplinkLink") ? "ok" : flag(state, "powerOk") ? "crit" : "off",
    poeLed:
      !flag(state, "poeChecked") || state.poeBudgetOk === undefined
        ? null
        : flag(state, "poeBudgetOk")
          ? "ok"
          : "crit",
    trunkTone: !flag(state, "trunkChecked")
      ? "off"
      : linked === 0
        ? "off"
        : routed === linked
          ? "ok"
          : "warn",
    trunkCarries: rawTrunk.length > 0 ? rawTrunk : [1],
    portLeds: ports.map((p, i) => {
      if (portFlag(state, i, "link")) return "ok";
      if (p.faulty) return "crit";
      if (p.cableSeated && p.enabled) return "warn";
      return "off";
    }),
  };
}

function status(state: State): FamilyStatus {
  if (!flag(state, "powerOk")) return { tone: "crit", label: "Off" };
  if (!flag(state, "uplinkLink")) return { tone: "crit", label: "Uplink down" };
  if (flag(state, "poeChecked") && state.poeBudgetOk === false)
    return { tone: "crit", label: "PoE over budget" };
  const ports = switchPorts(state);
  const linked = ports.filter((_, i) => portFlag(state, i, "link")).length;
  if (ports.length > 0 && linked === 0) return { tone: "crit", label: "No ports linked" };
  const routed = ports.filter((_, i) => portFlag(state, i, "path")).length;
  if (flag(state, "trunkChecked") && linked > 0 && routed < linked)
    return { tone: "warn", label: "VLAN path incomplete" };
  return { tone: "ok", label: "Switching" };
}

function chain(state: State): ChainStepView[] {
  const ports = switchPorts(state);
  const linked = ports.filter((_, i) => portFlag(state, i, "link")).length;
  const routed = ports.filter((_, i) => portFlag(state, i, "path")).length;
  const steps: ChainStepView[] = [
    {
      id: "power",
      label: "Power",
      component: "switch",
      state: flag(state, "powerOk") ? "On" : "Off",
      tone: flag(state, "powerOk") ? "ok" : "crit",
    },
    {
      id: "uplink",
      label: "Uplink",
      component: "switch-uplink",
      state: flag(state, "uplinkLink") ? "Linked" : "No link",
      tone: flag(state, "uplinkLink") ? "ok" : "crit",
    },
    {
      id: "ports",
      label: "Ports",
      component: "switch-port",
      state: `${linked}/${ports.length} linked`,
      tone: linked === 0 ? "crit" : linked === ports.length ? "ok" : "warn",
    },
    {
      id: "vlan",
      label: "VLAN path",
      component: "switch-vlan",
      state: !flag(state, "trunkChecked")
        ? "Not checked"
        : `${routed}/${linked} routed`,
      tone: !flag(state, "trunkChecked")
        ? "unknown"
        : linked > 0 && routed === linked
          ? "ok"
          : linked === 0
            ? "unknown"
            : "warn",
    },
  ];
  if (flag(state, "poeChecked") && state.poeBudgetOk !== undefined) {
    steps.push({
      id: "poe",
      label: "PoE budget",
      component: "switch",
      state: flag(state, "poeBudgetOk") ? "Within budget" : "Over budget",
      tone: flag(state, "poeBudgetOk") ? "ok" : "crit",
    });
  }
  return steps;
}

function componentState(id: string, state: State): ComponentStateView {
  const ports = switchPorts(state);
  switch (id) {
    case "switch":
      return status(state);
    case "switch-uplink":
      if (!flag(state, "powerOk")) return { tone: "crit", label: "Switch off" };
      if (!flag(state, "uplinkLink")) {
        if (flag(state, "uplinkChecked") && !flag(state, "uplinkCableSeated"))
          return { tone: "crit", label: "Cable unplugged" };
        if (flag(state, "uplinkChecked") && !flag(state, "uplinkPortOk"))
          return { tone: "crit", label: "Far-end port down" };
        return { tone: "crit", label: "No link" };
      }
      return { tone: "ok", label: "Uplink linked" };
    case "switch-port": {
      const linked = ports.filter((_, i) => portFlag(state, i, "link")).length;
      const faulty = ports.filter((p) => p.faulty).length;
      const disabled = ports.filter((p) => !p.enabled).length;
      if (faulty > 0 && flag(state, "portChecked"))
        return { tone: "crit", label: `${faulty} port(s) faulty` };
      if (linked === 0) return { tone: "crit", label: "No links" };
      if (flag(state, "portChecked") && disabled > 0)
        return { tone: "warn", label: `${linked}/${ports.length} linked, ${disabled} admin down` };
      if (!flag(state, "portChecked"))
        return { tone: "unknown", label: `${linked}/${ports.length} linked — admin state not checked` };
      return { tone: "ok", label: `${linked}/${ports.length} linked` };
    }
    case "switch-vlan": {
      if (!flag(state, "trunkChecked")) return { tone: "unknown", label: "Not checked" };
      const linked = ports.filter((_, i) => portFlag(state, i, "link")).length;
      const routed = ports.filter((_, i) => portFlag(state, i, "path")).length;
      if (linked === 0) return { tone: "unknown", label: "No links to route" };
      if (routed < linked) return { tone: "warn", label: "Uplink missing VLANs" };
      return { tone: "ok", label: "All paths routed" };
    }
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

const linkedTone = (_state: State, v: string): StatusTone =>
  v.startsWith("0/") ? "crit" : "ok";

export const switchFamily: FamilyDef = {
  id: "switch",
  worldKey: "switch",
  label: "Switch",
  chainLabel: "Data path",
  labels: {
    powerOk: "Power",
    uplinkCableSeated: "Uplink cable",
    uplinkPortOk: "Uplink port",
    uplinkLink: "Uplink link",
    trunkCarries: "VLANs on uplink",
    poeBudgetW: "PoE budget W",
    poeUsedW: "PoE drawn W",
    poeBudgetOk: "PoE budget",
  },
  cameraPresets: [
    { id: "switch-full", label: "Switch", pos: [0.5, 0.3, 0.62], target: [0, 0.04, 0] },
    { id: "switch-ports", label: "Port bank", pos: [0.06, 0.16, 0.5], target: [0, 0.03, 0.16] },
    { id: "switch-uplink", label: "Uplink", pos: [0.5, 0.2, -0.34], target: [0.18, 0.04, -0.14] },
  ],
  components: [
    {
      id: "switch",
      label: "Switch",
      identity: "8-port managed PoE+ switch",
      description:
        "Forwards frames between endpoints and the uplink. Link lights show layer 1 only — VLAN and admin state decide whether traffic actually flows.",
      evidence: [
        "powerOk",
        "uplinkLink",
        { label: "Linked ports", value: (s) => `${linkCount(s)}/${switchPorts(s).length}`, tone: (s) => linkedTone(s, `${linkCount(s)}/${switchPorts(s).length}`) },
      ],
      learnKb: "ip-addressing-basics",
    },
    {
      id: "switch-uplink",
      label: "Uplink",
      identity: "Uplink · toward the router",
      description:
        "Carries all VLANs leaving the switch. If the uplink is down or trunking the wrong VLANs, every access port fails at once.",
      evidence: [
        { path: "uplinkCableSeated", when: "uplinkChecked" },
        { path: "uplinkPortOk", when: "uplinkChecked" },
        "uplinkLink",
        { path: "trunkCarries", when: "trunkChecked" },
      ],
      learnKb: "ip-addressing-basics",
    },
    {
      id: "switch-port",
      label: "Port bank",
      identity: "Gigabit access ports 1–8",
      description:
        "Per-port state: seating, admin enable, fault, VLAN. A green LED only proves a link — not a routed path.",
      evidence: [
        { label: "Linked ports", value: (s) => `${linkCount(s)}/${switchPorts(s).length}`, tone: (s) => linkedTone(s, `${linkCount(s)}/${switchPorts(s).length}`) },
        {
          label: "Routed (VLAN)",
          when: "trunkChecked",
          value: (s) =>
            `${switchPorts(s).filter((_, i) => portFlag(s, i, "path")).length}/${linkCount(s)}`,
          tone: (s) => {
            const linked = linkCount(s);
            const routed = switchPorts(s).filter((_, i) => portFlag(s, i, "path")).length;
            return linked > 0 && routed === linked ? "ok" : linked === 0 ? "unknown" : "warn";
          },
        },
        {
          label: "Admin down",
          when: "portChecked",
          value: (s) => `${switchPorts(s).filter((p) => !p.enabled).length}`,
          tone: (s) =>
            switchPorts(s).some((p) => !p.enabled) ? "warn" : "ok",
        },
        {
          label: "Faulty ports",
          when: "portChecked",
          value: (s) => `${switchPorts(s).filter((p) => p.faulty).length}`,
          tone: (s) => (switchPorts(s).some((p) => p.faulty) ? "crit" : "ok"),
        },
      ],
    },
    {
      id: "switch-vlan",
      label: "VLAN config",
      identity: "802.1Q trunk membership",
      description:
        "Which VLANs the uplink carries. Ports link green while their VLAN is not trunked — the classic 'link good, traffic wrong'.",
      evidence: [
        { path: "trunkCarries", when: "trunkChecked" },
        {
          label: "Routed (VLAN)",
          when: "trunkChecked",
          value: (s) =>
            `${switchPorts(s).filter((_, i) => portFlag(s, i, "path")).length}/${linkCount(s)}`,
          tone: (s) => {
            const linked = linkCount(s);
            const routed = switchPorts(s).filter((_, i) => portFlag(s, i, "path")).length;
            return linked > 0 && routed === linked ? "ok" : linked === 0 ? "unknown" : "warn";
          },
        },
      ],
      learnKb: "vlan-basics",
    },
  ],
  status,
  chain,
  componentState,
};
