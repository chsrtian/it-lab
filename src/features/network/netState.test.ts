import { describe, expect, it } from "vitest";
import { getScenario } from "@/content";
import { applyAction, createRun } from "@/engine";
import {
  NET_HEALTH_LABEL,
  NET_HEALTH_MARK,
  NET_LINK_META,
  NET_ROUTES,
  netHost,
  netLinkEndpoints,
  netLinkShortLabel,
  netLinkState,
  netNodeState,
  netStatus,
} from "./netState";

function worldAfter(
  scenarioId: string,
  actionIds: string[],
): Record<string, unknown> {
  const scenario = getScenario(scenarioId);
  expect(scenario, scenarioId).toBeDefined();
  let run = createRun(scenario!, "guided");
  for (const id of actionIds) run = applyAction(scenario!, run, id);
  return run.world as Record<string, unknown>;
}

describe("netState — progressive evidence (dns-some-sites-broken)", () => {
  const id = "dns-some-sites-broken";

  it("keeps faults hidden before any probe", () => {
    const w = worldAfter(id, []);
    expect(netNodeState(w, "host")).toEqual({ health: "healthy", reason: "link up" });
    expect(netNodeState(w, "gateway").health).toBe("unknown");
    expect(netNodeState(w, "dns").health).toBe("unknown");
    expect(netNodeState(w, "internet").health).toBe("unknown");
    expect(netNodeState(w, "dhcp").health).toBe("healthy");
    expect(netLinkState(w, "host-gateway").health).toBe("unknown");
    expect(netLinkState(w, "gateway-dns").health).toBe("unknown");
    expect(netLinkState(w, "gateway-internet").health).toBe("unknown");
    expect(netStatus(w)).toEqual({ tone: "unknown", label: "path unverified" });
  });

  it("pinging the gateway proves the LAN path only", () => {
    const w = worldAfter(id, ["diag-ping-gateway"]);
    expect(netNodeState(w, "gateway")).toEqual({
      health: "healthy",
      reason: "replies",
    });
    expect(netLinkState(w, "host-gateway")).toEqual({
      health: "healthy",
      reason: "reachable",
    });
    expect(netNodeState(w, "dns").health).toBe("unknown");
    expect(netNodeState(w, "internet").health).toBe("unknown");
    expect(netStatus(w).tone).toBe("unknown");
  });

  it("pinging a public IP proves the WAN path", () => {
    const w = worldAfter(id, ["diag-ping-gateway", "diag-ping-public"]);
    expect(netNodeState(w, "internet").health).toBe("healthy");
    expect(netLinkState(w, "gateway-internet").health).toBe("healthy");
    expect(netNodeState(w, "dns").health).toBe("unknown");
  });

  it("nslookup is the reveal moment for the DNS fault", () => {
    const w = worldAfter(id, [
      "diag-ping-gateway",
      "diag-ping-public",
      "diag-nslookup",
    ]);
    expect(netNodeState(w, "dns")).toEqual({
      health: "failed",
      reason: "lookup timeout",
    });
    expect(netLinkState(w, "gateway-dns").health).toBe("failed");
    expect(netStatus(w)).toEqual({ tone: "crit", label: "fault proven" });
  });

  it("fixing DNS restores resolver health and the status to ok", () => {
    const w = worldAfter(id, [
      "diag-ping-gateway",
      "diag-ping-public",
      "diag-nslookup",
      "fix-dns",
    ]);
    expect(netNodeState(w, "dns").health).toBe("healthy");
    expect(netLinkState(w, "gateway-dns").health).toBe("healthy");
    expect(netStatus(w)).toEqual({ tone: "ok", label: "path healthy" });
  });

  it("exposes the four diagnostic probes for the probe strip", () => {
    const scenario = getScenario(id)!;
    const probes = scenario.actions.filter((a) => a.isDiagnostic);
    expect(probes.map((a) => a.id)).toEqual([
      "diag-ping-gateway",
      "diag-ping-public",
      "diag-nslookup",
      "diag-tracert",
    ]);
  });
});

describe("netState — gateway misconfiguration (wifi-connected-no-internet)", () => {
  const id = "wifi-connected-no-internet";

  it("gateway stays unverified until ipconfig is run", () => {
    const w = worldAfter(id, []);
    expect(netNodeState(w, "gateway").health).toBe("unknown");
    expect(netLinkState(w, "host-gateway").health).toBe("unknown");
  });

  it("ipconfig proves a config mismatch (degraded, not a hard fail)", () => {
    const w = worldAfter(id, ["diag-ipconfig"]);
    expect(netNodeState(w, "gateway")).toEqual({
      health: "degraded",
      reason: "config mismatch",
    });
    expect(netLinkState(w, "host-gateway")).toEqual({
      health: "degraded",
      reason: "routing mismatch",
    });
    expect(netStatus(w)).toEqual({ tone: "warn", label: "degraded" });
  });

  it("fixing the gateway restores a healthy path", () => {
    const w = worldAfter(id, [
      "diag-ipconfig",
      "diag-ping-gw",
      "diag-ping-public",
      "fix-gateway",
    ]);
    expect(netNodeState(w, "gateway")).toEqual({
      health: "healthy",
      reason: "config corrected",
    });
    expect(netLinkState(w, "host-gateway").health).toBe("healthy");
  });
});

describe("netState — DHCP failure (dhcp-addressing-broken)", () => {
  const id = "dhcp-addressing-broken";

  it("APIPA is locally observable without a probe", () => {
    const w = worldAfter(id, []);
    expect(netNodeState(w, "host")).toEqual({
      health: "degraded",
      reason: "APIPA — no lease",
    });
    expect(netNodeState(w, "dhcp")).toEqual({
      health: "degraded",
      reason: "no lease (APIPA)",
    });
    expect(netLinkState(w, "host-dhcp").health).toBe("degraded");
    expect(netNodeState(w, "gateway").reason).toBe("not configured");
    expect(netStatus(w).tone).toBe("warn");
  });

  it("checking the DHCP service proves it stopped", () => {
    const w = worldAfter(id, ["diag-apipa", "check-dhcp-service"]);
    expect(netNodeState(w, "dhcp")).toEqual({
      health: "failed",
      reason: "service stopped",
    });
    expect(netLinkState(w, "host-dhcp")).toEqual({
      health: "failed",
      reason: "no offers",
    });
    expect(netStatus(w)).toEqual({ tone: "crit", label: "fault proven" });
  });

  it("starting the service and renewing the lease restores the host", () => {
    const w = worldAfter(id, [
      "diag-apipa",
      "check-dhcp-service",
      "start-dhcp",
      "renew-lease",
    ]);
    expect(netNodeState(w, "dhcp").health).toBe("healthy");
    expect(netNodeState(w, "host").health).toBe("healthy");
    expect(netLinkState(w, "host-dhcp").health).toBe("healthy");
  });
});

describe("netState — duplicate IP conflict (duplicate-ip-conflict)", () => {
  const id = "duplicate-ip-conflict";

  it("the ARP conflict is locally observable immediately", () => {
    const w = worldAfter(id, []);
    expect(netNodeState(w, "host")).toEqual({
      health: "failed",
      reason: "IP conflict",
    });
    expect(netStatus(w)).toEqual({ tone: "crit", label: "fault proven" });
  });

  it("moving the printer clears the conflict", () => {
    const w = worldAfter(id, ["see-conflict", "arp-scan", "move-printer"]);
    expect(netNodeState(w, "host").health).toBe("healthy");
    expect(netStatus(w).tone).not.toBe("crit");
  });
});

describe("netState — static metadata", () => {
  it("provides endpoints and short labels for every link", () => {
    expect(netLinkEndpoints("host-gateway")).toEqual({
      a: "host",
      b: "gateway",
    });
    expect(netLinkEndpoints("gateway-dns")).toEqual({
      a: "gateway",
      b: "dns",
    });
    expect(netLinkShortLabel("gateway-dns")).toBe("DNS path");
    expect(netLinkShortLabel("gateway-internet")).toBe("WAN");
    expect(Object.keys(NET_LINK_META)).toHaveLength(4);
  });

  it("routes every node back through the host", () => {
    expect(NET_ROUTES.dns).toEqual({
      nodes: ["host", "gateway", "dns"],
      links: ["host-gateway", "gateway-dns"],
    });
    expect(NET_ROUTES.internet.nodes).toEqual(["host", "gateway", "internet"]);
    for (const route of Object.values(NET_ROUTES)) {
      for (const link of route.links) {
        expect(NET_LINK_META[link]).toBeDefined();
      }
    }
  });

  it("labels and marks every health state (non-color channel)", () => {
    expect(NET_HEALTH_LABEL).toEqual({
      healthy: "HEALTHY",
      degraded: "DEGRADED",
      failed: "FAILED",
      unknown: "UNTESTED",
    });
    expect(NET_HEALTH_MARK.unknown).toBe("?");
    expect(NET_HEALTH_MARK.healthy).toBe("✓");
    expect(NET_HEALTH_MARK.degraded).toBe("!");
    expect(NET_HEALTH_MARK.failed).toBe("✗");
  });

  it("reads host facts from the world", () => {
    const w = worldAfter("dns-some-sites-broken", []);
    const host = netHost(w);
    expect(host).not.toBeNull();
    expect(host!.gateway).toBe("192.168.1.1");
    expect(host!.dns).toEqual(["192.168.1.1"]);
    expect(host!.ips).toContain("192.168.1.50");
  });
});
