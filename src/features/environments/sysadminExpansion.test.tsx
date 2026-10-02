import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { WindowsLab } from "@/features/environments/WindowsLab";
import { LinuxLab } from "@/features/environments/LinuxLab";

describe("sysadmin expansion: backup-failed chain", () => {
  it("golden path ends verified with history → target test → credential fix", () => {
    const scenario = getScenario("backup-failed");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "read-backup-logs",
      "test-target-share",
      "update-credential",
      "run-backup-now",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("target test waits for history; fixes wait for evidence", () => {
    const scenario = getScenario("backup-failed");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "test-target-share");
    expect(run.appliedActions).not.toContain("test-target-share");

    run = applyAction(scenario, run, "read-backup-logs");
    run = applyAction(scenario, run, "test-target-share");
    expect(run.appliedActions).toContain("test-target-share");

    run = applyAction(scenario, run, "run-backup-now");
    expect(run.appliedActions).not.toContain("run-backup-now");
    run = applyAction(scenario, run, "update-credential");
    run = applyAction(scenario, run, "run-backup-now");
    expect(run.appliedActions).toContain("run-backup-now");
    expect((run.world.backup as Record<string, unknown>).verified).toBe(true);
  });

  it("recreate-the-job trap never verifies", () => {
    const scenario = getScenario("backup-failed");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "recreate-backup-job-wrong");
    expect(run.appliedActions).toContain("recreate-backup-job-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("windows console shows the job history, engine service and local disk", () => {
    const scenario = getScenario("backup-failed");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<WindowsLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getAllByText(/Backup completed successfully/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Access is denied/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getAllByText(/Windows Backup/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Storage" }));
    expect(screen.getAllByText(/38%/).length).toBeGreaterThan(0);
  });
});

describe("sysadmin expansion: service-dependency chain", () => {
  it("golden path ends verified with dependency-first ordering", () => {
    const scenario = getScenario("service-dependency");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "status-app",
      "read-unit-file",
      "status-dep",
      "fix-dep-config",
      "start-dependency",
      "start-app",
      "verify-api",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("evidence chain and dependency-first starts are gated in order", () => {
    const scenario = getScenario("service-dependency");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "read-unit-file");
    expect(run.appliedActions).not.toContain("read-unit-file");

    run = applyAction(scenario, run, "status-app");
    run = applyAction(scenario, run, "read-unit-file");
    run = applyAction(scenario, run, "status-dep");
    expect(run.appliedActions).toContain("status-dep");

    run = applyAction(scenario, run, "start-app");
    expect(run.appliedActions).not.toContain("start-app");
    run = applyAction(scenario, run, "fix-dep-config");
    run = applyAction(scenario, run, "start-dependency");
    run = applyAction(scenario, run, "start-app");
    expect(run.appliedActions).toContain("start-app");
    expect((run.world.dep as Record<string, unknown>).appStarted).toBe(true);
  });

  it("restarting the dependent unit repeatedly never verifies", () => {
    const scenario = getScenario("service-dependency");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "restart-app-wrong");
    expect(run.appliedActions).toContain("restart-app-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("linux services view lists both units as failed", () => {
    const scenario = getScenario("service-dependency");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<LinuxLab scenario={scenario} run={run} onInspect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getAllByText(/inventory-api/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/redis-cache/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("failed").length).toBeGreaterThanOrEqual(2);
  });
});
