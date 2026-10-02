/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScenarioPage } from "./ScenarioPage";

const css = readFileSync("src/index.css", "utf8");

function renderEntry(id: string) {
  render(
    <MemoryRouter initialEntries={[`/lab/${id}`]}>
      <Routes>
        <Route path="/lab/:scenarioId" element={<ScenarioPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("scenario entry — compact case brief", () => {
  it("renders the full briefing hierarchy in one sheet", () => {
    renderEntry("pc-no-power");

    // Identity → title → symptom → objectives → meta → modes → action.
    expect(document.querySelector(".case-sheet")).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Desktop PC does not power on" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/press the power button/i)).toBeInTheDocument();
    expect(document.querySelectorAll(".case-objectives li").length).toBeGreaterThan(0);
    expect(screen.getByText("Difficulty")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter the workstation/i })).toBeInTheDocument();
  });

  it("drops redundant chrome: no Mode heading, no duplicated summary note", () => {
    renderEntry("pc-no-power");

    expect(screen.queryByRole("heading", { name: "Mode" })).toBeNull();
    expect(document.querySelector(".case-note")).toBeNull();
    // Mode group keeps its accessible name without a visual heading.
    expect(screen.getByRole("group", { name: "Mode" }).childElementCount).toBe(3);
  });

  it("composes tightly: wider sheet, short gaps, actions directly under the modes", () => {
    expect(css).toMatch(/\.case-sheet \{[^}]*max-width:\s*64rem/);
    expect(css).toMatch(/\.case-sheet \{[^}]*gap:\s*1rem/);
    expect(css).toMatch(/\.case-col \{[^}]*gap:\s*1rem/);
    expect(css).toMatch(/\.case-mode \{[^}]*min-height:\s*44px/);
    // Entry actions lost the old margin-top: auto whitespace pump (now home-band only).
    const unscopedActions = css.match(/^ {2}\.case-actions \{[^}]*\}/m);
    expect(unscopedActions).not.toBeNull();
    expect(unscopedActions![0]).not.toContain("margin-top: auto");
    expect(css).toContain(".case-band .case-actions");
    // Compact metadata matrix.
    expect(css).toMatch(/\.case-fields \{[^}]*minmax\(8\.5rem, 1fr\)/);
    expect(css).toMatch(/\.case-sheet \.sec-head \{[^}]*margin-bottom:\s*0\.5rem/);
  });

  it("keeps the responsive briefing: single column, two columns from 900px", () => {
    expect(css).toMatch(/\.case-cols \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(css).toMatch(
      /@media \(min-width: 900px\) \{\s*\.case-cols \{[^}]*1\.05fr\) minmax\(0, 0\.95fr\)/,
    );
  });
});
