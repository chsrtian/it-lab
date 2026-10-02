import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { componentActions } from "./interaction";
import type { HotspotData } from "@/features/env";

export const BENCH_LABELS: Record<string, string> = {
  powerSwitchAtWall: "Wall / strip power",
  powerCableSeated: "PSU cable seated",
  psuToggle: "PSU rear switch",
  frontPanelConnector: "Front-panel header",
  psuOutputOk: "PSU standby output",
  fansSpin: "Case fans",
  ledsOn: "Board LEDs",
  posted: "POST completed",
  lastPowerEvent: "Last power event",
  monitorPower: "Monitor powered",
  videoCableToGpu: "Video cable to GPU",
  gpuSeated: "GPU seated",
  ramSeated: "RAM seated",
  beepCode: "Beep code",
  displayOk: "Display output",
  cpuFanSpinning: "CPU fan",
  cpuTempC: "CPU temperature °C",
  memTestPass: "Memory test result",
  sataDataSeated: "SATA data cable",
  sataPowerSeated: "SATA power cable",
  driveDetected: "Firmware detects drive",
};

export type CompId =
  | "wall"
  | "power-supply"
  | "motherboard"
  | "cpu-cooler"
  | "ram"
  | "gpu"
  | "storage"
  | "front-panel";

export function readAny(world: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = world;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export const HOTSPOT_CHAIN: Record<string, CompId> = {
  wall: "wall",
  cable: "power-supply",
  "psu-sw": "power-supply",
  standby: "power-supply",
  mb: "motherboard",
  fp: "front-panel",
  post: "motherboard",
};

export const HOTSPOT_META: Record<
  CompId,
  {
    label: string;
    identity: string;
    description: string;
    evidenceKeys: string[];
    stateSummary: (bench: Record<string, unknown>, powerOk: boolean) => string;
    stateTone: (
      bench: Record<string, unknown>,
      powerOk: boolean,
    ) => "ok" | "warn" | "crit" | "unknown";
    learnKb?: string;
  }
> = {
  wall: {
    label: "Wall / power strip",
    identity: "AC outlet · strip",
    description:
      "Source of AC power. Strip switch must be on before anything downstream works.",
    evidenceKeys: ["powerSwitchAtWall", "lastPowerEvent"],
    stateSummary: (b) => (b.powerSwitchAtWall ? "Live" : "No power at source"),
    stateTone: (b) => (b.powerSwitchAtWall ? "ok" : "crit"),
    learnKb: "troubleshooting-method",
  },
  "power-supply": {
    label: "PSU",
    identity: "ATX power supply · 650W",
    description:
      "Converts AC to DC. Rear switch + cable + wall power determine standby.",
    evidenceKeys: [
      "powerSwitchAtWall",
      "powerCableSeated",
      "psuToggle",
      "psuOutputOk",
      "lastPowerEvent",
    ],
    stateSummary: (_b, powerOk) =>
      powerOk ? "AC path good · standby present" : "AC path incomplete · no standby",
    stateTone: (_b, powerOk) => (powerOk ? "ok" : "crit"),
    learnKb: "troubleshooting-method",
  },
  motherboard: {
    label: "Motherboard",
    identity: "Desktop board · ATX",
    description:
      "Distributes power, hosts CPU/RAM, runs POST. Front-panel header starts the board.",
    evidenceKeys: ["frontPanelConnector", "ledsOn", "posted", "beepCode"],
    stateSummary: (b) =>
      b.posted
        ? "Healthy after POST"
        : b.ledsOn || b.fansSpin
          ? "Partially powered"
          : "No power indication",
    stateTone: (b) => (b.posted ? "ok" : b.ledsOn || b.fansSpin ? "warn" : "crit"),
    learnKb: "windows-boot-repair",
  },
  "cpu-cooler": {
    label: "CPU cooler",
    identity: "Heatsink + fan",
    description: "Cooling for the CPU. Fans spin when the board receives power.",
    evidenceKeys: ["fansSpin", "cpuFanSpinning", "cpuTempC", "lastPowerEvent", "posted"],
    stateSummary: (b) => {
      if (b.cpuFanSpinning === false) return "CPU fan not spinning";
      if (b.cpuFanSpinning === true || b.fansSpin === true) return "Fans spinning";
      return "Fans idle";
    },
    stateTone: (b) => {
      if (b.cpuFanSpinning === false) return "crit";
      return b.cpuFanSpinning === true || b.fansSpin === true ? "ok" : "crit";
    },
  },
  ram: {
    label: "RAM",
    identity: "DIMM bank A",
    description: "System memory. Unseated RAM can prevent POST or cause beep codes.",
    evidenceKeys: ["ramSeated", "beepCode", "memTestPass", "lastPowerEvent", "posted"],
    stateSummary: (b) => {
      // Memory-test results are progressive: visible only after the test ran.
      if (b.memTestRun === true) {
        return b.memTestPass === true
          ? "Memory test passed"
          : "Memory test failed — faulty module flagged";
      }
      if (b.ramSeated === false) return "Unseated";
      return b.posted ? "OK" : "Unknown / not tested";
    },
    stateTone: (b) => {
      if (b.memTestRun === true) return b.memTestPass === true ? "ok" : "crit";
      if (b.ramSeated === false) return "crit";
      return b.posted ? "ok" : "unknown";
    },
  },
  gpu: {
    label: "GPU",
    identity: "PCIe graphics card",
    description:
      "Video output. Needs seating + video cable for display after POST.",
    evidenceKeys: ["gpuSeated", "videoCableToGpu", "displayOk"],
    stateSummary: (b) =>
      b.displayOk
        ? "Display OK"
        : b.videoCableToGpu === false
          ? "No video cable"
          : b.gpuSeated === false
            ? "Unseated"
            : "No display yet",
    stateTone: (b) =>
      b.displayOk
        ? "ok"
        : b.videoCableToGpu === false || b.gpuSeated === false
          ? "crit"
          : "unknown",
  },
  storage: {
    label: "Storage",
    identity: "SATA SSD",
    description: "Boot/media storage. Required for OS load after successful POST.",
    evidenceKeys: ["posted", "sataPowerSeated", "sataDataSeated", "driveDetected"],
    stateSummary: (b) => {
      if (b.sataDataSeated === false) return "Data cable disconnected";
      if (b.driveDetected === false) return "Not detected by firmware";
      return b.posted ? "Reachable after POST" : "Not reached yet";
    },
    stateTone: (b) => {
      if (b.sataDataSeated === false || b.driveDetected === false) return "crit";
      return b.posted ? "ok" : "unknown";
    },
  },
  "front-panel": {
    label: "Front panel",
    identity: "Case power switch header",
    description:
      "Carries the power-button signal to the motherboard. Loose header = dead button.",
    evidenceKeys: ["frontPanelConnector", "fansSpin", "posted"],
    stateSummary: (b) =>
      b.frontPanelConnector ? "Header seated" : "Header loose / disconnected",
    stateTone: (b) => (b.frontPanelConnector ? "ok" : "crit"),
    learnKb: "troubleshooting-method",
  },
};

/**
 * Narrow the shared `focusTarget.componentId` enum (which also carries
 * equipment component ids since Phase 11) to a hardware bench part.
 */
export function hardwareFocusComponent(
  environment: { focusTarget?: { componentId?: string } },
): CompId | null {
  const id = environment.focusTarget?.componentId;
  return id && id in HOTSPOT_META ? (id as CompId) : null;
}

/**
 * Pure hotspot builder shared by the SVG workbench and the 3D workbench.
 * Both renderers are projections of the same world state.
 *
 * All explicitly bound operations remain available regardless of instructor state.
 */
export function buildBenchHotspot(
  scenario: Scenario,
  run: RunState,
  compId: CompId,
  _preferredActionId?: string | null,
): HotspotData | null {
  void _preferredActionId; // Compatibility only; instructor state never resolves actions.
  const meta = HOTSPOT_META[compId];
  if (!meta) return null;

  const world = run.world as Record<string, unknown>;
  const bench = (world.bench ?? {}) as Record<string, unknown>;

  const powerPathOk =
    bench.powerSwitchAtWall === true &&
    bench.powerCableSeated === true &&
    bench.psuToggle !== false &&
    bench.psuOutputOk === true;

  const evidence = meta.evidenceKeys.map((k) => {
    const raw = readAny(world, `bench.${k}`);
    const bool = typeof raw === "boolean" ? raw : undefined;
    return {
      label: BENCH_LABELS[k] ?? k,
      value:
        bool === undefined
          ? raw !== undefined
            ? String(raw)
            : "—"
          : bool
            ? "ok"
            : "fail",
      tone: (bool === undefined ? "unknown" : bool ? "ok" : "crit") as
        | "ok"
        | "crit"
        | "unknown",
    };
  });

  const actions = componentActions(scenario, run, compId);
  const related = actions.find((action) => !action.applied && !action.disabled) ?? actions[0];

  return {
    id: compId,
    label: meta.label,
    identity: meta.identity,
    stateSummary: meta.stateSummary(bench, powerPathOk),
    stateTone: meta.stateTone(bench, powerPathOk),
    evidence,
    description: meta.description,
    actions,
    relatedAction: related,
    learnKb: meta.learnKb,
  };
}
