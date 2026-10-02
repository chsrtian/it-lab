import type { IndicatorTone } from "@/features/env";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag, num, str } from "../types";

export interface UpsVisuals {
  inputLed: IndicatorTone;
  batteryLed: IndicatorTone;
  outputLed: IndicatorTone;
  /**
   * Outlet-bank tone. Follows `outputPresent` (what the bank actually
   * delivers) rather than the `outletsLive` switch config, and only reads
   * *fault* after `outletChecked` — a dead bank is neutral until inspected.
   */
  outletsLed: IndicatorTone;
  /** Breaker position tone — the trip verdict only after `breakerChecked`. */
  breakerLed: IndicatorTone;
  loadLed: IndicatorTone;
  mode: string;
  loadPct: number;
}

export function upsVisuals(state: State): UpsVisuals {
  const load = num(state, "loadPct") ?? 0;
  const outputLive = flag(state, "outputPresent");
  return {
    inputLed: flag(state, "inputPresent") ? "ok" : outputLive ? "warn" : "off",
    batteryLed: !flag(state, "batteryChecked")
      ? "off"
      : flag(state, "batteryOk")
        ? "ok"
        : "crit",
    outputLed: outputLive ? "ok" : "crit",
    outletsLed: outputLive ? "ok" : flag(state, "outletChecked") ? "crit" : "off",
    breakerLed: !flag(state, "breakerChecked")
      ? "off"
      : flag(state, "breakerOk")
        ? "ok"
        : "crit",
    loadLed: flag(state, "loadOk") ? "ok" : "crit",
    mode: str(state, "mode") ?? "unknown",
    loadPct: load,
  };
}

function status(state: State): FamilyStatus {
  if (!flag(state, "outputPresent")) return { tone: "crit", label: "No output" };
  if (!flag(state, "loadOk")) return { tone: "crit", label: "Overload" };
  if (!flag(state, "inputPresent")) return { tone: "warn", label: "On battery" };
  if (flag(state, "breakerChecked") && !flag(state, "breakerOk"))
    return { tone: "crit", label: "Breaker open" };
  if (flag(state, "batteryChecked") && !flag(state, "batteryOk"))
    return { tone: "warn", label: "Battery weak" };
  return { tone: "ok", label: "Online" };
}

function chain(state: State): ChainStepView[] {
  return [
    {
      id: "input",
      label: "Input",
      component: "ups-input",
      state: !flag(state, "inputChecked")
        ? "Not checked"
        : flag(state, "inputPresent")
          ? "Mains present"
          : "No mains",
      tone: !flag(state, "inputChecked")
        ? "unknown"
        : flag(state, "inputPresent")
          ? "ok"
          : flag(state, "outputPresent")
            ? "warn"
            : "crit",
    },
    {
      id: "battery",
      label: "Battery",
      component: "ups-battery",
      state: !flag(state, "batteryChecked")
        ? "Not tested"
        : flag(state, "batteryOk")
          ? "Healthy"
          : "Weak",
      tone: !flag(state, "batteryChecked")
        ? "unknown"
        : flag(state, "batteryOk")
          ? "ok"
          : "crit",
    },
    {
      id: "output",
      label: "Output",
      component: "ups-output",
      state: flag(state, "outputPresent") ? "Live" : "Dead",
      tone: flag(state, "outputPresent") ? "ok" : "crit",
    },
    {
      id: "load",
      label: "Load",
      component: "ups",
      state: flag(state, "loadOk") ? `${num(state, "loadPct") ?? 0}% ok` : "Overload",
      tone: flag(state, "loadOk") ? "ok" : "crit",
    },
  ];
}

function componentState(id: string, state: State): ComponentStateView {
  switch (id) {
    case "ups":
      return status(state);
    case "ups-input":
      if (!flag(state, "breakerOk"))
        return flag(state, "breakerChecked")
          ? { tone: "crit", label: "Breaker tripped" }
          : { tone: "unknown", label: "Output path not checked" };
      if (!flag(state, "inputChecked")) return { tone: "unknown", label: "Not checked" };
      if (!flag(state, "inputPresent")) return { tone: "crit", label: "No input power" };
      return { tone: "ok", label: "Utility present" };
    case "ups-output":
      if (!flag(state, "outletChecked") && !flag(state, "outputPresent"))
        return { tone: "unknown", label: "Bank not inspected" };
      return flag(state, "outputPresent")
        ? { tone: "ok", label: "Outlets live" }
        : { tone: "crit", label: "Outlets dead" };
    case "ups-battery": {
      if (!flag(state, "batteryChecked")) return { tone: "unknown", label: "Not tested" };
      if (!flag(state, "batteryOk")) return { tone: "crit", label: "Battery failed" };
      const runtime = num(state, "batteryRuntimeMin");
      return {
        tone: runtime !== undefined && runtime < 10 ? "warn" : "ok",
        label:
          runtime !== undefined && runtime < 10
            ? `Weak — ${runtime} min`
            : runtime !== undefined
              ? `${runtime} min runtime`
              : "Healthy",
      };
    }
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

export const upsFamily: FamilyDef = {
  id: "ups",
  worldKey: "ups",
  label: "UPS",
  chainLabel: "Power path",
  labels: {
    inputPresent: "Utility input",
    breakerOk: "Breaker",
    mode: "Mode",
    batteryOk: "Battery",
    batteryRuntimeMin: "Runtime min",
    outletsLive: "Outlet group",
    loadPct: "Load %",
    loadOk: "Load",
    outputPresent: "Output",
    onUtility: "On utility",
    selfTestPass: "Self-test",
  },
  cameraPresets: [
    { id: "ups-full", label: "UPS", pos: [0.44, 0.3, 0.6], target: [0, 0.08, 0] },
    { id: "ups-front", label: "Front panel", pos: [0.1, 0.2, 0.5], target: [0, 0.1, 0.2] },
    { id: "ups-rear", label: "Rear outlets", pos: [0.2, 0.24, -0.52], target: [0, 0.08, -0.2] },
  ],
  components: [
    {
      id: "ups",
      label: "UPS",
      identity: "1500 VA line-interactive UPS",
      description:
        "Keeps equipment alive through outages. Input, battery, outlet group and load together decide whether the output stays live.",
      evidence: [
        "mode",
        { path: "loadPct", when: "loadChecked" },
        "loadOk",
        "outputPresent",
      ],
      learnKb: "ups-runtime-basics",
    },
    {
      id: "ups-input",
      label: "Utility input",
      identity: "IEC inlet · rear breaker",
      description: "Mains feeding the UPS. A tripped breaker kills output even with the wall live.",
      evidence: [
        { path: "inputPresent", when: "inputChecked" },
        { path: "breakerOk", when: "breakerChecked" },
        { path: "onUtility", when: "breakerChecked" },
      ],
      learnKb: "troubleshooting-method",
    },
    {
      id: "ups-output",
      label: "Outlet group",
      identity: "8 outlets · switched bank",
      description:
        "Where the protected equipment plugs in. The bank can be individually switched off while the UPS itself stays healthy.",
      evidence: [
        { path: "outletsLive", when: "outletChecked" },
        "outputPresent",
      ],
    },
    {
      id: "ups-battery",
      label: "Battery",
      identity: "Sealed VRLA pack",
      description:
        "The reserve for outages. Capacity fades with age — a UPS can look fine on utility until the first cut.",
      evidence: [
        { path: "batteryOk", when: "batteryChecked" },
        { path: "batteryRuntimeMin", when: "batteryChecked" },
        { path: "selfTestPass", when: "batteryChecked" },
      ],
      learnKb: "ups-runtime-basics",
    },
  ],
  status,
  chain,
  componentState,
};
