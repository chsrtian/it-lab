import { describe, expect, it } from "vitest";
import {
  applyAction,
  createRun,
  canVerify,
  verify,
  recordCommand,
  askCustomer,
  createConversation,
  buildLearningLoop,
  evaluateActionDef,
  normalizeActionInput,
  processLearnerInput,
  scoreRun,
} from "@/engine";
import { getScenario } from "@/content";
import { executeSimulatedCommand } from "@/engine/terminal";

describe("flagship: pc-no-power hardware causality", () => {
  it("derives psuOutputOk from wall + cable + toggle, not free-floating flags", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    expect(run.world.bench).toMatchObject({
      powerSwitchAtWall: false,
      powerCableSeated: true,
      psuOutputOk: false,
      fansSpin: false,
      posted: false,
    });

    run = applyAction(scenario, run, "check-cable");
    expect((run.world.bench as Record<string, unknown>).powerSwitchAtWall).toBe(false);
    expect((run.world.bench as Record<string, unknown>).psuOutputOk).toBe(false);

    run = applyAction(scenario, run, "check-wall");
    expect((run.world.bench as Record<string, unknown>).psuOutputOk).toBe(true);
    expect((run.world.bench as Record<string, unknown>).fansSpin).toBe(false);

    run = applyAction(scenario, run, "check-front-panel");
    expect(canVerify(scenario, run)).toBe(false);

    run = applyAction(scenario, run, "press-power");
    expect(run.world.bench).toMatchObject({ fansSpin: true, ledsOn: true, posted: true });
    expect(canVerify(scenario, run)).toBe(true);

    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("component inspector actions carry component identity", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const wall = scenario.actions.find((a) => a.id === "check-wall");
    expect(wall?.component).toBe("wall");
    const front = scenario.actions.find((a) => a.id === "check-front-panel");
    expect(front?.component).toBe("front-panel");
  });

  it("state-aware customer replies change after wall power restored", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Is the outlet working for other devices?", run);
    const before = conv.messages[conv.messages.length - 1]?.text ?? "";
    expect(before.toLowerCase()).toContain("lamp");

    run = applyAction(scenario, run, "check-wall");
    conv = askCustomer(scenario, conv, "Is the outlet working for other devices?", run);
    const after = conv.messages[conv.messages.length - 1]?.text ?? "";
    expect(after.toLowerCase()).toContain("strip light is on");
  });

  it("learning loop card exposes five teaching sections", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-wall");
    const action = scenario.actions.find((a) => a.id === "check-wall")!;
    const evaluation = evaluateActionDef(action, false);
    const card = buildLearningLoop(scenario, run, evaluation, action.label);
    expect(card.evaluation).toBe("optimal");
    expect(card.learned.length).toBeGreaterThan(0);
    expect(card.stillUnknown.length).toBeGreaterThan(0);
    expect(card.nextOptions.length).toBeGreaterThan(0);
    expect(card.rationale.length).toBeGreaterThan(10);
  });
});

describe("flagship: dns multi-root-cause + state-derived terminal", () => {
  it("starts with all four root-cause fault flags modeled", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const faults = (scenario.environment.initialWorld.network as {
      faults: Record<string, boolean>;
    }).faults;
    expect(faults).toMatchObject({
      dnsServerDown: true,
      dnsWrongRecord: false,
      portalOffline: false,
      gatewayMisconfigured: false,
    });
    expect(scenario.hypotheses.length).toBeGreaterThanOrEqual(4);
  });

  it("gateway and public IP pings succeed while only DNS is down", async () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    const gw = executeSimulatedCommand(
      { scenario, world: run.world, shell: "windows" },
      "ping 192.168.1.1",
    );
    expect(gw.error).toBeFalsy();
    expect(gw.commandId).toBe("ping-ok");

    const pub = executeSimulatedCommand(
      { scenario, world: run.world, shell: "windows" },
      "ping 8.8.8.8",
    );
    expect(pub.error).toBeFalsy();
    expect(pub.commandId).toBe("ping-ok");

    const dns = executeSimulatedCommand(
      { scenario, world: run.world, shell: "windows" },
      "nslookup example.com",
    );
    expect(dns.error).toBe(true);
    expect(dns.commandId).toBe("nslookup-fail");
  });

  it("nslookup output tracks world faults across root-cause classes", async () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const base = createRun(scenario, "guided").world;

    const wrong = executeSimulatedCommand(
      {
        scenario,
        world: {
          ...base,
          network: { faults: { dnsWrongRecord: true, dnsServerDown: false } },
          dnsZones: { "intranet.corp": "10.0.0.20" },
        },
        shell: "windows",
      },
      "nslookup intranet.corp",
    );
    expect(wrong.commandId).toBe("nslookup-ok");
    expect(wrong.output.join("\n")).toContain("10.0.0.20");

    const path = executeSimulatedCommand(
      {
        scenario,
        world: {
          ...base,
          network: { faults: { gatewayMisconfigured: true, dnsServerDown: false } },
        },
        shell: "windows",
      },
      "nslookup example.com",
    );
    expect(path.error).toBe(true);

    const portal = executeSimulatedCommand(
      {
        scenario,
        world: {
          ...base,
          network: { faults: { portalOffline: true, dnsServerDown: false } },
          dnsZones: { "portal.corp": "10.0.0.30" },
        },
        shell: "windows",
      },
      "nslookup portal.corp",
    );
    expect(portal.error).toBeFalsy();
    expect(portal.output.join("\n")).toContain("portal");
  });

  it("ipconfig reflects host DNS after fix-dns patch", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "diag-ping-gateway");
    run = applyAction(scenario, run, "diag-ping-public");
    run = applyAction(scenario, run, "diag-nslookup");
    run = applyAction(scenario, run, "fix-dns");

    const host = (run.world.hosts as Record<string, unknown>[])[0];
    expect(host.dns).toEqual(["1.1.1.1"]);
    expect((run.world.network as { faults: Record<string, boolean> }).faults.dnsServerDown).toBe(
      false,
    );

    const ip = executeSimulatedCommand(
      { scenario, world: run.world, shell: "windows" },
      "ipconfig",
    );
    expect(ip.output.join("\n")).toContain("1.1.1.1");
  });

  it("golden path still verifies with expanded evidence requirements", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "diag-ping-gateway");
    run = applyAction(scenario, run, "diag-ping-public");
    run = applyAction(scenario, run, "diag-nslookup");
    run = applyAction(scenario, run, "fix-dns");
    run = applyAction(scenario, run, "verify-browse");
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });
});

describe("flagship: linux VFS owner/group/mode", () => {
  it("initial VFS carries owner and group on config.yaml", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    const fs = scenario.environment.initialWorld.fs as {
      children: {
        etc: {
          children: {
            myapp: {
              children: {
                "config.yaml": { mode: string; owner: string; group: string };
              };
            };
          };
        };
      };
    };
    const file = fs.children.etc.children.myapp.children["config.yaml"];
    expect(file).toMatchObject({ mode: "600", owner: "root", group: "root" });
    expect(scenario.environment.initialWorld.users).toBeDefined();
    expect(scenario.environment.initialWorld.groups).toBeDefined();
    expect(scenario.environment.enabledCommands).toContain("chown");
  });

  it("ls -l derives permission string from mode + owner + group", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "ls -l /etc/myapp",
    );
    expect(result.error).toBeFalsy();
    const line = result.output.join("\n");
    expect(line).toContain("-rw-------");
    expect(line).toContain("root root");
    expect(line).toContain("config.yaml");
  });

  it("chmod 660 updates mode in world and ls -l reflects it", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const chmod = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "chmod 660 /etc/myapp/config.yaml",
    );
    expect(chmod.error).toBeFalsy();
    run = recordCommand(
      scenario,
      run,
      chmod.commandId ?? "chmod",
      "chmod 660 /etc/myapp/config.yaml",
      chmod.worldPatch,
    );

    const fs = run.world.fs as {
      children: {
        etc: { children: { myapp: { children: { "config.yaml": { mode: string; owner: string; group: string } } } } };
      };
    };
    const file = fs.children.etc.children.myapp.children["config.yaml"];
    expect(file.mode).toBe("660");
    expect(file.owner).toBe("root");

    const ls = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "ls -l /etc/myapp",
    );
    expect(ls.output.join("\n")).toContain("-rw-rw----");
  });

  it("chown changes owner/group on the config file", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const chown = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "chown root:app /etc/myapp/config.yaml",
    );
    expect(chown.error).toBeFalsy();
    expect(chown.worldPatch).toBeDefined();
    run = recordCommand(
      scenario,
      run,
      chown.commandId ?? "chown",
      "chown root:app /etc/myapp/config.yaml",
      chown.worldPatch,
    );
    const fs = run.world.fs as {
      children: {
        etc: { children: { myapp: { children: { "config.yaml": { owner: string; group: string } } } } };
      };
    };
    const file = fs.children.etc.children.myapp.children["config.yaml"];
    expect(file.owner).toBe("root");
    expect(file.group).toBe("app");
  });

  it("id reflects world currentUser and users list", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const id = executeSimulatedCommand(
      { scenario, world: run.world, shell: "linux" },
      "id",
    );
    expect(id.output.join("\n")).toContain("uid=1000(devon)");
  });

  it("fix-mode action patches VFS mode to 660 root:app", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "fix-mode");
    expect(run.world.perms).toMatchObject({ configFixed: true });
    const fs = run.world.fs as {
      children: {
        etc: { children: { myapp: { children: { "config.yaml": { mode: string; group: string } } } } };
      };
    };
    const file = fs.children.etc.children.myapp.children["config.yaml"];
    expect(file.mode).toBe("660");
    expect(file.group).toBe("app");
  });

  it("golden path verifies", () => {
    const scenario = getScenario("linux-permission-denied");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "whoami-check");
    run = applyAction(scenario, run, "ls-config");
    run = applyAction(scenario, run, "fix-mode");
    run = applyAction(scenario, run, "verify-deploy");
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });
});

describe("action normalization pipeline", () => {
  it("normalizeActionInput maps freeform text to action id", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const n = normalizeActionInput(scenario, "check the wall outlet first");
    expect(n.actionId).toBe("check-wall");
    expect(n.confidence).toBeGreaterThan(0.5);
  });

  it("processLearnerInput runs input→normalize→eval→patch", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = processLearnerInput(scenario, run, "check wall outlet power strip");
    expect(result.stage).toBe("patch");
    expect(result.applied).toBe(true);
    expect(result.trace.actionId).toBe("check-wall");
    expect(result.run.world.bench).toMatchObject({ powerSwitchAtWall: true });
  });

  it("does not patch when step is premature", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const result = processLearnerInput(scenario, run, "point DNS to 1.1.1.1 secondary resolver");
    expect(result.applied).toBe(false);
    expect(result.evaluation.grade).toBe("premature");
    expect(result.trace.stage).not.toBe("patch");
  });

  it("scoreRun includes evidence points from diagnostic commands", () => {
    const scenario = getScenario("dns-some-sites-broken");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const before = scoreRun(scenario, run);
    run = recordCommand(scenario, run, "ipconfig", "ipconfig");
    run = recordCommand(scenario, run, "ping-ok", "ping gateway");
    const after = scoreRun(scenario, run);
    expect(after.evidencePoints).toBeGreaterThan(before.evidencePoints);
  });
});
