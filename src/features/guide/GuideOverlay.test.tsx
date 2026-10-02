/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { applyAction, createRun, type RunState } from "@/engine";
import { GuideEntryButton } from "./GuideEntryButton";
import { GuideOverlay } from "./GuideOverlay";
import type { GuideCue } from "./logic";
import { fixtureScenario, powerWalkthrough, scenarioWithoutGuide } from "./testFixtures";

function powerFixture() {
  return fixtureScenario("pc-no-power", powerWalkthrough);
}

function renderOverlay(options?: {
  run?: RunState;
  scenario?: ReturnType<typeof powerFixture>;
  kbOpen?: boolean;
}) {
  const scenario = options?.scenario ?? powerFixture();
  const run = options?.run ?? createRun(scenario, "guided");
  const onExit = vi.fn();
  const onOpenKb = vi.fn();
  const view = render(
    <GuideOverlay
      scenario={scenario}
      run={run}
      onExit={onExit}
      onOpenKb={onOpenKb}
      kbOpen={options?.kbOpen ?? false}
    />,
  );
  const rerender = (nextRun: RunState, nextKbOpen = false) =>
    view.rerender(
      <GuideOverlay
        scenario={scenario}
        run={nextRun}
        onExit={onExit}
        onOpenKb={onOpenKb}
        kbOpen={nextKbOpen}
      />,
    );
  return { scenario, run, onExit, onOpenKb, ...view, rerender };
}

describe("guide entry button", () => {
  it("appears only when the scenario has a guided walkthrough", () => {
    const onToggle = vi.fn();
    const withGuide = powerFixture();
    const withoutGuide = scenarioWithoutGuide("printer-low-toner");

    const { rerender, container } = render(
      <GuideEntryButton scenario={withGuide} open={false} onToggle={onToggle} />,
    );
    expect(screen.getByTestId("guide-toggle")).toBeInTheDocument();

    rerender(
      <GuideEntryButton scenario={withoutGuide} open={false} onToggle={onToggle} />,
    );
    expect(screen.queryByTestId("guide-toggle")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("exposes its toggle state with an accessible name and notifies on click", () => {
    const onToggle = vi.fn();
    render(
      <GuideEntryButton scenario={powerFixture()} open={false} onToggle={onToggle} />,
    );
    const button = screen.getByTestId("guide-toggle");
    expect(button).toHaveAttribute("aria-label", "Guided troubleshooting");
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("guide overlay", () => {
  it("opens on the current step derived from a fresh run", () => {
    renderOverlay();
    expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 1 of 4");
    expect(
      screen.getByRole("heading", { level: 2, name: "Check the wall outlet and power strip" }),
    ).toBeInTheDocument();
    expect(screen.getByText(powerWalkthrough.intro)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Reseat the PSU power cable" }),
    ).not.toBeInTheDocument();
  });

  it("renders the next step as the simulation advances", () => {
    const { scenario, run, rerender } = renderOverlay();
    const advanced = applyAction(scenario, run, "check-wall");
    rerender(advanced);

    expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 2 of 4");
    expect(
      screen.getByRole("heading", { level: 2, name: "Reseat the PSU power cable" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Check the wall outlet and power strip" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(powerWalkthrough.intro)).not.toBeInTheDocument();
  });

  it("always exposes the target as accessible text", () => {
    renderOverlay();
    const target = screen.getByTestId("guide-target");
    expect(target).toHaveTextContent(/^TARGET:/);
    expect(target).toHaveTextContent("Wall outlet and power strip");
  });

  it("renders the TARGET / DO THIS / WHY / LOOK FOR / DONE WHEN sections", () => {
    renderOverlay();
    expect(screen.getByText("TARGET:")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "DO THIS" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "WHY" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "LOOK FOR" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "DONE WHEN" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Use Wall outlet and power strip in the lab to: Check wall outlet \/ power strip\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We start at the source because a machine that looks dead may simply not be receiving power yet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Look for whether power is available at the outlet."),
    ).toBeInTheDocument();
    // Derived DONE WHEN — never ambiguous about what completes the step.
    expect(
      screen.getByText('The action "Check wall outlet / power strip" has been applied.'),
    ).toBeInTheDocument();
  });

  it("shows waiting status text for the current step", () => {
    renderOverlay();
    const status = screen.getByTestId("guide-status");
    expect(status).toHaveTextContent("WAITING FOR ACTION");
    expect(status).toHaveTextContent("Check wall outlet / power strip");
  });

  it("acknowledges the finished step as OBSERVED for a beat when the engine advances", () => {
    vi.useFakeTimers();
    try {
      const { scenario, run, rerender } = renderOverlay();
      rerender(applyAction(scenario, run, "check-wall"));

      const done = screen.getByTestId("guide-done");
      expect(done).toHaveTextContent("✓ OBSERVED — Check the wall outlet and power strip");
      // The next step is already live alongside the acknowledgment — progress
      // is engine-driven, never a Next button.
      expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 2 of 4");

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByTestId("guide-done")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the knowledge base through the existing mechanism", () => {
    const { scenario, run, onOpenKb, rerender } = renderOverlay();
    rerender(applyAction(scenario, run, "check-wall"));

    const chip = screen.getByTestId("guide-concept");
    expect(chip).toHaveTextContent(/^Learn:/);
    fireEvent.click(chip);
    expect(onOpenKb).toHaveBeenCalledTimes(1);
    expect(onOpenKb).toHaveBeenCalledWith("troubleshooting-method");
  });

  it("exits through Exit Guide without changing RunState", () => {
    const { onExit, run } = renderOverlay();
    const snapshot = JSON.stringify(run);

    fireEvent.click(screen.getByRole("button", { name: "Exit guided troubleshooting" }));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(run)).toBe(snapshot);
  });

  it("does not mutate RunState when the guide is opened and read", () => {
    const scenario = powerFixture();
    const run = createRun(scenario, "guided");
    const snapshot = JSON.stringify(run);

    render(
      <GuideOverlay
        scenario={scenario}
        run={run}
        onExit={vi.fn()}
        onOpenKb={vi.fn()}
      />,
    );
    expect(screen.getByTestId("guide-overlay")).toBeInTheDocument();
    expect(JSON.stringify(run)).toBe(snapshot);
  });

  it("re-derives the same step when the guide is reopened", () => {
    const scenario = powerFixture();
    const run = createRun(scenario, "guided");

    const first = render(
      <GuideOverlay scenario={scenario} run={run} onExit={vi.fn()} onOpenKb={vi.fn()} />,
    );
    const firstTitle = screen.getByRole("heading", { level: 2 }).textContent;
    first.unmount();

    render(
      <GuideOverlay scenario={scenario} run={run} onExit={vi.fn()} onOpenKb={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(firstTitle);
    expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 1 of 4");
  });

  it("announces step changes through a polite live region", () => {
    const { scenario, run, rerender } = renderOverlay();
    const live = screen.getByRole("status");
    expect(live).toHaveTextContent(
      "Step 1 of 4: Check the wall outlet and power strip. Target: Wall outlet and power strip.",
    );

    rerender(applyAction(scenario, run, "check-wall"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Step 2 of 4: Reseat the PSU power cable. Target: PSU AC power cable.",
    );
  });

  it("supports keyboard navigation: focus lands on the card and Escape exits", () => {
    const { onExit, rerender } = renderOverlay();
    expect(screen.getByTestId("guide-overlay")).toHaveFocus();

    const exitButton = screen.getByRole("button", { name: "Exit guided troubleshooting" });
    exitButton.focus();
    expect(exitButton).toHaveFocus();
    fireEvent.keyDown(exitButton, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);

    rerender(createRun(powerFixture(), "guided"), true);
    fireEvent.keyDown(screen.getByTestId("guide-overlay"), { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("keeps reduced-motion behavior for the guide card", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/\.guide-card\s*\{[^}]*animation:\s*sim-rise/);

    const reducedBlocks =
      css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n {2}\}/g) ?? [];
    expect(
      reducedBlocks.some((block: string) =>
        /\.guide-card\s*\{[^}]*animation: none/.test(block),
      ),
    ).toBe(true);
  });

  it("renders safely when no target anchor exists in the DOM", () => {
    renderOverlay();
    expect(document.querySelectorAll("[data-hotspot-id]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-guide-anchor]")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId("guide-target")).toHaveTextContent(
      "Wall outlet and power strip",
    );
    expect(screen.getByTestId("guide-status")).toHaveTextContent("WAITING FOR ACTION");
  });

  it("shows the cue chip and a plain-language hint for every cue", () => {
    const hints: Record<string, string> = {
      CLICK: "Click this in the lab",
      TYPE: "Type this in the terminal",
      INSPECT: "Open its panel and inspect it",
      OBSERVE: "Observe this in the lab",
      TOGGLE: "Flip this control",
      CONNECT: "Seat this connection",
      VERIFY: "Verify this state",
    };
    for (const [cue, hint] of Object.entries(hints)) {
      const view = render(
        <GuideOverlay
          scenario={powerFixture()}
          run={createRun(powerFixture(), "guided")}
          onExit={vi.fn()}
          onOpenKb={vi.fn()}
          cue={cue as GuideCue}
        />,
      );
      expect(screen.getByTestId("guide-cue-card")).toHaveTextContent(cue);
      expect(screen.getByTestId("guide-cue-hint")).toHaveTextContent(hint);
      view.unmount();
    }
  });

  it("shows a completion card once every step is done", () => {
    const scenario = powerFixture();
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "check-wall");
    run = applyAction(scenario, run, "check-cable");
    run = applyAction(scenario, run, "check-front-panel");
    run = applyAction(scenario, run, "press-power");

    renderOverlay({ run });
    expect(
      screen.getByRole("heading", { level: 2, name: "Walkthrough complete" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guide-count")).toHaveTextContent("Complete");
    expect(screen.queryByTestId("guide-target")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Exit guided troubleshooting" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/complete/i);
  });

  it("renders nothing when the scenario has no walkthrough", () => {
    const scenario = scenarioWithoutGuide("printer-low-toner");
    const { container } = renderOverlay({ scenario });
    expect(container.firstChild).toBeNull();
  });
});
