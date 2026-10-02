import { describe, expect, it } from "vitest";
import { getScenario, getScenarios } from "@/content";
import {
  applyAction,
  askCustomer,
  createConversation,
  createRun,
  evaluateActionDef,
} from "@/engine";

const NEGATIVE_GRADES = new Set([
  "harmful",
  "wrong",
  "risky",
  "premature",
  "unnecessary",
  "low-value",
]);

const P1_TRAPS: Array<[string, string]> = [
  ["windows-wont-boot", "factory-reset-wrong"],
  ["windows-app-crash", "delete-user-file-wrong"],
  ["linux-service-failing", "reboot-blind-wrong"],
  ["wifi-connected-no-internet", "forget-wifi-wrong"],
  ["dhcp-addressing-broken", "static-ip-wrong"],
  ["duplicate-ip-conflict", "disable-dhcp-wrong"],
  ["printer-not-printing", "reinstall-wrong"],
  ["phishing-ticket-triage", "click-test-wrong"],
  ["disk-full-slow-pc", "delete-user-docs-wrong"],
  ["db-connection-refused", "reset-all-passwords-wrong"],
];

describe("content quality: trap actions are never rewarded", () => {
  it("every *-wrong action carries an explicit negative-grade evaluation", () => {
    for (const s of getScenarios()) {
      for (const a of s.actions) {
        if (!a.id.endsWith("-wrong")) continue;
        expect(a.evaluation, `${s.id}/${a.id} missing evaluation`).toBeDefined();
        expect(
          NEGATIVE_GRADES.has(a.evaluation?.grade ?? ""),
          `${s.id}/${a.id} grade=${a.evaluation?.grade} must be negative`,
        ).toBe(true);
      }
    }
  });

  it("the 10 audited traps score negatively instead of earning points", () => {
    for (const [scenarioId, actionId] of P1_TRAPS) {
      const scenario = getScenario(scenarioId);
      expect(scenario, scenarioId).toBeDefined();
      if (!scenario) continue;
      const action = scenario.actions.find((a) => a.id === actionId);
      expect(action, `${scenarioId}/${actionId}`).toBeDefined();
      if (!action) continue;
      const evaluation = evaluateActionDef(action, false);
      expect(
        evaluation.scoreDelta,
        `${scenarioId}/${actionId} grade=${evaluation.grade}`,
      ).toBeLessThan(0);
    }
  });
});

describe("content quality: hints do not spoil fixes", () => {
  it("no hint text contains a full fix-action label", () => {
    for (const s of getScenarios()) {
      const fixLabels = s.actions
        .filter((a) => a.isFix)
        .map((a) => a.label.toLowerCase());
      for (const h of s.hints) {
        const text = h.text.toLowerCase();
        for (const label of fixLabels) {
          expect(
            text.includes(label),
            `${s.id} hint ${h.level} spoils fix label "${label}"`,
          ).toBe(false);
        }
      }
    }
  });

  it("hint chains stay within three escalating levels", () => {
    for (const s of getScenarios()) {
      expect(s.hints.length, s.id).toBeGreaterThanOrEqual(1);
      expect(s.hints.length, s.id).toBeLessThanOrEqual(3);
      let previous = 0;
      for (const h of s.hints) {
        if (h.level === undefined) continue;
        expect(h.level, `${s.id} level order`).toBeGreaterThan(previous);
        previous = h.level;
      }
    }
  });
});

describe("content quality: evaluations cover every action", () => {
  it("every action has an evaluation with grade and a substantive rationale", () => {
    for (const s of getScenarios()) {
      for (const a of s.actions) {
        expect(a.evaluation, `${s.id}/${a.id} missing evaluation`).toBeDefined();
        expect(a.evaluation?.grade, `${s.id}/${a.id} missing grade`).toBeTruthy();
        expect(
          (a.evaluation?.rationale ?? "").length,
          `${s.id}/${a.id} rationale too short`,
        ).toBeGreaterThan(10);
      }
    }
  });
});

describe("content quality: debriefs teach rule-outs and principles", () => {
  it("every debrief includes a Rule out step and a transferable principle", () => {
    for (const s of getScenarios()) {
      const steps = s.debrief.methodologyMap.map((m) => m.step);
      expect(steps, `${s.id} methodologyMap`).toContain("Rule out");
      expect(s.debrief.whyItWorked, `${s.id} whyItWorked`).toContain(
        "Transferable principle",
      );
    }
  });
});

describe("content quality: evidence-first gates and conversations", () => {
  it("windows-wont-boot requires log review before Startup Repair", () => {
    const scenario = getScenario("windows-wont-boot");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "boot-recovery");
    run = applyAction(scenario, run, "run-startup-repair");
    expect(run.appliedActions).not.toContain("run-startup-repair");
    expect(run.lastFeedback).toContain("gather more evidence");

    run = applyAction(scenario, run, "review-boot-logs");
    run = applyAction(scenario, run, "run-startup-repair");
    expect(run.appliedActions).toContain("run-startup-repair");
  });

  it("windows-wont-boot customer reply changes after the repair", () => {
    const scenario = getScenario("windows-wont-boot");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Did the repair make any progress?", run);
    const before = conv.messages[conv.messages.length - 1]?.text ?? "";

    run = applyAction(scenario, run, "boot-recovery");
    run = applyAction(scenario, run, "review-boot-logs");
    run = applyAction(scenario, run, "run-startup-repair");
    conv = askCustomer(scenario, conv, "Did the repair make any progress?", run);
    const after = conv.messages[conv.messages.length - 1]?.text ?? "";

    expect(after).toContain("restarted twice");
    expect(after).not.toBe(before);
  });

  it("linux-permission-denied reply reports success only after the fix", () => {
    const scenario = getScenario("linux-permission-denied");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Did the deploy work again?", run);
    const before = conv.messages[conv.messages.length - 1]?.text ?? "";

    run = applyAction(scenario, run, "fix-mode");
    conv = askCustomer(scenario, conv, "Did the deploy work again?", run);
    const after = conv.messages[conv.messages.length - 1]?.text ?? "";

    expect(after).toContain("ran clean");
    expect(after).not.toBe(before);
  });

  it("walkup/phone scenarios now expose conversation scripts", () => {
    for (const id of [
      "wifi-connected-no-internet",
      "duplicate-ip-conflict",
      "printer-not-printing",
    ]) {
      const scenario = getScenario(id);
      expect(scenario, id).toBeDefined();
      expect(scenario?.conversation?.persona.length ?? 0, id).toBeGreaterThan(0);
      expect(scenario?.conversation?.replies.length ?? 0, id).toBeGreaterThan(0);
      expect(scenario?.conversation?.defaultReply.length ?? 0, id).toBeGreaterThan(
        0,
      );
    }
  });

  it("new layer-1 diagnostics carry rule-out evidence gains", () => {
    const dhcp = getScenario("dhcp-addressing-broken");
    const link = dhcp?.actions.find((a) => a.id === "check-link");
    expect(link?.evaluation?.evidenceGain).toContain("ruled out");

    const duplicate = getScenario("duplicate-ip-conflict");
    const links = duplicate?.actions.find((a) => a.id === "check-links");
    expect(links?.evaluation?.evidenceGain).toContain("ruled out");
  });
});

describe("content quality: taxonomy metadata", () => {
  const TYPES = new Set([
    "FOUNDATIONAL_DIAGNOSIS",
    "EVIDENCE_DISCRIMINATION",
    "COMPONENT_FAILURE",
    "CONFIGURATION_ERROR",
    "SERVICE_FAILURE",
    "DEPENDENCY_FAILURE",
    "RESOURCE_EXHAUSTION",
    "MULTI_FAULT",
    "INTERMITTENT_FAILURE",
    "COMMUNICATION_SUPPORT",
    "SECURITY_TRIAGE",
    "RECOVERY",
    "CROSS_DOMAIN",
  ]);

  it("every scenario declares exactly one primary scenario type", () => {
    for (const s of getScenarios()) {
      expect(s.scenarioType, s.id).toBeTruthy();
      expect(TYPES.has(s.scenarioType), `${s.id}: ${s.scenarioType}`).toBe(true);
    }
  });

  it("scenario prerequisites point at existing scenarios (link integrity)", () => {
    const ids = new Set(getScenarios().map((s) => s.id));
    for (const s of getScenarios()) {
      for (const p of s.prerequisites) {
        expect(ids.has(p), `${s.id} → ${p}`).toBe(true);
      }
    }
  });
});
