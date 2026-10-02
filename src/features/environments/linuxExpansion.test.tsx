import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { executeSimulatedCommand } from "@/engine/terminal";
import { getScenario } from "@/content";
import { LinuxLab } from "@/features/environments/LinuxLab";

describe("linux expansion: disk-full chain", () => {
  it("golden path ends with verified writes", () => {
    const scenario = getScenario("linux-disk-full");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "df-h",
      "journalctl-app",
      "cat-app-conf",
      "purge-and-rotate",
      "restart-app",
      "verify-writes",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("purge waits for both the writer and the policy evidence", () => {
    const scenario = getScenario("linux-disk-full");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "purge-and-rotate");
    expect(run.appliedActions).not.toContain("purge-and-rotate");

    run = applyAction(scenario, run, "journalctl-app");
    run = applyAction(scenario, run, "purge-and-rotate");
    expect(run.appliedActions).not.toContain("purge-and-rotate");

    run = applyAction(scenario, run, "cat-app-conf");
    run = applyAction(scenario, run, "purge-and-rotate");
    expect(run.appliedActions).toContain("purge-and-rotate");
  });

  it("df reports reclaimed space after the purge", () => {
    const scenario = getScenario("linux-disk-full");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "df-h");
    const before = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "df -h",
    );
    expect(before.output.join("\n")).toContain("96%");

    run = applyAction(scenario, run, "journalctl-app");
    run = applyAction(scenario, run, "cat-app-conf");
    run = applyAction(scenario, run, "purge-and-rotate");
    const after = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "df -h",
    );
    expect(after.output.join("\n")).toContain("52%");
  });

  it("reboot trap never verifies", () => {
    const scenario = getScenario("linux-disk-full");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "reboot-wrong");
    expect(run.appliedActions).toContain("reboot-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("filesystem view lists the config and the oversized log", () => {
    const scenario = getScenario("linux-disk-full");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<LinuxLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("/etc/app/app.conf")).toBeTruthy();
    expect(screen.getByText("/var/log/app/debug.log")).toBeTruthy();
  });
});

describe("linux expansion: runaway-process chain", () => {
  it("golden path ends with verified latency", () => {
    const scenario = getScenario("linux-runaway-process");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "journalctl-app",
      "ps-aux",
      "inspect-extract-job",
      "stop-extract-job",
      "restart-app",
      "verify-latency",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("job inspection and stop are gated behind seeing the hog", () => {
    const scenario = getScenario("linux-runaway-process");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "inspect-extract-job");
    expect(run.appliedActions).not.toContain("inspect-extract-job");

    run = applyAction(scenario, run, "ps-aux");
    run = applyAction(scenario, run, "inspect-extract-job");
    expect(run.appliedActions).toContain("inspect-extract-job");

    run = applyAction(scenario, run, "stop-extract-job");
    expect(run.appliedActions).toContain("stop-extract-job");
    const processes = run.world.processes as string[];
    expect(processes.join("\n")).not.toContain("99.7");
  });

  it("ps exposes the runaway row", () => {
    const scenario = getScenario("linux-runaway-process");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "ps aux",
    );
    expect(result.output.join("\n")).toContain("99.7  python3 /opt/extract.py");
  });

  it("processes view shows the hog by default and clears after the fix", () => {
    const scenario = getScenario("linux-runaway-process");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const { rerender, queryByText } = render(
      <LinuxLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByText(/99\.7/)).toBeTruthy();

    run = applyAction(scenario, run, "ps-aux");
    run = applyAction(scenario, run, "inspect-extract-job");
    run = applyAction(scenario, run, "stop-extract-job");
    rerender(<LinuxLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(queryByText(/99\.7/)).toBeNull();
    expect(screen.getAllByText(/nginx: worker process/).length).toBeGreaterThan(0);
  });

  it("reboot trap never verifies", () => {
    const scenario = getScenario("linux-runaway-process");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "reboot-wrong");
    expect(run.appliedActions).toContain("reboot-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });
});
