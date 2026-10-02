/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getScenario, getScenarios } from "@/content";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { resolveGuideInteraction, EXTRA_GUIDE_TARGET_IDS } from "./logic";

function renderScenarioPage(id: string) {
  render(
    <MemoryRouter initialEntries={[`/lab/${id}`]}>
      <Routes>
        <Route path="/lab/:scenarioId" element={<ScenarioPage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /guided/i }));
  fireEvent.click(screen.getByRole("button", { name: /enter the workstation/i }));
}

/**
 * Target <-> text invariant: every guided step's semantic target id must
 * resolve to the object the step text describes.
 *
 * - Content level: ids come from the scenario's own visible component
 *   vocabulary (or the documented extra anchors).
 * - Live level: pc-no-power step 1 must ring the wall-outlet hotspot whose
 *   accessible label IS the step's target text.
 * - 3D level: the scene emits a projected anchor for the same id, wired to
 *   the guide target thread.
 */
describe("guide target <-> step text contract", () => {
  it("every guided target id is in the scenario's renderable vocabulary", () => {
    for (const scenario of getScenarios()) {
      const steps = scenario.guidedWalkthrough?.steps ?? [];
      const visible = new Set<string>([
        ...scenario.environment.components,
        ...EXTRA_GUIDE_TARGET_IDS,
      ]);
      for (const step of steps) {
        expect(
          visible.has(step.target.componentId),
          `${scenario.id} / ${step.id} -> ${step.target.componentId}`,
        ).toBe(true);
      }
    }
  });

  it("pc-no-power step 1 rings the wall outlet object the text names (live)", async () => {
    renderScenarioPage("pc-no-power");

    const scenario = getScenario("pc-no-power")!;
    const step1 = scenario.guidedWalkthrough!.steps[0]!;
    expect(step1.target.componentId).toBe("wall");

    // Card text, ring target and the rendered object label agree.
    expect(screen.getByTestId("guide-target")).toHaveTextContent("Wall outlet and power strip");
    const ring = await screen.findByTestId("guide-ring");
    expect(ring).toHaveAttribute("data-guide-target-id", "wall");
    expect(ring).toHaveAttribute("data-guide-anchor-mode", "dom");

    const hotspot = document.querySelector('[data-hotspot-id="wall"]');
    expect(hotspot).not.toBeNull();
    expect(hotspot!.getAttribute("aria-label")).toBe(step1.target.label);
    await waitFor(() => expect(ring.style.left).not.toBe(""));
  });

  it("the 3D scene emits a projected anchor for the same id", () => {
    const parts = readFileSync("src/features/environments/hardware3d/parts.tsx", "utf8");
    const strip = parts.slice(
      parts.indexOf("export function PowerStrip"),
      parts.indexOf("export function Storage"),
    );
    expect(strip).toContain('<Interactive id="wall">');

    // Marker thread: the scene renders a drei <Html> anchor for the active
    // guide target, and projects it every rendered frame.
    expect(parts).toContain("it.guideTargetId === id");
    expect(parts).toContain("data-guide-anchor-3d={id}");

    const view = readFileSync("src/features/environments/HardwareLabView.tsx", "utf8");
    expect(view).toContain("data-guide-3d-target={guideComponentId ?? undefined}");
    expect(view).toContain("guideTargetId={guideComponentId ?? null}");

    const scene = readFileSync(
      "src/features/environments/hardware3d/HardwareScene.tsx",
      "utf8",
    );
    expect(scene).toContain('frameloop="demand"');
    expect(scene).toContain("guideTargetId");
  });

  it("all four pc-no-power steps: card text, ring, hotspot name and inspector name agree — and the guided action completes the walkthrough", async () => {
    renderScenarioPage("pc-no-power");

    const scenario = getScenario("pc-no-power")!;
    const steps = scenario.guidedWalkthrough!.steps;
    expect(steps).toHaveLength(4);

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]!;
      const contract = resolveGuideInteraction(step, scenario);
      const componentId = contract.componentId;

      // The card's target line is the step's own label, with its cue.
      expect(screen.getByTestId("guide-target")).toHaveTextContent(contract.label);
      expect(screen.getByTestId("guide-cue-card")).toHaveTextContent(step.cue ?? "");
      expect(screen.getByTestId("guide-count")).toHaveTextContent(`Step ${i + 1} of 4`);

      // One commit: the ring lands on exactly that component.
      const ring = await screen.findByTestId("guide-ring");
      expect(ring.getAttribute("data-guide-target-id")).toBe(contract.surfaceId);

      // The hotspot the ring points at carries the step label as its
      // accessible name. Guided completion comes from clicking that lab object.
      const hotspot = document.querySelector(`[data-hotspot-id="${componentId}"]`);
      expect(hotspot, `${step.id}: hotspot for ${componentId}`).not.toBeNull();
      expect(hotspot!.getAttribute("aria-label")).toBe(step.target.label);

      fireEvent.click(hotspot!);
      if (i < steps.length - 1) {
        await waitFor(() =>
          expect(screen.getByTestId("guide-count")).toHaveTextContent(
            `Step ${i + 2} of 4`,
          ),
        );
      }
    }

    expect(screen.getByRole("heading", { level: 2, name: "Walkthrough complete" })).toBeInTheDocument();
    const guide = screen.getByTestId("guide-overlay");
    expect(within(guide).getByRole("status")).toHaveTextContent(/all 4 steps done/i);
  });
});
