import type { IndicatorTone } from "@/features/env";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag } from "../types";

/** LED/physical indicators shared by the 2D SVG and the 3D scene. */
export interface PrinterVisuals {
  powerLed: IndicatorTone;
  netLed: IndicatorTone;
  readyLed: IndicatorTone;
  tonerLed: IndicatorTone;
  paperLed: IndicatorTone;
  jamLed: IndicatorTone;
  lidOpen: boolean;
  paperLevel: number;
}

export function printerVisuals(state: State): PrinterVisuals {
  return {
    powerLed: flag(state, "powerOk") ? "ok" : "off",
    netLed: flag(state, "netLink") ? "ok" : flag(state, "powerOk") ? "warn" : "off",
    readyLed: flag(state, "printReady")
      ? "ok"
      : flag(state, "powerOk")
        ? "warn"
        : "off",
    tonerLed: flag(state, "tonerOk") ? "ok" : "warn",
    paperLed: flag(state, "paperOk") ? "ok" : "crit",
    jamLed: flag(state, "jamPresent") ? "crit" : "off",
    lidOpen: !flag(state, "doorClosed"),
    paperLevel: flag(state, "paperOk") ? 0.8 : 0.05,
  };
}

function status(state: State): FamilyStatus {
  if (!flag(state, "powerOk")) return { tone: "crit", label: "Off" };
  if (flag(state, "jamPresent") && flag(state, "alarmChecked"))
    return { tone: "crit", label: "Jam" };
  if (flag(state, "printReady")) return { tone: "ok", label: "Ready" };
  if (!flag(state, "doorClosed")) return { tone: "warn", label: "Cover open" };
  if (!flag(state, "netLink")) return { tone: "warn", label: "No connection" };
  if (flag(state, "addressChecked") && state.addressOk === false)
    return { tone: "warn", label: "Address problem" };
  if (!flag(state, "spoolerRunning")) return { tone: "crit", label: "Spooler stopped" };
  if (flag(state, "queueChecked") && flag(state, "queuePaused"))
    return { tone: "warn", label: "Queue paused" };
  if (!flag(state, "paperOk")) return { tone: "warn", label: "Out of paper" };
  if (!flag(state, "tonerOk")) return { tone: "warn", label: "Low toner" };
  return { tone: "unknown", label: "Not ready" };
}

function chain(state: State): ChainStepView[] {
  const addressChecked = flag(state, "addressChecked");
  return [
    {
      id: "power",
      label: "Power",
      component: "printer",
      state: flag(state, "powerOk") ? "Live" : "Off",
      tone: flag(state, "powerOk") ? "ok" : "crit",
    },
    {
      id: "net",
      label: "Network",
      component: "printer-network",
      state: flag(state, "netLink") ? "Linked" : "No link",
      tone: flag(state, "netLink") ? "ok" : "crit",
    },
    {
      id: "addr",
      label: "Address",
      component: "printer-network",
      state: !addressChecked
        ? "Not checked"
        : state.addressOk === false
          ? "Conflict"
          : "Valid",
      tone: !addressChecked ? "unknown" : state.addressOk === false ? "crit" : "ok",
    },
    {
      id: "queue",
      label: "Queue",
      component: "printer",
      state:
        !flag(state, "spoolerRunning")
          ? "Stopped"
          : flag(state, "queuePaused") && !flag(state, "queueChecked")
            ? "Not checked"
            : flag(state, "queuePaused")
              ? "Paused"
              : "Flowing",
      tone: !flag(state, "spoolerRunning")
        ? "crit"
        : flag(state, "queuePaused") && !flag(state, "queueChecked")
          ? "unknown"
          : flag(state, "queuePaused")
            ? "warn"
            : "ok",
    },
    {
      id: "ready",
      label: "Ready",
      component: "printer",
      state: flag(state, "printReady") ? "Print ready" : "Not ready",
      tone: flag(state, "printReady") ? "ok" : "warn",
    },
  ];
}

function componentState(id: string, state: State): ComponentStateView {
  switch (id) {
    case "printer":
      return status(state);
    case "printer-paper":
      if (flag(state, "jamPresent") && !flag(state, "alarmChecked"))
        return { tone: "unknown", label: "Alarm not read" };
      if (flag(state, "jamPresent")) return { tone: "crit", label: "Jam present" };
      if (!flag(state, "paperOk")) return { tone: "crit", label: "Tray empty" };
      if (!flag(state, "doorClosed")) return { tone: "warn", label: "Cover open" };
      return { tone: "ok", label: "Loaded" };
    case "printer-cartridge":
      if (!flag(state, "tonerChecked")) return { tone: "unknown", label: "Not inspected" };
      return flag(state, "tonerOk")
        ? { tone: "ok", label: "Toner OK" }
        : { tone: "warn", label: "Toner low" };
    case "printer-network":
      if (!flag(state, "powerOk")) return { tone: "crit", label: "Device off" };
      if (!flag(state, "netCableSeated")) return { tone: "crit", label: "Cable unplugged" };
      if (!flag(state, "netLink")) return { tone: "crit", label: "No link" };
      if (flag(state, "addressChecked") && state.addressOk === false)
        return { tone: "warn", label: "Address problem" };
      if (!flag(state, "addressChecked"))
        return { tone: "unknown", label: "Link up — address not checked" };
      return { tone: "ok", label: "Linked" };
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

export const printerFamily: FamilyDef = {
  id: "printer",
  worldKey: "printer",
  label: "Printer",
  chainLabel: "Print path",
  labels: {
    powerOk: "Power",
    printReady: "Ready to print",
    paperOk: "Paper",
    jamPresent: "Jam",
    doorClosed: "Cover",
    tonerOk: "Toner",
    netCableSeated: "Cable seated",
    netLink: "Link",
    netEnabled: "NIC enabled",
    netPortOk: "Upstream port",
    addressOk: "IP address",
    queuePaused: "Queue paused",
    spoolerRunning: "Spooler",
    jobCount: "Jobs waiting",
  },
  cameraPresets: [
    { id: "printer-full", label: "Printer", pos: [0.55, 0.4, 0.7], target: [0, 0.08, 0] },
    {
      id: "printer-controls",
      label: "Control panel",
      pos: [0.3, 0.26, 0.5],
      target: [0.1, 0.12, 0.2],
    },
    {
      id: "printer-paper",
      label: "Paper tray",
      pos: [0.16, 0.08, 0.62],
      target: [0, -0.04, 0.26],
    },
    {
      id: "printer-network",
      label: "Network port",
      pos: [-0.4, 0.24, -0.42],
      target: [-0.12, 0.04, -0.2],
    },
  ],
  components: [
    {
      id: "printer",
      label: "Printer",
      identity: "A4 mono laser MFP · 3rd floor",
      description:
        "Network laser printer. Power, network path, queue and consumables all have to hold before a job prints.",
      evidence: [
        "powerOk",
        {
          label: "Queue paused",
          when: "queueChecked",
          value: (s) => (flag(s, "queuePaused") ? "Paused" : "Flowing"),
          tone: (s) => (flag(s, "queuePaused") ? "warn" : "ok"),
        },
        "spoolerRunning",
        "printReady",
      ],
      learnKb: "troubleshooting-method",
    },
    {
      id: "printer-paper",
      label: "Paper tray",
      identity: "Tray 1 · 250 sheet",
      description: "Feeds media into the path. Jams and empty trays stop jobs with a panel error.",
      evidence: [
        "paperOk",
        {
          label: "Jam",
          when: "alarmChecked",
          value: (s) => (flag(s, "jamPresent") ? "Present" : "Clear"),
          tone: (s) => (flag(s, "jamPresent") ? "crit" : "ok"),
        },
        { path: "doorClosed", when: "pathInspected" },
      ],
    },
    {
      id: "printer-cartridge",
      label: "Toner cartridge",
      identity: "Standard yield · black",
      description: "Imaging consumable. Low toner degrades output long before the job fails.",
      evidence: [{ path: "tonerOk", when: "tonerChecked" }],
    },
    {
      id: "printer-network",
      label: "Network port",
      identity: "RJ-45 · 1000BASE-T",
      description:
        "Physical connection to the switch plus the printer's address. Link can be good while the address is wrong.",
      evidence: [
        "netCableSeated",
        { path: "netPortOk", when: "neighborChecked" },
        "netEnabled",
        "netLink",
        { path: "addressOk", when: "addressChecked" },
      ],
      learnKb: "ip-addressing-basics",
    },
  ],
  status,
  chain,
  componentState,
};
