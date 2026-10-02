import { describe, it, expect } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScenarioPage } from "./ScenarioPage";
import { getScenarios } from "@/content";
import { createRun, applyAction } from "@/engine";
import { componentActions } from "@/features/environments/interaction";
import { InspectDock } from "@/features/env";
import { resolveGuideInteraction, isStepComplete } from "@/features/guide/logic";

function enter(mode = "Guided") {
  render(<MemoryRouter initialEntries={["/lab/pc-no-power"]}><Routes>
    <Route path="/lab/:scenarioId" element={<ScenarioPage />} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${mode}`) }));
  fireEvent.click(screen.getByRole("button", { name: "Enter the workstation" }));
}

function clickHotspot(componentId: string) {
  const hotspot = document.querySelector<HTMLElement>(`[data-hotspot-id="${componentId}"]`);
  expect(hotspot, `hotspot ${componentId}`).not.toBeNull();
  fireEvent.click(hotspot!);
}

function applyFromInspector(componentId: string, label: string) {
  clickHotspot(componentId);
  const inspector = screen.getByTestId("context-inspector");
  fireEvent.click(within(inspector).getByRole("button", { name: label }));
}

describe("rendered interaction contract", () => {
  it.each(["Guide ON", "Practice", "Guided OFF", "Guided OFF → ON"])("completes the physical power path with %s", (variant) => {
    enter(variant === "Practice" ? "Practice" : "Guided");
    expect(screen.queryByRole("region", { name: "Troubleshooting controls" })).not.toBeInTheDocument();
    if (variant === "Guide ON") expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 1");
    if (variant === "Guided OFF" || variant === "Guided OFF → ON") {
      fireEvent.click(screen.getByTestId("guide-toggle"));
      expect(screen.queryByTestId("guide-overlay")).not.toBeInTheDocument();
    }
    const steps = [
      ["wall", "Check wall outlet / power strip"],
      ["power-supply", "Reseat PSU power cable"],
      ["front-panel", "Inspect front-panel power switch header"],
      ["front-panel", "Press power button"],
    ] as const;
    steps.forEach(([componentId, label], index) => {
      if (index === 2 && variant === "Guided OFF → ON") {
        fireEvent.click(screen.getByTestId("guide-toggle"));
      }
      const guided = screen.queryByTestId("guide-overlay") !== null;
      if (guided) clickHotspot(componentId);
      else applyFromInspector(componentId, label);
      if (index === 2) expect(screen.getByLabelText("Action review")).toHaveTextContent("Press power button");
    });
    expect(screen.getByRole("button", { name: "Verify" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByRole("heading", { name: "Debrief" })).toBeInTheDocument();
  });

  it("keeps Guide and target markers owned by Guided mode only", () => {
    enter("Guided");
    expect(screen.getByTestId("guide-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("guide-overlay")).toBeInTheDocument();
    cleanup();

    enter("Practice");
    expect(screen.queryByTestId("guide-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("guide-overlay")).not.toBeInTheDocument();
    expect(document.querySelector(".guide-ring")).toBeNull();
    cleanup();

    enter("Challenge");
    expect(screen.queryByTestId("guide-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("guide-overlay")).not.toBeInTheDocument();
    expect(document.querySelector(".guide-ring")).toBeNull();
  });

  it("keeps Customer and Guide mutually exclusive after guided entry", () => {
    enter();
    expect(screen.getByTestId("guide-overlay")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("toolbar", { name: "Lab tools" })).getByRole("button", { name: /^Customer/ }));
    expect(screen.queryByTestId("guide-overlay")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Customer conversation")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("guide-toggle"));
    expect(screen.getByTestId("guide-overlay")).toBeInTheDocument();
    expect(screen.queryByLabelText("Customer conversation")).not.toBeInTheDocument();
  });

  for (const scenario of getScenarios().filter(s => s.environment.kind === "hardware-bench" || s.environment.deviceFamily)) {
    it(`${scenario.id}: every component exposes every intended operation without instructor input`, () => {
      let run = createRun(scenario, "practice");
      for (const step of scenario.guidedWalkthrough?.steps ?? []) {
        const contract = resolveGuideInteraction(step, scenario);
        const action = contract.action!;
        const operations = componentActions(scenario, run, contract.componentId);
        expect(operations.some(operation => operation.id === action.id)).toBe(true);
        render(<InspectDock selected={{ id: contract.componentId, label: contract.componentId, actions: operations }}
          onAction={id => { run = applyAction(scenario, run, id); }} />);
        fireEvent.click(screen.getByRole("button", { name: action.label }));
        expect(isStepComplete(step, run)).toBe(true);
        cleanup();
      }
    });
  }
});
