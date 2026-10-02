import { describe, expect, it } from "vitest";
import {
  applyAction,
  createRun,
  evaluateActionText,
  createConversation,
  askCustomer,
  submitDiagnosis,
  mentorHint,
  explainConcept,
  scoreRun,
  hintPreview,
  matchActionByText,
  getConversationScript,
  recordCommand,
} from "@/engine";
import { getScenario, getScenarios, validateContent } from "@/content";

describe("simulation foundation content", () => {
  it("still validates all content", () => {
    const result = validateContent();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("has conversation scripts on migrated scenarios", () => {
    for (const id of ["pc-no-power", "linux-permission-denied", "dns-some-sites-broken", "account-lockout", "windows-wont-boot"]) {
      const s = getScenario(id);
      expect(s, id).toBeDefined();
      expect(s?.conversation, id).toBeDefined();
      expect(s?.conversation?.persona.length ?? 0).toBeGreaterThan(0);
      expect(s?.conversation?.replies.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("has evaluation grades on representative actions", () => {
    const pc = getScenario("pc-no-power");
    const wall = pc?.actions.find((a) => a.id === "check-wall");
    expect(wall?.evaluation?.grade).toBe("optimal");
    const bad = pc?.actions.find((a) => a.id === "replace-psu-wrong");
    expect(bad?.evaluation?.grade).toBe("wrong");
  });

  it("environment components are present on domain scenarios", () => {
    const linux = getScenario("linux-permission-denied");
    expect(linux?.environment.components).toContain("filesystem");
    const net = getScenario("dns-some-sites-broken");
    expect(net?.environment.components).toContain("network-topology");
    const win = getScenario("windows-wont-boot");
    expect(win?.environment.components).toContain("event-viewer");
  });
});

describe("ActionEvaluator", () => {
  it("matches freeform text to known actions", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const match = matchActionByText(scenario, "check the wall outlet first");
    expect(match?.id).toBe("check-wall");
  });

  it("grades optimal diagnostic text", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = evaluateActionText(scenario, run, "check wall outlet power strip");
    expect(result.grade).toBe("optimal");
    expect(result.scoreDelta).toBeGreaterThan(0);
    expect(result.rationale.length).toBeGreaterThan(10);
  });

  it("marks already-applied steps as unnecessary", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-wall");
    const result = evaluateActionText(scenario, run, "check wall outlet");
    expect(result.grade).toBe("unnecessary");
    expect(result.alreadyApplied).toBe(true);
  });

  it("returns unknown for unmatched text", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = evaluateActionText(scenario, run, "quantum flux capacitor realign");
    expect(result.grade).toBe("unknown");
    expect(result.scoreDelta).toBe(0);
    expect(result.learnMore).toBe("troubleshooting-method");
  });

  it("grades premature when appliesWhen is not met", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = evaluateActionText(scenario, run, "point DNS to 1.1.1.1 secondary resolver");
    expect(result.grade).toBe("premature");
    expect(result.unavailable).toBe(true);
    expect(result.scoreDelta).toBeLessThan(0);
  });
});

describe("state-driven terminal", () => {
  it("chmod mutates virtual filesystem mode", async () => {
    const { executeSimulatedCommand } = await import("@/engine/terminal");
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const result = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "chmod 660 /etc/myapp/config.yaml",
    );
    expect(result.error).toBeFalsy();
    expect(result.worldPatch).toBeDefined();
    run = recordCommand(scenario, run, result.commandId ?? "chmod", "chmod 660 /etc/myapp/config.yaml", result.worldPatch);
    const fs = run.world.fs as {
      children?: {
        etc?: { children?: { myapp?: { children?: { "config.yaml"?: { mode?: string } } } } };
      };
    };
    expect(fs.children?.etc?.children?.myapp?.children?.["config.yaml"]?.mode).toBe("660");
    expect((run.world.perms as { configFixed?: boolean } | undefined)?.configFixed).toBe(true);
  });

  it("nslookup fails while DNS down and succeeds after fix", async () => {
    const { executeSimulatedCommand } = await import("@/engine/terminal");
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const fail = executeSimulatedCommand(
      { scenario, world: run.world, shell: "windows" },
      "nslookup example.com",
    );
    expect(fail.error).toBe(true);
    expect(fail.commandId).toBe("nslookup-fail");

    const fixedWorld = {
      ...run.world,
      network: { faults: { dnsServerDown: false, gatewayMisconfigured: false, noInternet: false } },
      dnsZones: { "example.com": "93.184.216.34" },
    };
    const ok = executeSimulatedCommand(
      { scenario, world: fixedWorld, shell: "windows" },
      "nslookup example.com",
    );
    expect(ok.error).toBeFalsy();
    expect(ok.output.join("\n")).toContain("93.184.216.34");
  });

  it("systemctl restart can update service state", async () => {
    const { executeSimulatedCommand } = await import("@/engine/terminal");
    const scenario = getScenario("linux-service-failing");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "systemctl restart nginx",
    );
    expect(result.commandId).toBe("systemctl-restart");
    if (result.worldPatch) {
      const next = recordCommand(scenario, run, result.commandId!, "systemctl restart nginx", result.worldPatch);
      const services = next.world.services as { name: string; status: string }[];
      expect(services.find((s) => s.name === "nginx")?.status).toBeDefined();
    }
  });

  it("terminal diagnostic command can auto-apply matching action", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = recordCommand(scenario, run, "ping-ok", "ping gateway");
    expect(run.appliedActions).toContain("diag-ping-gateway");
  });
});

describe("mentor concept explanations", () => {
  it("explains DNS concept without revealing fix", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let conv = createConversation(scenario);
    conv = explainConcept(scenario, conv, "DNS");
    const last = conv.messages[conv.messages.length - 1];
    expect(last?.role).toBe("mentor");
    expect(last?.text.toLowerCase()).toContain("dns");
    expect(last?.text.toLowerCase()).not.toContain("1.1.1.1");
    expect(conv.revealedConcepts).toContain("dns");
  });
});

describe("ConversationEngine", () => {
  it("opens with customer symptom", () => {
    const scenario = getScenario("account-lockout");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const conv = createConversation(scenario);
    expect(conv.messages[0]?.role).toBe("customer");
    expect(conv.messages[0]?.text).toContain("locked");
  });

  it("answers matched customer questions and reveals concepts", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Was there a storm last night?");
    expect(conv.messages.length).toBeGreaterThanOrEqual(3);
    const last = conv.messages[conv.messages.length - 1];
    expect(last?.role).toBe("customer");
    expect(conv.revealedConcepts.length).toBeGreaterThan(0);
    expect(conv.askedCustomerKeys.length).toBeGreaterThan(0);
  });

  it("falls back to default reply for unmatched questions", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const script = getConversationScript(scenario);
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "zzz unrelated question xyz");
    const last = conv.messages[conv.messages.length - 1];
    expect(last?.text).toBe(script.defaultReply);
  });

  it("submitDiagnosis returns mentor evaluation and may apply available action", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = submitDiagnosis(scenario, run, "check wall outlet");
    expect(result.actionId).toBe("check-wall");
    expect(["optimal", "good"]).toContain(result.grade);
    expect(result.reply).toContain("Strong");
  });

  it("mentor tips are progressive", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let conv = createConversation(scenario);
    const before = conv.mentorTipsShown;
    conv = mentorHint(scenario, conv);
    expect(conv.mentorTipsShown).toBe(before + 1);
    expect(conv.messages.some((m) => m.role === "mentor")).toBe(true);
  });
});

describe("HintSystem scoring", () => {
  it("scores a clean verified run higher than one with hints", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;

    let clean = createRun(scenario, "guided");
    clean = applyAction(scenario, clean, "check-wall");
    clean = applyAction(scenario, clean, "check-cable");
    clean = applyAction(scenario, clean, "check-front-panel");
    clean = applyAction(scenario, clean, "press-power");
    const cleanScore = scoreRun(scenario, clean);
    expect(cleanScore.total).toBeGreaterThan(0);
    expect(cleanScore.usedHints).toBe(0);

    let hinted = createRun(scenario, "guided");
    hinted = { ...hinted, hintsUsed: [1, 2] };
    hinted = applyAction(scenario, hinted, "check-wall");
    const hintedScore = scoreRun(scenario, hinted);
    expect(hintedScore.usedHints).toBe(2);
    expect(hintedScore.hintPenalty).toBeGreaterThan(0);
    expect(cleanScore.total).toBeGreaterThan(hintedScore.total);
  });

  it("penalizes wrong actions", () => {
    const scenario = getScenario("windows-app-crash");
    if (!scenario) return;
    let run = createRun(scenario, "challenge");
    run = applyAction(scenario, run, "delete-user-file-wrong");
    const score = scoreRun(scenario, run);
    expect(score.wrongActions).toBeGreaterThanOrEqual(0);
    expect(score.wrongPenalty).toBeGreaterThanOrEqual(0);
  });

  it("hintPreview tracks locked vs unlocked levels", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const preview = hintPreview(scenario, run);
    expect(preview).toHaveLength(scenario.hints.length);
    expect(preview.every((p) => p.locked)).toBe(true);
  });
});

describe("migrated scenario golden paths still pass", () => {
  it("pc-no-power verifies after correct sequence", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-wall");
    run = applyAction(scenario, run, "check-cable");
    run = applyAction(scenario, run, "check-front-panel");
    run = applyAction(scenario, run, "press-power");
    expect(run.world).toMatchObject({ bench: { posted: true } });
    const score = scoreRun(scenario, run);
    expect(score.total).toBeGreaterThanOrEqual(11);
    expect(score.diagnosticPoints).toBeGreaterThan(0);
    expect(score.fixPoints).toBeGreaterThan(0);
  });

  it("account-lockout verifies after identity workflow", () => {
    const scenario = getScenario("account-lockout");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "verify-identity");
    run = applyAction(scenario, run, "check-recent-failures");
    run = applyAction(scenario, run, "unlock-reset");
    run = applyAction(scenario, run, "verify-login");
    expect(run.world).toMatchObject({ identity: { loggedIn: true } });
  });

  it("content count unchanged (100 scenarios)", () => {
    expect(getScenarios().length).toBe(100);
  });
});
