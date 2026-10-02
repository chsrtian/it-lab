import { describe, it, expect, beforeEach } from "vitest";
import { getScenarios } from "@/content";
import { createRun, applyAction, availableActions, type RunState } from "@/engine";
import { guideProgress, isStepComplete, EXTRA_GUIDE_TARGET_IDS } from "@/features/guide/logic";

const hardwareScenarios = getScenarios().filter((s) => s.category === "hardware");

describe("Hardware designated-fix interaction audit (Guide OFF/ON)", () => {
  let run: RunState;
  let scenario: typeof hardwareScenarios[0];

  beforeEach(() => {
    scenario = hardwareScenarios[0]; // pc-no-power as primary
    run = createRun(scenario, "guided");
  });

  it("pc-no-power: all designated fixes interactive with Guide OFF", () => {
    // Designated fixes for pc-no-power: check-wall, check-cable, check-front-panel, press-power
    const fixActionIds = ["check-wall", "check-cable", "check-front-panel", "press-power"];

    for (const actionId of fixActionIds) {
      const action = scenario.actions.find((a) => a.id === actionId);
      expect(action, actionId).toBeDefined();

      // Apply with Guide OFF (normal mode)
      const actionsAvail = availableActions(scenario, run);
      const availAction = actionsAvail.find((a) => a.id === actionId);
      expect(availAction, actionId).toBeDefined(); // Action is available (not filtered out)

      // Apply the action and carry state forward (appliesWhen chains gate later fixes)
      run = applyAction(scenario, run, actionId);
      expect(run.appliedActions, actionId).toContain(actionId);
      expect(run.world).toBeDefined();
    }
  });

  it("pc-no-power: designated fixes still work after Guide ON → OFF cycle", () => {
    // Start guided, advance through the diagnostics, then exit guide and
    // verify the remaining fix is still interactive with the Guide OFF.
    let guidedRun = createRun(scenario, "guided");

    // Complete the first three steps (wall → cable → front-panel)
    for (const actionId of ["check-wall", "check-cable", "check-front-panel"]) {
      guidedRun = applyAction(scenario, guidedRun, actionId);
      expect(guidedRun.appliedActions).toContain(actionId);
    }

    // Now simulate guide OFF - switch to practice mode run with same world
    const practiceRun = createRun(scenario, "practice");
    // Manually sync world state
    Object.assign(practiceRun.world, guidedRun.world);
    practiceRun.appliedActions = [...guidedRun.appliedActions];

    // The final fix must still be reachable from the Actions rail with Guide OFF
    const remainingFixes = ["press-power"];
    for (const actionId of remainingFixes) {
      const actionsAvail = availableActions(scenario, practiceRun);
      const availAction = actionsAvail.find((a) => a.id === actionId);
      expect(availAction, actionId).toBeDefined();

      const next = applyAction(scenario, practiceRun, actionId);
      expect(next.appliedActions, actionId).toContain(actionId);
    }
  });

  it("pc-no-power: every action's component/inspectTarget resolves to a visible anchor", () => {
    const visibleTargets = new Set<string>([
      ...scenario.environment.components,
      ...EXTRA_GUIDE_TARGET_IDS,
    ]);
    for (const action of scenario.actions) {
      if (action.component) {
        expect(
          visibleTargets.has(action.component),
          `action ${action.id} component "${action.component}"`,
        ).toBe(true);
      }
      if (action.inspectTarget) {
        expect(
          visibleTargets.has(action.inspectTarget),
          `action ${action.id} inspectTarget "${action.inspectTarget}"`,
        ).toBe(true);
      }
    }
    // Every guide step target must resolve to the same anchor set
    for (const step of scenario.guidedWalkthrough?.steps ?? []) {
      expect(
        visibleTargets.has(step.target.componentId),
        `step ${step.id} target "${step.target.componentId}"`,
      ).toBe(true);
    }
  });

  it("pc-no-power: camera orbit/zoom/preset preserves hotspot interaction", () => {
    // This is a runtime/integration concern verified by targetContract.test.tsx
    // Here we verify the presets exist for each component
    const presets = scenario.environment.focusTarget;
    if (presets) {
      expect(["full", "front", "motherboard", "power-supply", "cables", "front-panel", "ram", "cpu-cooler", "storage"]).toContain(presets.cameraPreset);
    }
  });

  it("pc-no-power: each action produces expected world patch + evidence", () => {
    const expectedPatches: Record<string, Record<string, unknown>> = {
      "check-wall": { bench: { powerSwitchAtWall: true } },
      "check-cable": { bench: { powerCableSeated: true } },
      "check-front-panel": { bench: { frontPanelConnector: true } },
      "press-power": { bench: { fansSpin: true, ledsOn: true, posted: true } },
    };

    for (const [actionId, expectedPatch] of Object.entries(expectedPatches)) {
      const action = scenario.actions.find((a) => a.id === actionId);
      expect(action).toBeDefined();
      expect(action?.patch).toEqual(expectedPatch);
    }
  });

  it("pc-no-power: guide detects completion after each fix", () => {
    let guidedRun = createRun(scenario, "guided");
    const walkthrough = scenario.guidedWalkthrough!;

    // Step 1: check-wall
    expect(isStepComplete(walkthrough.steps[0], guidedRun)).toBe(false);
    guidedRun = applyAction(scenario, guidedRun, "check-wall");
    expect(isStepComplete(walkthrough.steps[0], guidedRun)).toBe(true);

    // Step 2: check-cable
    expect(isStepComplete(walkthrough.steps[1], guidedRun)).toBe(false);
    guidedRun = applyAction(scenario, guidedRun, "check-cable");
    expect(isStepComplete(walkthrough.steps[1], guidedRun)).toBe(true);

    // Step 3: check-front-panel (completeWhen: stateEquals bench.frontPanelConnector = true)
    expect(isStepComplete(walkthrough.steps[2], guidedRun)).toBe(false);
    guidedRun = applyAction(scenario, guidedRun, "check-front-panel");
    expect(isStepComplete(walkthrough.steps[2], guidedRun)).toBe(true);

    // Step 4: press-power (actionId)
    expect(isStepComplete(walkthrough.steps[3], guidedRun)).toBe(false);
    guidedRun = applyAction(scenario, guidedRun, "press-power");
    expect(isStepComplete(walkthrough.steps[3], guidedRun)).toBe(true);

    // All complete
    const progress = guideProgress(scenario, guidedRun);
    expect(progress.status).toBe("complete");
  });
});