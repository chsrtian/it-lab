import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getScenario } from "@/content";
import { resolveGuideInteraction } from "@/features/guide/logic";
import { ScenarioPage } from "./ScenarioPage";

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

describe("action review", () => {
  it("surfaces after applying an action and dismisses in place, keeping stage and guide", async () => {
    renderScenarioPage("pc-no-power");

    const scenario = getScenario("pc-no-power")!;
    const step1 = scenario.guidedWalkthrough!.steps[0]!;
    const actionId = step1.actionId ?? "check-front-panel";
    const action = scenario.actions.find((candidate) => candidate.id === actionId)!;
    expect(action, actionId).toBeDefined();

    expect(document.querySelector(".sim-feedback")).toBeNull();

    const contract = resolveGuideInteraction(step1, scenario);
    const hotspot = document.querySelector(
      `[data-hotspot-id="${contract.componentId}"]`,
    ) as HTMLElement | null;
    expect(hotspot, `hotspot for ${contract.componentId}`).not.toBeNull();
    fireEvent.click(hotspot!);

    const feedback = await screen.findByLabelText("Action review");
    expect(feedback).toHaveClass("sim-feedback");
    expect(feedback).toHaveAttribute("role", "status");
    expect((feedback.textContent ?? "").trim().length).toBeGreaterThan(0);

    const main = document.querySelector(".sim-main");
    expect(main).not.toBeNull();
    expect(feedback.parentElement).toBe(main);
    expect(feedback.closest(".sim-stage")).toBeNull();
    expect(feedback.closest("aside.sim-tool")).toBeNull();

    expect(document.querySelector(".sim-stage")).not.toBeNull();
    expect(document.querySelector(".guide-card")).not.toBeNull();

    fireEvent.click(
      within(feedback).getByRole("button", { name: "Dismiss action review" }),
    );
    await waitFor(() => expect(screen.queryByLabelText("Action review")).toBeNull());
    expect(document.querySelector(".sim-main")).not.toBeNull();
    expect(document.querySelector(".sim-stage")).not.toBeNull();
    expect(document.querySelector(".guide-card")).not.toBeNull();
    expect(within(screen.getByTestId("guide-overlay")).getByTestId("guide-count")).toHaveTextContent(
      "Step 2 of 4",
    );
  });

  it("css places the review in the grid instead of floating over the workspace", () => {
    const css = readFileSync("src/index.css", "utf8");

    const rules = [...css.matchAll(/\.sim-feedback\s*\{[^}]*\}/g)].map((match) => match[0]);
    expect(rules.length).toBeGreaterThanOrEqual(2);
    const positioned = rules.filter((rule) => /position:/.test(rule));
    expect(positioned).toHaveLength(1);
    expect(positioned[0]).toMatch(/position:\s*relative/);

    const placement = [
      ...css.matchAll(/\.sim-main--tool\s*>\s*\.sim-feedback\s*\{[^}]*\}/g),
    ].map((match) => match[0]);
    expect(placement).toHaveLength(1);
    expect(placement[0]).toMatch(/grid-column:\s*1/);
    expect(placement[0]).toMatch(/grid-row:\s*2/);

    const stageRules = [
      ...css.matchAll(/\.sim-main--tool\s*>\s*\.sim-stage\s*\{[^}]*\}/g),
    ].map((match) => match[0]);
    expect(stageRules.some((rule) => /grid-column:\s*1/.test(rule))).toBe(true);

    const railRules = [
      ...css.matchAll(/\.sim-main--tool\s*>\s*\.sim-tool\s*\{[^}]*\}/g),
    ].map((match) => match[0]);
    expect(railRules.some((rule) => /grid-column:\s*2/.test(rule))).toBe(true);

    const toolBlocks = [...css.matchAll(/\.sim-main--tool\s*\{[^}]*\}/g)].map(
      (match) => match[0],
    );
    expect(
      toolBlocks.some((rule) =>
        /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*auto/.test(rule),
      ),
    ).toBe(true);
  });
});
