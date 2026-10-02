import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ScenarioPage } from "./ScenarioPage";

function renderScenarioPage(id: string, mode: "Guided" | "Practice" | "Challenge" = "Practice") {
  render(
    <MemoryRouter initialEntries={[`/lab/${id}`]}>
      <Routes>
        <Route path="/lab/:scenarioId" element={<ScenarioPage />} />
      </Routes>
    </MemoryRouter>,
  );
  // Entry is a briefing sheet: pick the mode row, then enter the workstation.
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${mode}`, "i") }));
  fireEvent.click(screen.getByRole("button", { name: /enter the workstation/i }));
}

describe("workspace — reserved tool drawer", () => {
  it("opens the drawer as a grid sibling of the stage, never an overlay", () => {
    renderScenarioPage("linux-permission-denied");

    expect(document.querySelector(".sim-main")).not.toBeNull();
    expect(document.querySelector(".sim-main--tool")).toBeNull();

    const rail = screen.getByRole("toolbar", { name: "Lab tools" });
    fireEvent.click(within(rail).getByRole("button", { name: /^terminal/i }));

    const main = document.querySelector(".sim-main--tool");
    expect(main).not.toBeNull();

    // The stage stays mounted and shares the grid with the drawer —
    // opening a tool reserves space, it does not cover the simulation.
    const stage = main?.querySelector(".sim-stage");
    expect(stage).not.toBeNull();
    expect(stage?.parentElement).toBe(main);

    const drawer = main?.querySelector("aside.sim-tool");
    expect(drawer).not.toBeNull();
    expect(drawer?.parentElement).toBe(main);
    expect(drawer?.querySelector(".sim-tool-title")?.textContent).toBe("Terminal");
    expect(
      within(drawer as HTMLElement).getByRole("button", { name: "Close tool panel" }),
    ).toBeInTheDocument();

    // Closing returns the workspace to stage-only.
    fireEvent.click(screen.getByRole("button", { name: "Close tool panel" }));
    expect(document.querySelector("aside.sim-tool")).toBeNull();
    expect(document.querySelector(".sim-main--tool")).toBeNull();
    expect(document.querySelector(".sim-stage")).not.toBeNull();
  });

  it("keeps the header to CASE · MODE · GUIDE · VERIFY", () => {
    renderScenarioPage("linux-permission-denied", "Guided");

    const topbar = document.querySelector(".sim-topbar");
    expect(topbar).not.toBeNull();
    expect(document.querySelector(".sim-zone--guide")).not.toBeNull();

    const names = Array.from(topbar!.querySelectorAll("button")).map((b) =>
      (b.getAttribute("aria-label") ?? b.textContent ?? "").trim(),
    );
    expect(names.some((n) => n === "Tools")).toBe(false);
    expect(names.some((n) => /^verify/i.test(n))).toBe(true);
    // Secondary utilities left the header.
    expect(names.some((n) => /^hint/i.test(n))).toBe(false);
    expect(names.some((n) => /restart/i.test(n))).toBe(false);
    expect(topbar!.querySelector('[aria-label="Restart scenario"]')).toBeNull();
  });

  it("hosts Restart, Diagnostics and context drawers in the bottom tool rail", () => {
    renderScenarioPage("linux-permission-denied");

    const rail = screen.getByRole("toolbar", { name: "Lab tools" });
    expect(within(rail).getByRole("button", { name: "Restart scenario" })).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: /^terminal/i })).toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: /^actions/i })).toBeNull();
    expect(within(rail).getByRole("button", { name: /diagnostics/i })).toBeInTheDocument();

    // Hints lives in the rail and opens a drawer titled Hints (unlock lives there).
    fireEvent.click(within(rail).getByRole("button", { name: /^hints/i }));
    expect(document.querySelector(".sim-tool-title")?.textContent).toBe("Hints");
  });
});

describe("workspace — right utility rail", () => {
  it("hosts Guide and Customer exclusively: only one is expanded at a time", async () => {
    renderScenarioPage("pc-no-power", "Guided");

    let asides = document.querySelectorAll("aside.sim-tool");
    expect(document.querySelector(".sim-main--tool")).not.toBeNull();
    expect(asides).toHaveLength(1);
    expect(asides[0]).not.toHaveClass("has-guide");
    expect(asides[0]!.querySelector(".guide-card")).not.toBeNull();
    // The guide never lives inside the stage anymore.
    expect(document.querySelector(".sim-stage .guide-card")).toBeNull();

    // Customer takes over the rail; the guide closes.
    fireEvent.click(screen.getByRole("button", { name: /customer/i }));
    await waitFor(() =>
      expect(document.querySelector('[data-guide-anchor="customer-chat"]')).not.toBeNull(),
    );
    expect(document.querySelector(".guide-card")).toBeNull();
    expect(screen.getByTestId("guide-toggle")).toHaveAttribute("aria-pressed", "false");
    asides = document.querySelectorAll("aside.sim-tool");
    expect(asides).toHaveLength(1);
    expect(asides[0]).not.toHaveClass("has-guide");

    // Guide takes it back; Customer closes.
    fireEvent.click(screen.getByTestId("guide-toggle"));
    await waitFor(() => expect(document.querySelector(".guide-card")).not.toBeNull());
    expect(document.querySelector('[data-guide-anchor="customer-chat"]')).toBeNull();
    expect(document.querySelectorAll("aside.sim-tool")).toHaveLength(1);
    expect(document.querySelector(".sim-main--tool")).not.toBeNull();
  });

  it("lets a tool drawer take over the rail while guide progression remains enabled", async () => {
    renderScenarioPage("pc-no-power", "Guided");

    const rail = screen.getByRole("toolbar", { name: "Lab tools" });
    fireEvent.click(within(rail).getByRole("button", { name: /^hints/i }));
    const aside = document.querySelector("aside.sim-tool");
    expect(aside).not.toHaveClass("has-guide");
    expect(aside!.querySelector(".guide-card")).toBeNull();
    expect(aside!.querySelector(".sim-tool-title")?.textContent).toBe("Hints");
    expect(document.querySelectorAll("aside.sim-tool")).toHaveLength(1);
    expect(screen.getByTestId("guide-toggle")).toHaveAttribute("aria-pressed", "true");

    // Closing the drawer leaves the guide in the rail.
    fireEvent.click(screen.getByRole("button", { name: "Close tool panel" }));
    expect(document.querySelector(".sim-tool-title")).toBeNull();
    expect(document.querySelector(".guide-card")).not.toBeNull();
    expect(document.querySelector(".sim-main--tool")).not.toBeNull();
  });
});
