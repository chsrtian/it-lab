import { describe, it, expect } from "vitest";
import { getScenarios } from "@/content";
import { guideStepCue, GUIDE_CUES, validateCueAffordance } from "@/features/guide/logic";

const allScenarios = getScenarios();

describe("cue ↔ interaction affordance validation", () => {
  it("every guided step across all scenarios has a valid cue-affordance match", () => {
    const allErrors: string[] = [];
    let totalSteps = 0;
    let stepsWithGuide = 0;

    for (const scenario of allScenarios) {
      const walkthrough = scenario.guidedWalkthrough;
      if (!walkthrough) continue;
      stepsWithGuide++;
      walkthrough.steps.forEach((step) => {
        totalSteps++;
        const errors = validateCueAffordance(step, scenario);
        if (errors.length > 0) {
          allErrors.push(...errors.map((e) => `[${scenario.id}] ${e}`));
        }
      });
    }

    expect(
      allErrors,
      `Validated ${totalSteps} guided steps across ${stepsWithGuide} scenarios`,
    ).toEqual([]);
  });

  it("GUIDE_CUES enum matches authored cue values in schema", () => {
    expect(GUIDE_CUES).toEqual([
      "OBSERVE",
      "INSPECT",
      "CLICK",
      "TOGGLE",
      "CONNECT",
      "TYPE",
      "VERIFY",
    ]);
  });

  it("guideStepCue never returns a cue not in GUIDE_CUES", () => {
    for (const scenario of allScenarios) {
      const walkthrough = scenario.guidedWalkthrough;
      if (!walkthrough) continue;
      for (const step of walkthrough.steps) {
        const cue = guideStepCue(step, scenario);
        expect(GUIDE_CUES).toContain(cue);
      }
    }
  });
});
