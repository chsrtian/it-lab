import { describe, expect, it } from "vitest";
import {
  applyAction,
  createRun,
  canVerify,
  verify,
  requestHint,
  availableActions,
} from "@/engine/scenario";
import { getScenario, getScenarios, validateContent } from "@/content";

describe("content integrity", () => {
  it("validates all scenarios, KB links, and curriculum refs", () => {
    const result = validateContent();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.scenarioIds.length).toBeGreaterThanOrEqual(12);
    expect(result.kbIds.length).toBeGreaterThanOrEqual(12);
  });

  it("parses every scenario without throwing", () => {
    expect(() => getScenarios()).not.toThrow();
    expect(getScenarios().length).toBeGreaterThanOrEqual(12);
  });
});

describe("scenario engine golden paths", () => {
  it("pc-no-power: diagnose wall + front panel, power on, verify", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    expect(run.status).toBe("in_progress");
    expect(canVerify(scenario, run)).toBe(false);

    run = applyAction(scenario, run, "check-wall");
    expect(run.world).toMatchObject({ bench: { powerSwitchAtWall: true } });

    run = applyAction(scenario, run, "check-cable");
    run = applyAction(scenario, run, "check-front-panel");

    const available = availableActions(scenario, run).map((a) => a.id);
    expect(available).toContain("press-power");

    run = applyAction(scenario, run, "press-power");
    expect(run.world).toMatchObject({ bench: { posted: true, fansSpin: true } });
    expect(canVerify(scenario, run)).toBe(true);

    run = verify(scenario, run);
    expect(run.status).toBe("verified");
    expect(run.lastVerifyFailures).toEqual([]);
  });

  it("blocks premature power-on with feedback", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let run = createRun(scenario, "practice");
    run = applyAction(scenario, run, "press-power");
    expect(run.appliedActions).not.toContain("press-power");
    expect(run.lastFeedback).toMatch(/evidence|cannot/i);
  });

  it("tracks hints", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = requestHint(scenario, run);
    expect(run.hintsUsed).toEqual([1]);
    expect(run.lastFeedback).toContain("Hint");
  });

  it("linux-permission-denied: fix mode and verify", () => {
    const scenario = getScenario("linux-permission-denied");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "practice");

    run = applyAction(scenario, run, "whoami-check");
    run = applyAction(scenario, run, "ls-config");
    run = applyAction(scenario, run, "fix-mode");
    run = applyAction(scenario, run, "verify-deploy");
    expect(run.world).toMatchObject({ perms: { configFixed: true, verified: true } });

    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("dns scenario: command evidence enables fix", () => {
    const scenario = getScenario("dns-some-sites-broken");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    const before = availableActions(scenario, run).map((a) => a.id);
    expect(before).toContain("diag-ping-gateway");

    run = applyAction(scenario, run, "diag-ping-gateway");
    run = applyAction(scenario, run, "diag-ping-public");
    run = applyAction(scenario, run, "diag-nslookup");
    run = applyAction(scenario, run, "fix-dns");
    run = applyAction(scenario, run, "verify-browse");

    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("windows-app-crash golden path", () => {
    const scenario = getScenario("windows-app-crash");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "open-event-viewer");
    run = applyAction(scenario, run, "read-faulting-module");
    run = applyAction(scenario, run, "install-dependency");
    run = applyAction(scenario, run, "start-service");
    run = applyAction(scenario, run, "verify-open-q3");
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("wrong path feedback on destructive action", () => {
    const scenario = getScenario("windows-app-crash");
    if (!scenario) return;
    let run = createRun(scenario, "challenge");
    run = applyAction(scenario, run, "delete-user-file-wrong");
    expect(run.lastFeedback).toMatch(/Destructive|dependency|corruption/i);
  });
});
