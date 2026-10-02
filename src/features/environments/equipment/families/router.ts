import type { IndicatorTone } from "@/features/env";
import type {
  ChainStepView,
  ComponentStateView,
  FamilyDef,
  FamilyStatus,
  State,
} from "../types";
import { flag, num } from "../types";

export interface RouterVisuals {
  powerLed: IndicatorTone;
  wanLed: IndicatorTone;
  internetLed: IndicatorTone;
  lanLed: IndicatorTone;
  dhcpLed: IndicatorTone;
  natLed: IndicatorTone;
}

export function routerVisuals(state: State): RouterVisuals {
  const power = flag(state, "powerOn");
  return {
    powerLed: flag(state, "powerOk") ? "ok" : power ? "warn" : "off",
    wanLed: flag(state, "wanLink") ? "ok" : power ? "crit" : "off",
    internetLed: flag(state, "clientPath")
      ? "ok"
      : !flag(state, "wanChecked")
        ? "off"
        : flag(state, "wanReachable")
          ? "warn"
          : "crit",
    lanLed: flag(state, "lanLink") ? "ok" : power ? "off" : "off",
    dhcpLed: !flag(state, "dhcpChecked")
      ? "off"
      : flag(state, "dhcpServing")
        ? "ok"
        : flag(state, "lanLink")
          ? "warn"
          : "off",
    natLed: !flag(state, "natChecked") ? "off" : flag(state, "natEnabled") ? "ok" : "warn",
  };
}

function status(state: State): FamilyStatus {
  if (!flag(state, "powerOk")) return { tone: "crit", label: "Off" };
  if (flag(state, "clientPath")) return { tone: "ok", label: "Routing" };
  if (!flag(state, "wanLink")) return { tone: "crit", label: "WAN link down" };
  if (flag(state, "wanChecked") && !flag(state, "upstreamOk"))
    return { tone: "crit", label: "Upstream down" };
  if (flag(state, "wanChecked") && !flag(state, "wanReachable"))
    return { tone: "warn", label: "No internet" };
  if (flag(state, "dhcpChecked") && !flag(state, "dhcpServing"))
    return { tone: "warn", label: "DHCP down" };
  if (flag(state, "natChecked") && !flag(state, "natEnabled"))
    return { tone: "warn", label: "NAT disabled" };
  return { tone: "warn", label: "Partial" };
}

function chain(state: State): ChainStepView[] {
  const wanChecked = flag(state, "wanChecked");
  const natChecked = flag(state, "natChecked");
  const dhcpChecked = flag(state, "dhcpChecked");
  const poolFree = num(state, "dhcpPoolFree");
  return [
    {
      id: "power",
      label: "Power",
      component: "router",
      state: flag(state, "powerOk") ? "On" : "Off",
      tone: flag(state, "powerOk") ? "ok" : "crit",
    },
    {
      id: "wan",
      label: "WAN link",
      component: "router-wan",
      state: flag(state, "wanLink") ? "Linked" : "No link",
      tone: flag(state, "wanLink") ? "ok" : "crit",
    },
    {
      id: "reach",
      label: "WAN reach",
      component: "router-wan",
      state: !wanChecked
        ? "Not checked"
        : flag(state, "wanReachable")
          ? "Reachable"
          : "Blocked",
      tone: !wanChecked ? "unknown" : flag(state, "wanReachable") ? "ok" : "crit",
    },
    {
      id: "nat",
      label: "NAT",
      component: "router-nat",
      state: !natChecked
        ? "Not checked"
        : flag(state, "natEnabled")
          ? "Translating"
          : "Disabled",
      tone: !natChecked ? "unknown" : flag(state, "natEnabled") ? "ok" : "warn",
    },
    {
      id: "dhcp",
      label: "DHCP",
      component: "router-dhcp",
      state: !dhcpChecked
        ? "Not checked"
        : flag(state, "dhcpServing")
          ? poolFree !== undefined && poolFree <= 0
            ? "Pool empty"
            : "Serving"
          : "Not serving",
      tone: !dhcpChecked
        ? "unknown"
        : flag(state, "dhcpServing")
          ? poolFree !== undefined && poolFree <= 0
            ? "crit"
            : "ok"
          : "warn",
    },
    {
      id: "clients",
      label: "Clients",
      component: "router",
      state: flag(state, "clientPath") ? "Path OK" : "No path",
      tone: flag(state, "clientPath") ? "ok" : "crit",
    },
  ];
}

function componentState(id: string, state: State): ComponentStateView {
  switch (id) {
    case "router":
      return status(state);
    case "router-wan":
      if (!flag(state, "wanLink")) return { tone: "crit", label: "No link" };
      if (!flag(state, "wanChecked"))
        return { tone: "unknown", label: "Link up — path not checked" };
      if (flag(state, "probeDone") && !flag(state, "upstreamOk"))
        return { tone: "crit", label: "First ISP hop unreachable" };
      if (!flag(state, "upstreamOk")) return { tone: "crit", label: "Upstream down" };
      if (!flag(state, "wanReachable")) return { tone: "warn", label: "WAN config failing" };
      if (flag(state, "probeDone")) return { tone: "ok", label: "Path verified" };
      return { tone: "ok", label: "Reachable" };
    case "router-lan":
      return flag(state, "lanLink")
        ? { tone: "ok", label: "Switching" }
        : { tone: "warn", label: "LAN link down" };
    case "router-dhcp": {
      if (!flag(state, "dhcpChecked")) return { tone: "unknown", label: "Not checked" };
      const free = num(state, "dhcpPoolFree");
      if (!flag(state, "dhcpServing")) return { tone: "warn", label: "Not serving" };
      if (free !== undefined && free <= 0) return { tone: "crit", label: "Pool exhausted" };
      return { tone: "ok", label: free !== undefined ? `${free} leases free` : "Serving" };
    }
    case "router-nat":
      if (!flag(state, "natChecked")) return { tone: "unknown", label: "Not checked" };
      return flag(state, "natEnabled")
        ? { tone: "ok", label: "Translating" }
        : { tone: "warn", label: "Disabled" };
    default:
      return { tone: "unknown", label: status(state).label };
  }
}

export const routerFamily: FamilyDef = {
  id: "router",
  worldKey: "router",
  label: "Router",
  chainLabel: "Internet path",
  labels: {
    powerOk: "Power",
    wanCableSeated: "WAN cable",
    wanPortOk: "WAN port",
    upstreamOk: "Upstream link",
    wanConfigOk: "WAN config",
    wanLink: "WAN link",
    wanReachable: "WAN reachable",
    lanCableSeated: "LAN cable",
    lanLink: "LAN link",
    dhcpEnabled: "DHCP enabled",
    dhcpPoolFree: "Leases free",
    dhcpServing: "DHCP serving",
    natEnabled: "NAT enabled",
    clientPath: "Client path",
  },
  cameraPresets: [
    { id: "router-full", label: "Router", pos: [0.5, 0.34, 0.66], target: [0, 0.05, 0] },
    { id: "router-wan", label: "WAN port", pos: [-0.42, 0.2, -0.36], target: [-0.14, 0.04, -0.16] },
    { id: "router-lan", label: "LAN ports", pos: [0.42, 0.18, -0.34], target: [0.14, 0.04, -0.16] },
    { id: "router-rear", label: "Rear panel", pos: [0, 0.26, -0.72], target: [0, 0.05, -0.18] },
  ],
  components: [
    {
      id: "router",
      label: "Router",
      identity: "Branch router · gateway of last resort",
      description:
        "Routes between the LAN and the WAN. Power, WAN reachability, NAT and DHCP must all hold for clients to get out.",
      evidence: ["powerOk", "clientPath"],
      learnKb: "gateway-vs-dns",
    },
    {
      id: "router-wan",
      label: "WAN",
      identity: "Uplink · ISP handoff",
      description:
        "Physical uplink plus the WAN-side configuration. A linked port can still carry a wrong or unreachable config.",
      evidence: [
        { path: "wanCableSeated", when: "wanChecked" },
        "wanPortOk",
        "wanLink",
        { path: "upstreamOk", when: "wanChecked" },
        { path: "wanConfigOk", when: "wanChecked" },
        { path: "wanReachable", when: "wanChecked" },
      ],
      learnKb: "ip-addressing-basics",
    },
    {
      id: "router-lan",
      label: "LAN switch",
      identity: "4× gigabit LAN",
      description: "Internal switch fabric for wired clients on the inside network.",
      evidence: [{ path: "lanCableSeated", when: "lanChecked" }, "lanLink"],
    },
    {
      id: "router-dhcp",
      label: "DHCP service",
      identity: "LAN address pool",
      description:
        "Hands addresses to LAN clients. Exhausted pools and disabled scopes look like 'no internet' from the client.",
      evidence: [
        { path: "dhcpEnabled", when: "dhcpChecked" },
        { path: "dhcpPoolFree", when: "dhcpChecked" },
        { path: "dhcpServing", when: "dhcpChecked" },
      ],
      learnKb: "ip-addressing-basics",
    },
    {
      id: "router-nat",
      label: "NAT / forwarding",
      identity: "Source translation rules",
      description:
        "Translates private LAN addresses to the WAN address. Without it, traffic leaves but never returns.",
      evidence: [
        { path: "natEnabled", when: "natChecked" },
        { path: "wanReachable", when: "wanChecked" },
        "clientPath",
      ],
      learnKb: "gateway-vs-dns",
    },
  ],
  status,
  chain,
  componentState,
};
