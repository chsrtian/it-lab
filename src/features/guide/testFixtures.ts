import { getScenario } from "@/content";
import { scenarioSchema, type GuidedWalkthrough, type Scenario } from "@/content/schema";

export const powerWalkthrough: GuidedWalkthrough = {
  intro: "We will follow the power path together, from the wall to the button.",
  steps: [
    {
      id: "guide-wall",
      title: "Check the wall outlet and power strip",
      explanation: "Look at the outlet and the strip that feed the computer.",
      why: "We start at the source because a machine that looks dead may simply not be receiving power yet.",
      expectedObservation: "Look for whether power is available at the outlet.",
      target: { componentId: "wall", label: "Wall outlet and power strip" },
      actionId: "check-wall",
      fallback: "the power strip along the edge of the bench",
    },
    {
      id: "guide-cable",
      title: "Reseat the PSU power cable",
      explanation: "Check that the power cable sits firmly in the power supply and at the strip end.",
      why: "The cable carries power from the strip into the power supply unit (PSU), the box that converts wall power for the computer's parts.",
      expectedObservation: "Look for whether the cable is fully seated at both ends.",
      target: {
        componentId: "power-supply",
        label: "PSU AC power cable",
        cameraPreset: "power-supply",
      },
      actionId: "check-cable",
      conceptId: "troubleshooting-method",
    },
    {
      id: "guide-front",
      title: "Inspect the front-panel power header",
      explanation: "Find where the case power button connects to the motherboard.",
      why: "The power button only works if its small header cable is seated on the motherboard pins.",
      expectedObservation: "Look for whether the header is fully seated.",
      target: {
        componentId: "front-panel",
        label: "Front-panel power switch header",
        cameraPreset: "front-panel",
      },
      completeWhen: { type: "stateEquals", path: "bench.frontPanelConnector", value: true },
    },
    {
      id: "guide-press",
      title: "Press the power button",
      explanation: "Now try starting the machine.",
      why: "With the power path confirmed, this attempt verifies the whole chain end to end.",
      expectedObservation: "Look for whether fans spin and indicator lights come on.",
      target: { componentId: "front-panel", label: "Case power button" },
      actionId: "press-power",
    },
  ],
};

export function fixtureScenario(id: string, walkthrough: GuidedWalkthrough): Scenario {
  const base = getScenario(id);
  if (!base) throw new Error(`missing scenario ${id}`);
  return scenarioSchema.parse({ ...base, guidedWalkthrough: walkthrough });
}

/** A real catalog scenario with its guided walkthrough stripped — exercises the no-guide path. */
export function scenarioWithoutGuide(id: string): Scenario {
  const base = getScenario(id);
  if (!base) throw new Error(`missing scenario ${id}`);
  return scenarioSchema.parse({ ...base, guidedWalkthrough: undefined });
}
