import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { DatabaseLab } from "@/features/environments/DatabaseLab";
import { dbAppView, dbStatus } from "@/features/database/dbState";

describe("database expansion: auth-failure chain", () => {
  it("golden path ends with a verified connection", () => {
    const scenario = getScenario("db-auth-failure");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "read-logs",
      "check-port",
      "check-service",
      "compare-secret",
      "sync-secret",
      "verify-query",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("secret comparison and sync are evidence-gated in order", () => {
    const scenario = getScenario("db-auth-failure");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "compare-secret");
    expect(run.appliedActions).not.toContain("compare-secret");

    run = applyAction(scenario, run, "check-service");
    run = applyAction(scenario, run, "compare-secret");
    expect(run.appliedActions).toContain("compare-secret");

    run = applyAction(scenario, run, "sync-secret");
    expect(run.appliedActions).toContain("sync-secret");
    expect((run.world.db as Record<string, unknown>).authFailed).toBe(false);
  });

  it("symptom is AUTH ERROR from the start and status names it honestly", () => {
    const scenario = getScenario("db-auth-failure");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    expect(dbAppView(run.world)).toMatchObject({ state: "AUTH ERROR", tone: "crit" });
    expect(dbStatus(run.world)).toEqual({ tone: "crit", label: "app auth rejected" });
  });

  it("restart-the-database trap never verifies", () => {
    const scenario = getScenario("db-auth-failure");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "restart-db-wrong");
    expect(run.appliedActions).toContain("restart-db-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });
});

describe("database expansion: pool-exhausted chain", () => {
  it("golden path ends with a verified connection", () => {
    const scenario = getScenario("db-pool-exhausted");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "read-logs",
      "check-port",
      "check-service",
      "count-sessions",
      "terminate-idle",
      "verify-query",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("session counting waits for service health; termination waits for the leak", () => {
    const scenario = getScenario("db-pool-exhausted");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "count-sessions");
    expect(run.appliedActions).not.toContain("count-sessions");

    run = applyAction(scenario, run, "check-service");
    run = applyAction(scenario, run, "count-sessions");
    expect(run.appliedActions).toContain("count-sessions");

    run = applyAction(scenario, run, "terminate-idle");
    expect(run.appliedActions).toContain("terminate-idle");
    expect((run.world.db as Record<string, unknown>).poolExhausted).toBe(false);
  });

  it("symptom is REJECTED from the start and status names it honestly", () => {
    const scenario = getScenario("db-pool-exhausted");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    expect(dbAppView(run.world)).toMatchObject({ state: "REJECTED", tone: "crit" });
    expect(dbStatus(run.world)).toEqual({
      tone: "crit",
      label: "app connections exhausted",
    });
  });

  it("restart-the-database trap never verifies", () => {
    const scenario = getScenario("db-pool-exhausted");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "restart-db-wrong");
    expect(run.appliedActions).toContain("restart-db-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });
});

describe("database expansion: lab surface", () => {
  it("checks strip exposes the canonical probes for both scenarios", () => {
    for (const id of ["db-auth-failure", "db-pool-exhausted"]) {
      const scenario = getScenario(id);
      if (!scenario) return;
      const run = createRun(scenario, "guided");
      const { unmount } = render(
        <DatabaseLab scenario={scenario} run={run} onInspect={() => {}} />,
      );
      expect(screen.getByText("Read DB and app logs")).toBeTruthy();
      expect(screen.getByText(/Check listening port 5432/)).toBeTruthy();
      expect(screen.getByText("systemctl status postgresql")).toBeTruthy();
      unmount();
    }
  });

  it("auth scenario shows its fourth check; pool scenario shows its own", () => {
    const auth = getScenario("db-auth-failure");
    if (!auth) return;
    const authRun = createRun(auth, "guided");
    const first = render(<DatabaseLab scenario={auth} run={authRun} onInspect={() => {}} />);
    expect(screen.getByText("Compare app secret with vault version")).toBeTruthy();
    first.unmount();

    const pool = getScenario("db-pool-exhausted");
    if (!pool) return;
    const poolRun = createRun(pool, "guided");
    render(<DatabaseLab scenario={pool} run={poolRun} onInspect={() => {}} />);
    expect(screen.getByText("Count client sessions on 5432")).toBeTruthy();
  });
});
