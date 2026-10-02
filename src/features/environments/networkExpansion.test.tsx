import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { NetworkLab } from "@/features/environments/NetworkLab";
import { netNodeState, netStatus } from "@/features/network/netState";

describe("network expansion: firewall-blocks-port chain", () => {
  it("golden path ends with a verified connection", () => {
    const scenario = getScenario("firewall-blocks-port");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "ping-gateway",
      "resolve-app-name",
      "test-port-8443",
      "test-port-443",
      "ping-public",
      "inspect-firewall-rules",
      "add-allow-rule",
      "verify-port",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("each probe gates the next: path → port → contrast → rules → fix", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "test-port-8443");
    expect(run.appliedActions).not.toContain("test-port-8443");
    run = applyAction(scenario, run, "test-port-443");
    expect(run.appliedActions).not.toContain("test-port-443");

    run = applyAction(scenario, run, "ping-gateway");
    run = applyAction(scenario, run, "test-port-8443");
    expect(run.appliedActions).toContain("test-port-8443");

    run = applyAction(scenario, run, "test-port-443");
    expect(run.appliedActions).toContain("test-port-443");

    run = applyAction(scenario, run, "resolve-app-name");
    run = applyAction(scenario, run, "inspect-firewall-rules");
    expect(run.appliedActions).toContain("inspect-firewall-rules");

    run = applyAction(scenario, run, "add-allow-rule");
    expect(run.appliedActions).toContain("add-allow-rule");
    const faults = (run.world.network as Record<string, unknown>).faults as Record<
      string,
      unknown
    >;
    expect(faults.portBlocked).toBe(false);
  });

  it("rule inspection requires both port tests (the contrast is the evidence)", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "ping-gateway");
    run = applyAction(scenario, run, "test-port-8443");
    run = applyAction(scenario, run, "inspect-firewall-rules");
    expect(run.appliedActions).not.toContain("inspect-firewall-rules");

    run = applyAction(scenario, run, "test-port-443");
    run = applyAction(scenario, run, "inspect-firewall-rules");
    expect(run.appliedActions).toContain("inspect-firewall-rules");
  });

  it("restart-server trap never verifies", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "restart-server-wrong");
    expect(run.appliedActions).toContain("restart-server-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("the raw portBlocked fault never leaks into topology health", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const faults = (run.world.network as Record<string, unknown>).faults as Record<
      string,
      unknown
    >;
    expect(faults.portBlocked).toBe(true);
    expect(netNodeState(run.world, "host").health).toBe("healthy");
    expect(netNodeState(run.world, "gateway").health).toBe("unknown");
    expect(netStatus(run.world).label).toBe("path unverified");
  });

  it("full evidence run reaches a healthy proven path", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    for (const id of [
      "ping-gateway",
      "resolve-app-name",
      "test-port-8443",
      "test-port-443",
      "ping-public",
      "inspect-firewall-rules",
      "add-allow-rule",
      "verify-port",
    ]) {
      run = applyAction(scenario, run, id);
    }
    expect(netNodeState(run.world, "gateway").health).toBe("healthy");
    expect(netNodeState(run.world, "dns").health).toBe("healthy");
    expect(netNodeState(run.world, "internet").health).toBe("healthy");
    expect(netStatus(run.world).label).toBe("path healthy");
  });

  it("probes strip lists the four leading diagnostics", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<NetworkLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("ping 192.168.1.1")).toBeTruthy();
    expect(screen.getByText("nslookup finapp.corp")).toBeTruthy();
    expect(screen.getByText("Test TCP 8443 to 10.10.20.15")).toBeTruthy();
    expect(screen.getByText("Test TCP 443 to 10.10.20.15")).toBeTruthy();
  });

  it("evidence accrues in the gateway inspector as probes run", () => {
    const scenario = getScenario("firewall-blocks-port");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const { rerender } = render(
      <NetworkLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    fireEvent.click(screen.getByTitle(/Default gateway/));
    expect(screen.getByText(/No probes run against this device/)).toBeTruthy();

    run = applyAction(scenario, run, "ping-gateway");
    rerender(<NetworkLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("Evidence (1)")).toBeTruthy();
  });
});
