import { describe, expect, it } from "vitest";
import { getScenario, getScenarios } from "@/content";
import {
  GUIDE_CUES,
  guidedWalkthroughSchema,
  scenarioSchema,
  type GuidedStep,
  type GuidedWalkthrough,
} from "@/content/schema";
import { applyAction, createRun, recordCommand } from "@/engine";
import {
  guideProgress,
  guideStepCue,
  guideStepDoneWhen,
  isStepComplete,
  validateGuidedWalkthrough,
} from "./logic";
import { fixtureScenario, powerWalkthrough, scenarioWithoutGuide } from "./testFixtures";

function bareStep(overrides: Partial<GuidedStep>): GuidedStep {
  return {
    id: "bare",
    title: "Inspect",
    explanation: "Inspect the part.",
    why: "Because it matters.",
    expectedObservation: "Look for whether it is seated.",
    target: { componentId: "wall", label: "Wall outlet" },
    ...overrides,
  };
}

describe("guided walkthrough schema", () => {
  it("round-trips through scenarioSchema as an optional field", () => {
    const withGuide = fixtureScenario("pc-no-power", powerWalkthrough);
    expect(withGuide.guidedWalkthrough?.steps.map((s) => s.id)).toEqual([
      "guide-wall",
      "guide-cable",
      "guide-front",
      "guide-press",
    ]);

    const base = getScenario("pc-on-no-display");
    expect(base).toBeDefined();
    expect(
      scenarioSchema.parse({ ...base!, guidedWalkthrough: undefined }).guidedWalkthrough,
    ).toBeUndefined();
  });

  it("rejects a cue outside the authored vocabulary", () => {
    expect(GUIDE_CUES).toEqual(["OBSERVE", "INSPECT", "CLICK", "TOGGLE", "CONNECT", "TYPE", "VERIFY"]);
    expect(() =>
      guidedWalkthroughSchema.parse({
        intro: "Walkthrough.",
        steps: [bareStep({ cue: "PROBE" as never, actionId: "check-wall" })],
      }),
    ).toThrow();
  });

  it("rejects a step with no completion trigger", () => {
    expect(() =>
      guidedWalkthroughSchema.parse({
        intro: "Walkthrough.",
        steps: [bareStep({ actionId: undefined, commandId: undefined, completeWhen: undefined })],
      }),
    ).toThrow();
  });

  it("rejects an empty step list", () => {
    expect(() => guidedWalkthroughSchema.parse({ intro: "Walkthrough.", steps: [] })).toThrow();
  });
});

describe("validateGuidedWalkthrough content checks", () => {
  it("accepts a well-formed walkthrough", () => {
    expect(validateGuidedWalkthrough(fixtureScenario("pc-no-power", powerWalkthrough))).toEqual([]);
  });

  it("returns no errors for scenarios without a walkthrough", () => {
    const base = scenarioWithoutGuide("printer-low-toner");
    expect(validateGuidedWalkthrough(base)).toEqual([]);
  });

  it("flags duplicate step ids", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({ id: "dup", actionId: "check-wall" }),
        bareStep({ id: "dup", actionId: "check-cable" }),
      ],
    };
    const errors = validateGuidedWalkthrough(fixtureScenario("pc-no-power", walkthrough));
    expect(errors.join("\n")).toContain("duplicate step id");
  });

  it("flags a step without a completion trigger", () => {
    const base = getScenario("pc-no-power")!;
    const walkthrough = {
      intro: "Walkthrough.",
      steps: [bareStep({ actionId: undefined, commandId: undefined, completeWhen: undefined })],
    } satisfies GuidedWalkthrough;
    const errors = validateGuidedWalkthrough({ ...base, guidedWalkthrough: walkthrough });
    expect(errors.join("\n")).toContain("missing completion trigger");
  });

  it("flags an actionId that is not one of the scenario's actions", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [bareStep({ actionId: "no-such-action" })],
    };
    const errors = validateGuidedWalkthrough(fixtureScenario("pc-no-power", walkthrough));
    expect(errors.join("\n")).toContain('unknown actionId "no-such-action"');
  });

  it("flags a target component that is not visible in the scenario", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [bareStep({ actionId: "check-wall", target: { componentId: "ram", label: "RAM" } })],
    };
    const errors = validateGuidedWalkthrough(fixtureScenario("pc-no-power", walkthrough));
    expect(errors.join("\n")).toContain('target.componentId "ram" is not visible');
  });

  it("flags an unknown camera preset", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({
          actionId: "check-wall",
          target: { componentId: "wall", label: "Wall", cameraPreset: "no-such-preset" },
        }),
      ],
    };
    const errors = validateGuidedWalkthrough(fixtureScenario("pc-no-power", walkthrough));
    expect(errors.join("\n")).toContain('unknown cameraPreset "no-such-preset"');
  });

  it("flags an unknown KB concept and accepts a real one", () => {
    const bad: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [bareStep({ actionId: "check-wall", conceptId: "no-such-article" })],
    };
    expect(
      validateGuidedWalkthrough(fixtureScenario("pc-no-power", bad)).join("\n"),
    ).toContain('unknown conceptId "no-such-article"');

    const good: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [bareStep({ actionId: "check-wall", conceptId: "troubleshooting-method" })],
    };
    expect(validateGuidedWalkthrough(fixtureScenario("pc-no-power", good))).toEqual([]);
  });

  it("every registered scenario passes walkthrough validation", () => {
    for (const scenario of getScenarios()) {
      expect(validateGuidedWalkthrough(scenario), scenario.id).toEqual([]);
    }
  });
});

describe("guide progress is derived from the simulation", () => {
  it("starts at the first step for a fresh run", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const run = createRun(scenario, "guided");
    const progress = guideProgress(scenario, run);
    expect(progress.hasGuide).toBe(true);
    expect(progress.status).toBe("active");
    expect(progress.index).toBe(0);
    expect(progress.step?.id).toBe("guide-wall");
    expect(progress.total).toBe(4);
  });

  it("does not advance when an action outside the current step is applied", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-cable");
    expect(run.appliedActions).toContain("check-cable");
    const progress = guideProgress(scenario, run);
    expect(progress.index).toBe(0);
    expect(progress.step?.id).toBe("guide-wall");
  });

  it("advances only as the underlying simulation completes each step", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "check-wall");
    expect(guideProgress(scenario, run).step?.id).toBe("guide-cable");

    run = applyAction(scenario, run, "check-cable");
    expect(guideProgress(scenario, run).step?.id).toBe("guide-front");

    run = applyAction(scenario, run, "check-front-panel");
    expect(guideProgress(scenario, run).step?.id).toBe("guide-press");

    run = applyAction(scenario, run, "press-power");
    const final = guideProgress(scenario, run);
    expect(final.status).toBe("complete");
    expect(final.index).toBe(final.total);
    expect(final.step).toBeNull();
  });

  it("treats actionId and completeWhen together as AND", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({
          id: "both",
          actionId: "check-wall",
          completeWhen: { type: "stateEquals", path: "bench.frontPanelConnector", value: true },
        }),
      ],
    };
    const scenario = fixtureScenario("pc-no-power", walkthrough);
    let run = createRun(scenario, "guided");

    expect(isStepComplete(walkthrough.steps[0]!, run)).toBe(false);
    run = applyAction(scenario, run, "check-wall");
    expect(isStepComplete(walkthrough.steps[0]!, run)).toBe(false);
    run = applyAction(scenario, run, "check-front-panel");
    expect(isStepComplete(walkthrough.steps[0]!, run)).toBe(true);
  });

  it("completes a command-anchored step when the engine records the command", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({
          id: "probe-gateway",
          target: { componentId: "network-topology", label: "Network map" },
          commandId: "ping-ok",
        }),
      ],
    };
    const scenario = fixtureScenario("dns-some-sites-broken", walkthrough);
    let run = createRun(scenario, "guided");
    expect(guideProgress(scenario, run).status).toBe("active");

    run = recordCommand(scenario, run, "ping-ok", "ping gateway");
    expect(guideProgress(scenario, run).status).toBe("complete");
  });

  it("is hidden for scenarios without a walkthrough", () => {
    const scenario = scenarioWithoutGuide("printer-low-toner");
    const run = createRun(scenario, "guided");
    const progress = guideProgress(scenario, run);
    expect(progress).toEqual({ hasGuide: false, status: "hidden", index: 0, step: null, total: 0 });
  });

  it("is pure: reading progress never mutates the run and recomputes identically", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-wall");

    const snapshot = JSON.stringify(run);
    const first = guideProgress(scenario, run);
    const second = guideProgress(scenario, run);
    expect(JSON.stringify(run)).toBe(snapshot);
    expect(second).toEqual(first);
    expect(first.step?.id).toBe("guide-cable");
  });
});

describe("guideStepCue derives the interaction kind from completion data", () => {
  it("maps action.kind to INSPECT / CLICK for the flagship walkthrough", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const [wall, cable, , press] = scenario.guidedWalkthrough!.steps;
    expect(guideStepCue(wall!, scenario)).toBe("INSPECT"); // check-wall: inspect
    expect(guideStepCue(cable!, scenario)).toBe("INSPECT"); // check-cable: inspect
    expect(guideStepCue(press!, scenario)).toBe("CLICK"); // press-power: ui
  });

  it("inherits the kind of the action that flips a completeWhen path", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const front = scenario.guidedWalkthrough!.steps[2]!;
    expect(front.actionId).toBeUndefined(); // completion is world-state only
    expect(guideStepCue(front, scenario)).toBe("INSPECT"); // check-front-panel patches it
  });

  it("returns TYPE for command steps", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({
          id: "probe-gateway",
          target: { componentId: "network-topology", label: "Network map" },
          commandId: "ping-ok",
        }),
      ],
    };
    const scenario = fixtureScenario("dns-some-sites-broken", walkthrough);
    expect(guideStepCue(walkthrough.steps[0]!, scenario)).toBe("TYPE");
  });

  it("returns OBSERVE when no action or command can satisfy the step", () => {
    const walkthrough: GuidedWalkthrough = {
      intro: "Walkthrough.",
      steps: [
        bareStep({
          id: "read-quietly",
          actionId: undefined,
          commandId: undefined,
          completeWhen: { type: "stateEquals", path: "bench.nothingPatchesThis", value: true },
        }),
      ],
    };
    const scenario = fixtureScenario("pc-no-power", walkthrough);
    expect(guideStepCue(walkthrough.steps[0]!, scenario)).toBe("OBSERVE");
  });
});

describe("an authored cue overrides inference (content is the source of truth)", () => {
  it("uses the step's own cue when present, inference only fills the gap", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const [wall] = scenario.guidedWalkthrough!.steps;
    // check-wall would infer INSPECT anyway; force TOGGLE to prove precedence.
    const authored = bareStep({ actionId: "check-wall", cue: "TOGGLE" });
    expect(guideStepCue(authored, scenario)).toBe("TOGGLE");
    expect(guideStepCue(wall!, scenario)).toBe("INSPECT");
  });

  it("flags every pc-no-power step with its authored cue", () => {
    const scenario = getScenario("pc-no-power")!;
    const cues = scenario.guidedWalkthrough!.steps.map((s) => guideStepCue(s, scenario));
    expect(cues).toEqual(["INSPECT", "INSPECT", "INSPECT", "CLICK"]);
  });

  it("resolves a cue for every step of every registered scenario", () => {
    for (const scenario of getScenarios()) {
      for (const step of scenario.guidedWalkthrough?.steps ?? []) {
        expect(GUIDE_CUES, `${scenario.id} / ${step.id}`).toContain(
          guideStepCue(step, scenario),
        );
        expect(step.target.label.trim().length, `${scenario.id} / ${step.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("guideStepDoneWhen never leaves a step's completion ambiguous", () => {
  it("uses the authored doneWhen when the author wrote one", () => {
    const scenario = getScenario("pc-no-power")!;
    const [wall] = scenario.guidedWalkthrough!.steps;
    expect(wall!.doneWhen).toBe(
      "You applied \u201cCheck wall outlet / power strip\u201d and the strip reads live.",
    );
    expect(guideStepDoneWhen(wall!, scenario)).toBe(wall!.doneWhen!);
  });

  it("derives from the triggering action when doneWhen is absent", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const cable = scenario.guidedWalkthrough!.steps[1]!;
    expect(cable.doneWhen).toBeUndefined();
    expect(guideStepDoneWhen(cable, scenario)).toBe(
      'The action "Reseat PSU power cable" has been applied.',
    );
  });

  it("derives from the triggering command and from world state", () => {
    const commandStep = bareStep({ commandId: "ping-ok", target: { componentId: "network-topology", label: "Network map" } });
    const dns = fixtureScenario("dns-some-sites-broken", {
      intro: "Walkthrough.",
      steps: [commandStep],
    });
    expect(guideStepDoneWhen(commandStep, dns)).toBe(
      "This step's command has run in the terminal.",
    );

    const stateStep = bareStep({
      actionId: undefined,
      commandId: undefined,
      completeWhen: { type: "stateEquals", path: "psuToggle", value: false },
    });
    const pc = fixtureScenario("pc-no-power", { intro: "Walkthrough.", steps: [stateStep] });
    expect(guideStepDoneWhen(stateStep, pc)).toBe("The simulation reads psuToggle = false.");
  });

  it("renders a doneWhen for every step of every registered scenario", () => {
    for (const scenario of getScenarios()) {
      for (const step of scenario.guidedWalkthrough?.steps ?? []) {
        const text = guideStepDoneWhen(step, scenario);
        expect(text.trim().length, `${scenario.id} / ${step.id}`).toBeGreaterThan(0);
      }
    }
  });
});
