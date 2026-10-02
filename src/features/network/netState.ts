/**
 * Deterministic, evidence-driven network state.
 *
 * Reads ONLY the engine's world state and reveals fault identity only after
 * the learner's diagnostic actions have recorded evidence (progressive
 * disclosure). Raw `network.faults` is never surfaced directly — a fault is
 * only shown once a diagnostic (ping / ipconfig / nslookup / service check)
 * has proven it. Locally observable facts (APIPA address, missing gateway,
 * IP conflict) are visible immediately because the OS would show them too.
 */

export type NetHealth = "healthy" | "degraded" | "failed" | "unknown";

export type NetNodeId = "host" | "gateway" | "dhcp" | "dns" | "internet";

export type NetLinkId =
  | "host-gateway"
  | "host-dhcp"
  | "gateway-dns"
  | "gateway-internet";

export interface NetNodeView {
  health: NetHealth;
  reason: string;
}

export type NetLinkView = NetNodeView;

export const NET_NODE_IDS: readonly NetNodeId[] = [
  "host",
  "gateway",
  "dhcp",
  "dns",
  "internet",
];

export const NET_HEALTH_LABEL: Record<NetHealth, string> = {
  healthy: "HEALTHY",
  degraded: "DEGRADED",
  failed: "FAILED",
  unknown: "UNTESTED",
};

export const NET_HEALTH_MARK: Record<NetHealth, string> = {
  healthy: "✓",
  degraded: "!",
  failed: "✗",
  unknown: "?",
};

/** Hop-by-hop route from the client to a selected node (for path highlight). */
export const NET_ROUTES: Record<
  NetNodeId,
  { nodes: NetNodeId[]; links: NetLinkId[] }
> = {
  host: { nodes: ["host"], links: ["host-gateway", "host-dhcp"] },
  gateway: { nodes: ["host", "gateway"], links: ["host-gateway"] },
  dhcp: { nodes: ["host", "dhcp"], links: ["host-dhcp"] },
  dns: { nodes: ["host", "gateway", "dns"], links: ["host-gateway", "gateway-dns"] },
  internet: {
    nodes: ["host", "gateway", "internet"],
    links: ["host-gateway", "gateway-internet"],
  },
};

interface HostView {
  id: string;
  name: string;
  ips: string[];
  gateway: string;
  dns: string[];
}

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function flags(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(asRec(v))) {
    if (typeof val === "boolean") out[k] = val;
  }
  return out;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function netHost(world: Record<string, unknown>): HostView | null {
  const hosts = Array.isArray(world.hosts) ? world.hosts : [];
  const h = asRec(hosts[0]);
  if (Object.keys(h).length === 0) return null;
  return {
    id: typeof h.id === "string" ? h.id : "host",
    name: typeof h.name === "string" ? h.name : "Host",
    ips: strList(h.ips),
    gateway: typeof h.gateway === "string" ? h.gateway : "",
    dns: strList(h.dns),
  };
}

function isApipa(ip: string): boolean {
  return ip.startsWith("169.254.");
}

export function netFaults(world: Record<string, unknown>): Record<string, boolean> {
  return flags(asRec(asRec(world.network).faults));
}

export function netDiagnostics(world: Record<string, unknown>): Record<string, boolean> {
  return flags(world.diagnostics);
}

export function netNodeState(
  world: Record<string, unknown>,
  id: NetNodeId,
): NetNodeView {
  const host = netHost(world);
  const d = netDiagnostics(world);
  const f = netFaults(world);

  switch (id) {
    case "host": {
      if (f.duplicateIp) return { health: "failed", reason: "IP conflict" };
      if (!host) return { health: "unknown", reason: "no client" };
      if (host.ips.length === 0) return { health: "degraded", reason: "no address" };
      if (host.ips.some(isApipa))
        return { health: "degraded", reason: "APIPA — no lease" };
      return { health: "healthy", reason: "link up" };
    }
    case "gateway": {
      if (d.fixedGateway) return { health: "healthy", reason: "config corrected" };
      if (f.gatewayMisconfigured && d.ranIpconfig)
        return { health: "degraded", reason: "config mismatch" };
      if (!host || !host.gateway) return { health: "degraded", reason: "not configured" };
      if (!d.pingedGateway) return { health: "unknown", reason: "not probed" };
      if (f.gatewayDown) return { health: "failed", reason: "no reply" };
      if (f.gatewayMisconfigured) return { health: "healthy", reason: "replies" };
      return { health: "healthy", reason: "replies" };
    }
    case "dns": {
      if (d.fixedDns) return { health: "healthy", reason: "resolver reachable" };
      if (!d.ranNslookup) return { health: "unknown", reason: "not probed" };
      if (f.dnsServerDown) return { health: "failed", reason: "lookup timeout" };
      if (f.dnsWrongRecord) return { health: "degraded", reason: "record mismatch" };
      return { health: "healthy", reason: "resolves" };
    }
    case "internet": {
      if (!d.pingedPublicIp) return { health: "unknown", reason: "not probed" };
      if (f.noInternet) return { health: "failed", reason: "no reply" };
      if (f.portalOffline) return { health: "degraded", reason: "portal pending" };
      return { health: "healthy", reason: "replies" };
    }
    case "dhcp": {
      if (d.checkedDhcp || d.startedDhcp) {
        if (f.dhcpServerDown) return { health: "failed", reason: "service stopped" };
        return { health: "healthy", reason: "service running" };
      }
      if (d.renewedLease) return { health: "healthy", reason: "lease renewed" };
      if (d.sawApipa || (host && host.ips.some(isApipa)))
        return { health: "degraded", reason: "no lease (APIPA)" };
      if (host && host.ips.length > 0 && !host.ips.some(isApipa))
        return { health: "healthy", reason: "lease active" };
      return { health: "unknown", reason: "unverified" };
    }
    default:
      return { health: "unknown", reason: "unverified" };
  }
}

export function netLinkState(
  world: Record<string, unknown>,
  id: NetLinkId,
): NetLinkView {
  const host = netHost(world);
  const d = netDiagnostics(world);
  const f = netFaults(world);

  switch (id) {
    case "host-gateway": {
      if (!host || !host.gateway) return { health: "degraded", reason: "not configured" };
      if (f.gatewayMisconfigured && d.ranIpconfig)
        return { health: "degraded", reason: "routing mismatch" };
      if (!d.pingedGateway) return { health: "unknown", reason: "awaiting probe" };
      if (f.gatewayDown) return { health: "failed", reason: "no reply" };
      return { health: "healthy", reason: "reachable" };
    }
    case "host-dhcp": {
      if (d.checkedDhcp && f.dhcpServerDown)
        return { health: "failed", reason: "no offers" };
      if (d.renewedLease) return { health: "healthy", reason: "lease renewed" };
      if (host && host.ips.length > 0 && !host.ips.some(isApipa))
        return { health: "healthy", reason: "lease active" };
      if (d.sawApipa || (host && host.ips.some(isApipa)))
        return { health: "degraded", reason: "no lease" };
      return { health: "unknown", reason: "unverified" };
    }
    case "gateway-dns": {
      if (d.fixedDns) return { health: "healthy", reason: "resolver reachable" };
      if (!d.ranNslookup) return { health: "unknown", reason: "awaiting probe" };
      if (f.dnsServerDown) return { health: "failed", reason: "no response :53" };
      if (f.dnsWrongRecord) return { health: "degraded", reason: "bad answers" };
      return { health: "healthy", reason: "reachable" };
    }
    case "gateway-internet": {
      if (!d.pingedPublicIp) return { health: "unknown", reason: "awaiting probe" };
      if (f.noInternet) return { health: "failed", reason: "no reply" };
      if (f.portalOffline) return { health: "degraded", reason: "portal handshake" };
      return { health: "healthy", reason: "reachable" };
    }
    default:
      return { health: "unknown", reason: "unverified" };
  }
}

export type NetStatusBadge =
  | { tone: "ok"; label: string }
  | { tone: "warn"; label: string }
  | { tone: "crit"; label: string }
  | { tone: "unknown"; label: string };

/** Header status: only ever reflects *proven* state, never raw faults. */
export function netStatus(world: Record<string, unknown>): NetStatusBadge {
  const healths = NET_NODE_IDS.map((id) => netNodeState(world, id).health);
  if (healths.some((h) => h === "failed")) return { tone: "crit", label: "fault proven" };
  if (healths.some((h) => h === "degraded")) return { tone: "warn", label: "degraded" };
  if (healths.every((h) => h === "healthy")) return { tone: "ok", label: "path healthy" };
  return { tone: "unknown", label: "path unverified" };
}

/** Edge metadata shared by the topology canvas and the link inspector. */
export const NET_LINK_META: Record<
  NetLinkId,
  { short: string; a: NetNodeId; b: NetNodeId }
> = {
  "host-gateway": { short: "LAN", a: "host", b: "gateway" },
  "host-dhcp": { short: "lease", a: "host", b: "dhcp" },
  "gateway-dns": { short: "DNS path", a: "gateway", b: "dns" },
  "gateway-internet": { short: "WAN", a: "gateway", b: "internet" },
};

export function netLinkEndpoints(id: NetLinkId): { a: NetNodeId; b: NetNodeId } {
  return { a: NET_LINK_META[id].a, b: NET_LINK_META[id].b };
}

export function netLinkShortLabel(id: NetLinkId): string {
  return NET_LINK_META[id].short;
}
