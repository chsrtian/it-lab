import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { WindowsLab } from "@/features/environments/WindowsLab";

describe("windows expansion: update-failure chain", () => {
  it("golden path ends with a verified install", () => {
    const scenario = getScenario("windows-update-failure");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "review-update-history",
      "check-update-services",
      "inspect-update-cache",
      "reset-update-components",
      "retry-update-install",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("cache inspection, reset, and retry are evidence-gated in order", () => {
    const scenario = getScenario("windows-update-failure");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "inspect-update-cache");
    expect(run.appliedActions).not.toContain("inspect-update-cache");

    run = applyAction(scenario, run, "reset-update-components");
    expect(run.appliedActions).not.toContain("reset-update-components");

    run = applyAction(scenario, run, "review-update-history");
    run = applyAction(scenario, run, "inspect-update-cache");
    expect(run.appliedActions).toContain("inspect-update-cache");

    run = applyAction(scenario, run, "reset-update-components");
    expect(run.appliedActions).toContain("reset-update-components");

    run = applyAction(scenario, run, "retry-update-install");
    expect(run.appliedActions).toContain("retry-update-install");
    expect((run.world.update as Record<string, unknown>).cacheCorrupt).toBe(false);
  });

  it("a reinstall trap does not complete the scenario", () => {
    const scenario = getScenario("windows-update-failure");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "clean-install-wrong");
    expect(run.appliedActions).toContain("clean-install-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("storage tab shows ample free space (disk hypothesis ruled out)", () => {
    const scenario = getScenario("windows-update-failure");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<WindowsLab scenario={scenario} run={run} onInspect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Storage" }));
    const pct = screen.getByText(/38%/);
    expect(pct.className).toContain("text-emerald-300");
  });

  it("services tab lists both update services as running", () => {
    const scenario = getScenario("windows-update-failure");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<WindowsLab scenario={scenario} run={run} onInspect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByText("wuauserv (Windows Update)")).toBeTruthy();
    expect(screen.getByText("BITS")).toBeTruthy();
    expect(screen.getAllByText("running")[0].className).toContain("text-emerald-300");
  });
});

describe("windows expansion: device-error chain", () => {
  it("golden path ends with a verified camera", () => {
    const scenario = getScenario("windows-device-error");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "open-device-manager",
      "read-device-events",
      "test-another-port",
      "rollback-driver",
      "scan-for-changes",
      "test-camera",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("rollback needs BOTH the event timeline and the physical test", () => {
    const scenario = getScenario("windows-device-error");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "open-device-manager");
    run = applyAction(scenario, run, "read-device-events");
    run = applyAction(scenario, run, "rollback-driver");
    expect(run.appliedActions).not.toContain("rollback-driver");

    run = applyAction(scenario, run, "test-another-port");
    run = applyAction(scenario, run, "rollback-driver");
    expect(run.appliedActions).toContain("rollback-driver");

    run = applyAction(scenario, run, "scan-for-changes");
    expect(run.appliedActions).toContain("scan-for-changes");
    run = applyAction(scenario, run, "test-camera");
    expect(run.appliedActions).toContain("test-camera");
  });

  it("device replacement trap never verifies", () => {
    const scenario = getScenario("windows-device-error");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "replace-camera-wrong");
    expect(run.appliedActions).toContain("replace-camera-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("device-manager tab surfaces the Code 43 entry", () => {
    const scenario = getScenario("windows-device-error");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<WindowsLab scenario={scenario} run={run} onInspect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Device Manager" }));
    expect(screen.getByText(/Error code 43/)).toBeTruthy();
  });
});
