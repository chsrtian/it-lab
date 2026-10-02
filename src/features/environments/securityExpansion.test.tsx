import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { SecurityLab } from "@/features/environments/SecurityLab";

describe("security expansion: suspicious-signin chain", () => {
  it("golden path ends verified with contain-before-recover ordering", () => {
    const scenario = getScenario("suspicious-signin");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "review-signin-alert",
      "check-signin-origin",
      "contact-user",
      "revoke-session",
      "reset-password",
      "close-alert",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("origin, attestation, revoke and reset are evidence-gated in order", () => {
    const scenario = getScenario("suspicious-signin");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "check-signin-origin");
    expect(run.appliedActions).not.toContain("check-signin-origin");

    run = applyAction(scenario, run, "review-signin-alert");
    run = applyAction(scenario, run, "check-signin-origin");
    run = applyAction(scenario, run, "contact-user");
    expect(run.appliedActions).toContain("contact-user");

    run = applyAction(scenario, run, "reset-password");
    expect(run.appliedActions).not.toContain("reset-password");
    run = applyAction(scenario, run, "revoke-session");
    run = applyAction(scenario, run, "reset-password");
    expect(run.appliedActions).toContain("reset-password");
    expect((run.world.identity as Record<string, unknown>).passwordReset).toBe(true);
  });

  it("dismiss-as-false-positive trap never verifies", () => {
    const scenario = getScenario("suspicious-signin");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "dismiss-alert-wrong");
    expect(run.appliedActions).toContain("dismiss-alert-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("evidence board shows persistent records from the start and gated rows after checks", () => {
    const scenario = getScenario("suspicious-signin");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const first = render(
      <SecurityLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByText("Sign-ins today")).toBeTruthy();
    expect(screen.getByText("Recorded: 3")).toBeTruthy();
    expect(screen.getByText("Failed logons")).toBeTruthy();
    expect(screen.queryByText("Sign-in origin")).toBeNull();
    first.unmount();

    run = applyAction(scenario, run, "review-signin-alert");
    run = applyAction(scenario, run, "check-signin-origin");
    const second = render(
      <SecurityLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByText("Sign-in origin")).toBeTruthy();
    expect(screen.queryByText("User attestation")).toBeNull();
    second.unmount();

    run = applyAction(scenario, run, "contact-user");
    render(<SecurityLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("User attestation")).toBeTruthy();
  });
});

describe("security expansion: malware-endpoint-alert chain", () => {
  it("golden path ends verified with kill → un-persist → prove ordering", () => {
    const scenario = getScenario("malware-endpoint-alert");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "review-alert",
      "trace-origin",
      "check-persistence",
      "quarantine-process",
      "remove-persistence",
      "verify-scan",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("origin, persistence, quarantine and cleanup are evidence-gated in order", () => {
    const scenario = getScenario("malware-endpoint-alert");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "check-persistence");
    expect(run.appliedActions).not.toContain("check-persistence");

    run = applyAction(scenario, run, "review-alert");
    run = applyAction(scenario, run, "trace-origin");
    run = applyAction(scenario, run, "check-persistence");
    expect(run.appliedActions).toContain("check-persistence");

    run = applyAction(scenario, run, "remove-persistence");
    expect(run.appliedActions).not.toContain("remove-persistence");
    run = applyAction(scenario, run, "quarantine-process");
    run = applyAction(scenario, run, "remove-persistence");
    expect(run.appliedActions).toContain("remove-persistence");
    expect((run.world.endpoint as Record<string, unknown>).persistenceCleared).toBe(true);
  });

  it("manual delete trap never verifies", () => {
    const scenario = getScenario("malware-endpoint-alert");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "delete-binary-wrong");
    expect(run.appliedActions).toContain("delete-binary-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("evidence board shows the open alert from the start and gated rows after checks", () => {
    const scenario = getScenario("malware-endpoint-alert");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const first = render(
      <SecurityLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByText("Open EDR alerts")).toBeTruthy();
    expect(screen.getByText("Recorded: 1")).toBeTruthy();
    expect(screen.queryByText("Delivery origin")).toBeNull();
    expect(screen.queryByText("Persistence")).toBeNull();
    first.unmount();

    run = applyAction(scenario, run, "review-alert");
    run = applyAction(scenario, run, "trace-origin");
    const second = render(
      <SecurityLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByText("Delivery origin")).toBeTruthy();
    expect(screen.queryByText("Threat state")).toBeNull();
    second.unmount();

    run = applyAction(scenario, run, "check-persistence");
    run = applyAction(scenario, run, "quarantine-process");
    render(<SecurityLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("Persistence")).toBeTruthy();
    expect(screen.getByText("Threat state")).toBeTruthy();
  });

  it("checks strip exposes the three triage probes", () => {
    const scenario = getScenario("malware-endpoint-alert");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<SecurityLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("Review EDR behavior record")).toBeTruthy();
    expect(screen.getByText("Trace how the file arrived")).toBeTruthy();
    expect(screen.getByText("Check for persistence")).toBeTruthy();
  });
});
