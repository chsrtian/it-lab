import { describe, expect, it } from "vitest";
import { executeSimulatedCommand } from "@/engine/terminal";
import { scenarioSchema, type Scenario, type ScenarioInput } from "@/content/schema";

function makeScenario(enabled: string[], world: Record<string, unknown>): Scenario {
  const input: ScenarioInput = {
    id: "test-cmds",
    version: 1,
    title: "Test scenario for terminal",
    category: "networking",
    difficulty: "beginner",
    scenarioType: "EVIDENCE_DISCRIMINATION",
    modeSupport: ["guided", "practice", "challenge"],
    estimatedMinutes: 5,
    learningObjectives: ["exercise terminal"],
    prerequisites: [],
    skills: ["terminal"],
    ticket: {
      id: "T-1",
      user: "Tester",
      role: "Learner",
      symptomPlainLanguage: "Testing",
      priority: "low",
      channel: "portal",
    },
    environment: {
      kind: "linux-terminal",
      shell: "linux",
      initialWorld: world,
      availableTools: ["terminal"],
      enabledCommands: enabled,
    },
    hypotheses: [],
    actions: [
      {
        id: "noop",
        label: "Noop",
        kind: "ui",
        patch: {},
      },
    ],
    successConditions: [{ type: "stateEquals", path: "done", value: true }],
    verificationSteps: [{ type: "stateEquals", path: "done", value: true }],
    wrongPaths: [],
    hints: [{ level: 1, text: "hint" }],
    debrief: {
      rootCause: "test",
      whyItWorked: "test",
      methodologyMap: [{ step: "x", whatLearnerDid: "y" }],
      followUps: [],
    },
    knowledgeLinks: ["troubleshooting-method"],
    references: [],
  };
  return scenarioSchema.parse(input);
}

describe("executeSimulatedCommand safety & allowlist", () => {
  it("never returns shell escapes — unknown commands fail closed", () => {
    const scenario = makeScenario(["ping"], {});
    const result = executeSimulatedCommand(
      { scenario, world: {}, shell: "linux" },
      "rm -rf / --no-preserve-root",
    );
    expect(result.error).toBe(true);
    expect(result.output.join("\n")).toContain("command not found");
    expect(result.output.join("\n")).toContain("help");
  });

  it("does not interpret operators or substitution as real shell", () => {
    const scenario = makeScenario(["echo"], {});
    const result = executeSimulatedCommand(
      { scenario, world: {}, shell: "linux" },
      "echo hi && cat /etc/passwd",
    );
    expect(result.output).toEqual(["hi && cat /etc/passwd"]);
    expect(result.commandId).toBe("echo");
  });

  it("runs allowlisted ping against simulated world", () => {
    const scenario = makeScenario(["ping"], {
      hosts: [{ ips: ["192.168.1.50"], gateway: "192.168.1.1", dns: ["192.168.1.1"], mac: "aa" }],
      network: { faults: { noInternet: true } },
    });
    const ok = executeSimulatedCommand(
      {
        scenario,
        world: {
          hosts: [{ ips: ["192.168.1.50"], gateway: "192.168.1.1", dns: ["192.168.1.1"], mac: "aa" }],
          network: { faults: {} },
        },
        shell: "linux",
      },
      "ping 192.168.1.1",
    );
    expect(ok.error).toBeFalsy();
    expect(ok.commandId).toBe("ping-ok");

    const bad = executeSimulatedCommand(
      {
        scenario,
        world: {
          hosts: [{ ips: ["192.168.1.50"], gateway: "192.168.1.1", dns: ["192.168.1.1"], mac: "aa" }],
          network: { faults: { noInternet: true } },
        },
        shell: "linux",
      },
      "ping 8.8.8.8",
    );
    expect(bad.error).toBe(true);
    expect(bad.commandId).toBe("ping-fail");
  });

  it("blocks disabled commands", () => {
    const scenario = makeScenario(["ping"], {});
    const result = executeSimulatedCommand(
      { scenario, world: {}, shell: "linux" },
      "ipconfig",
    );
    expect(result.error).toBe(true);
  });

  it("clear returns sentinel only", () => {
    const scenario = makeScenario([], {});
    const result = executeSimulatedCommand(
      { scenario, world: {}, shell: "windows" },
      "cls",
    );
    expect(result.output).toEqual(["__CLEAR__"]);
  });

  it("chmod mutates fs mode via worldPatch", () => {
    const scenario = makeScenario(["chmod"], {
      fs: {
        type: "dir",
        name: "/",
        children: {
          etc: {
            type: "dir",
            children: {
              app: {
                type: "dir",
                children: {
                  "config.yaml": { type: "file", name: "config.yaml", mode: "600", content: "x" },
                },
              },
            },
          },
        },
      },
      perms: { configFixed: false },
    });
    const result = executeSimulatedCommand(
      {
        scenario,
        world: {
          fs: {
            type: "dir",
            name: "/",
            children: {
              etc: {
                type: "dir",
                children: {
                  app: {
                    type: "dir",
                    children: {
                      "config.yaml": { type: "file", name: "config.yaml", mode: "600", content: "x" },
                    },
                  },
                },
              },
            },
          },
          perms: { configFixed: false },
        },
        shell: "linux",
      },
      "chmod 660 /etc/app/config.yaml",
    );
    expect(result.error).toBeFalsy();
    expect(result.worldPatch).toBeDefined();
    const patch = result.worldPatch as {
      fs: { children: { etc: { children: { app: { children: { "config.yaml": { mode: string } } } } } } };
      perms: { configFixed: boolean };
    };
    expect(patch.fs.children.etc.children.app.children["config.yaml"].mode).toBe("660");
    expect(patch.perms.configFixed).toBe(true);
  });

  it("nslookup honors dnsZones and dnsServerDown", () => {
    const scenario = makeScenario(["nslookup"], {});
    const down = executeSimulatedCommand(
      {
        scenario,
        world: {
          hosts: [{ dns: ["192.168.1.1"], ips: ["10.0.0.5"], gateway: "192.168.1.1" }],
          network: { faults: { dnsServerDown: true } },
        },
        shell: "windows",
      },
      "nslookup example.com",
    );
    expect(down.error).toBe(true);

    const up = executeSimulatedCommand(
      {
        scenario,
        world: {
          hosts: [{ dns: ["192.168.1.1"], ips: ["10.0.0.5"], gateway: "192.168.1.1" }],
          network: { faults: {} },
          dnsZones: { "app.corp": "10.0.0.9" },
        },
        shell: "windows",
      },
      "nslookup app.corp",
    );
    expect(up.error).toBeFalsy();
    expect(up.output.join("\n")).toContain("10.0.0.9");
  });
});

describe("terminal: ps and ls evidence fidelity", () => {
  it("ps includes world process rows alongside services", () => {
    const scenario = makeScenario(["ps"], {});
    const result = executeSimulatedCommand(
      {
        scenario,
        world: {
          processes: ["root    812  99.7  python3 /opt/extract.py"],
          services: [{ id: "app", name: "app.service" }],
        },
        shell: "linux",
      },
      "ps aux",
    );
    const text = result.output.join("\n");
    expect(text).toContain("99.7  python3 /opt/extract.py");
    expect(text).toContain("app.service");
  });

  it("ps without world processes keeps the service-derived list", () => {
    const scenario = makeScenario(["ps"], {});
    const result = executeSimulatedCommand(
      { scenario, world: { services: [{ id: "nginx", name: "nginx" }] }, shell: "linux" },
      "ps",
    );
    const text = result.output.join("\n");
    expect(text).toContain("/sbin/init");
    expect(text).toContain("nginx");
    expect(text).not.toContain("99.7");
  });

  it("ls -l honors an explicit size field over content length", () => {
    const scenario = makeScenario(["ls"], {});
    const result = executeSimulatedCommand(
      {
        scenario,
        world: {
          cwd: "/",
          fs: {
            type: "dir",
            name: "/",
            children: {
              var: {
                type: "dir",
                name: "var",
                children: {
                  log: {
                    type: "dir",
                    name: "log",
                    children: {
                      app: {
                        type: "dir",
                        name: "app",
                        children: {
                          "debug.log": {
                            type: "file",
                            name: "debug.log",
                            mode: "640",
                            size: "46G",
                            content: "tail line",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        shell: "linux",
      },
      "ls -l /var/log/app",
    );
    expect(result.output.join("\n")).toContain("46G");
  });
});
