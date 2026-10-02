import type { IndicatorTone } from "@/features/env";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag } from "../types";

export interface AccessPointVisuals {
  powerLed: IndicatorTone;
  radioLed: IndicatorTone;
  clientLed: IndicatorTone;
  /**
   * Serving switch's PoE port lamp — the upstream fact. Reads out only after
   * the drop was inspected (`assocChecked`), so `upstreamPoeCapable` cannot
   * spoil `ap-poe-port-disabled` at t=0.
   */
  upstreamLed: IndicatorTone;
}

export function accessPointVisuals(state: State): AccessPointVisuals {
  return {
    powerLed: flag(state, "poePowered") ? "ok" : flag(state, "poeCableSeated") ? "warn" : "off",
    radioLed: flag(state, "radioUp") ? "ok" : "off",
    clientLed: flag(state, "pathOk")
      ? "ok"
      : !flag(state, "assocChecked")
        ? "off"
        : flag(state, "clientLink")
          ? "warn"
          : flag(state, "clientAssociated")
            ? "warn"
            : "off",
    upstreamLed: !flag(state, "assocChecked")
      ? "off"
      : flag(state, "upstreamPoeCapable")
        ? "ok"
        : "warn",
  };
}

function status(state: State): FamilyStatus {
  if (!flag(state, "poePowered")) return { tone: "crit", label: "No power (PoE)" };
  if (!flag(state, "radioUp")) return { tone: "crit", label: "Radio down" };
  if (flag(state, "pathOk")) return { tone: "ok", label: "Connected" };
  if (!flag(state, "clientAssociated")) return { tone: "warn", label: "No client" };
  if (flag(state, "assocChecked") && !flag(state, "pskOk"))
    return { tone: "crit", label: "Auth failing" };
  if (flag(state, "assocChecked") && !flag(state, "channelClear"))
    return { tone: "warn", label: "Congested channel" };
  if (flag(state, "assocChecked") && !flag(state, "clientIpOk"))
    return { tone: "warn", label: "No address" };
  return { tone: "warn", label: "Client not passing" };
}

function chain(state: State): ChainStepView[] {
  return [
    {
      id: "poe",
      label: "PoE power",
      component: "ap-poe",
      state: flag(state, "poePowered") ? "Powered" : "No power",
      tone: flag(state, "poePowered") ? "ok" : "crit",
    },
    {
      id: "radio",
      label: "Radio",
      component: "ap-radio",
      state: flag(state, "radioUp") ? "On air" : "Down",
      tone: flag(state, "radioUp") ? "ok" : "crit",
    },
    {
      id: "client",
      label: "Client link",
      component: "ap-radio",
      state: flag(state, "clientAssociated") ? "Associated" : "Not associated",
      tone: flag(state, "clientAssociated") ? "ok" : "warn",
    },
    {
      id: "path",
      label: "Network path",
      component: "access-point",
      state: flag(state, "pathOk") ? "Passing" : "Blocked",
      tone: flag(state, "pathOk") ? "ok" : "crit",
    },
  ];
}

function componentState(id: string, state: State): ComponentStateView {
  switch (id) {
    case "access-point":
      return status(state);
    case "ap-poe":
      if (!flag(state, "poePowered")) {
        if (flag(state, "assocChecked")) {
          if (!flag(state, "poeCableSeated"))
            return { tone: "crit", label: "Drop unplugged" };
          if (!flag(state, "upstreamPoeCapable"))
            return { tone: "crit", label: "No PoE from switch" };
        }
        return { tone: "crit", label: "Not powered" };
      }
      return { tone: "ok", label: "Powered over cable" };
    case "ap-radio":
      if (!flag(state, "radioUp")) return { tone: "crit", label: "Radio down" };
      if (!flag(state, "assocChecked")) return { tone: "unknown", label: "Not checked" };
      if (!flag(state, "pskOk")) return { tone: "crit", label: "Handshake rejected" };
      if (!flag(state, "channelClear")) return { tone: "warn", label: "Channel congested" };
      if (!flag(state, "clientAssociated")) return { tone: "warn", label: "Idle" };
      if (!flag(state, "clientIpOk")) return { tone: "warn", label: "Client without address" };
      return { tone: "ok", label: "Serving client" };
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

export const accessPointFamily: FamilyDef = {
  id: "access-point",
  worldKey: "ap",
  label: "Access point",
  chainLabel: "Wireless path",
  labels: {
    poeCableSeated: "Ethernet drop",
    upstreamPoeCapable: "Switch PoE",
    poePowered: "PoE power",
    radioEnabled: "Radio enabled",
    radioUp: "Radio",
    pskOk: "Passphrase",
    channelClear: "Channel",
    clientAssociated: "Client associated",
    clientIpOk: "Client address",
    pathOk: "Network path",
  },
  cameraPresets: [
    { id: "ap-full", label: "Access point", pos: [0.4, 0.34, 0.5], target: [0, 0.02, 0] },
    { id: "ap-face", label: "Status face", pos: [0.0, 0.3, 0.44], target: [0, 0.04, 0.05] },
    { id: "ap-drop", label: "Ethernet drop", pos: [-0.28, -0.1, 0.3], target: [-0.05, -0.12, 0] },
  ],
  components: [
    {
      id: "access-point",
      label: "Access point",
      identity: "Ceiling AP · dual radio",
      description:
        "Serves wireless clients. Power comes over its Ethernet drop (PoE) — the radio only airs once the cable delivers both.",
      evidence: ["poePowered", "radioUp", "pathOk"],
      learnKb: "troubleshooting-method",
    },
    {
      id: "ap-poe",
      label: "PoE drop",
      identity: "Ethernet drop · 802.3at",
      description:
        "The single cable to the ceiling. A switch port without PoE leaves the AP dark even though the patch cable looks fine.",
      evidence: [
        { path: "poeCableSeated", when: "assocChecked" },
        { path: "upstreamPoeCapable", when: "assocChecked" },
        "poePowered",
      ],
      learnKb: "poe-power-basics",
    },
    {
      id: "ap-radio",
      label: "Radio",
      identity: "2.4 / 5 GHz radios",
      description:
        "Association and airtime. Passphrase mismatches and congested channels both show up here while the AP itself stays healthy.",
      evidence: [
        { path: "radioEnabled", when: "assocChecked" },
        "radioUp",
        { path: "pskOk", when: "assocChecked" },
        { path: "channelClear", when: "assocChecked" },
        "clientAssociated",
        { path: "clientIpOk", when: "assocChecked" },
      ],
      learnKb: "ip-addressing-basics",
    },
  ],
  status,
  chain,
  componentState,
};
