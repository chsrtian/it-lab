/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getScenario } from "@/content";
import { createRun } from "@/engine";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { EquipmentLabView } from "@/features/environments/EquipmentLabView";
import { HardwareLabView } from "@/features/environments/HardwareLabView";
import { GuideOverlay } from "./GuideOverlay";
import { GuideTargetLayer } from "./GuideTargetLayer";
import {
  resolveGuideAnchor,
  resolveGuideAnchorState,
  useGuideAnchor,
} from "./anchor";
import { fixtureScenario, powerWalkthrough } from "./testFixtures";

function renderScenarioPage(id: string) {
  render(
    <MemoryRouter initialEntries={[`/lab/${id}`]}>
      <Routes>
        <Route path="/lab/:scenarioId" element={<ScenarioPage />} />
      </Routes>
    </MemoryRouter>,
  );
  // Entry is a briefing sheet: pick the mode row, then enter the workstation.
  fireEvent.click(screen.getByRole("button", { name: /guided/i }));
  fireEvent.click(screen.getByRole("button", { name: /enter the workstation/i }));
}

function openGuide(): void {
  if (screen.getByTestId("guide-toggle").getAttribute("aria-pressed") !== "true") fireEvent.click(screen.getByTestId("guide-toggle"));
}

describe("resolveGuideAnchor", () => {
  it("resolves hotspot → guide anchor → ReactFlow node in that priority", () => {
    document.body.innerHTML = [
      `<div data-guide-anchor="shared"></div>`,
      `<div data-hotspot-id="shared"></div>`,
      `<div data-guide-anchor="only-anchor"></div>`,
      `<div class="react-flow__node" data-id="gateway"></div>`,
    ].join("");

    expect(resolveGuideAnchor("shared")?.hasAttribute("data-hotspot-id")).toBe(true);
    expect(
      resolveGuideAnchor("only-anchor")?.getAttribute("data-guide-anchor"),
    ).toBe("only-anchor");
    expect(resolveGuideAnchor("gateway")?.getAttribute("data-id")).toBe("gateway");
    expect(resolveGuideAnchor("missing")).toBeNull();
    document.body.innerHTML = "";
  });

  it("uses the projected 3D marker when the stage is active and reports an honest miss without one", () => {
    document.body.innerHTML = `<div class="hw3d-stage" data-guide-3d-target="power-supply"><div data-guide-anchor-3d="power-supply"></div></div>`;
    const withMarker = resolveGuideAnchorState("power-supply");
    expect(withMarker.mode).toBe("3d");
    expect(withMarker.rect).not.toBeNull();

    document.body.innerHTML = `<div class="hw3d-stage" data-guide-3d-target="power-supply"></div>`;
    const withoutMarker = resolveGuideAnchorState("power-supply");
    expect(withoutMarker.mode).toBe("3d");
    expect(withoutMarker.rect).toBeNull();

    document.body.innerHTML = "";
    expect(resolveGuideAnchorState("power-supply").mode).toBeNull();
    expect(resolveGuideAnchorState(null).rect).toBeNull();
    document.body.innerHTML = "";
  });
});

function Harness({
  targetId,
  cue,
  label,
}: {
  targetId: string | null;
  cue?: "INSPECT" | "CLICK" | "TOGGLE" | "OBSERVE";
  label?: string;
}) {
  const anchor = useGuideAnchor(targetId);
  return (
    <>
      <div data-hotspot-id="wall" />
      <div data-hotspot-id="power-supply" />
      <GuideTargetLayer targetId={targetId} anchor={anchor} cue={cue} label={label} />
    </>
  );
}

describe("GuideTargetLayer", () => {
  it("draws a ring over a resolved DOM target and nothing when it is missing or closed", async () => {
    const view = render(<Harness targetId="wall" />);
    const ring = await screen.findByTestId("guide-ring");
    expect(ring).toHaveAttribute("data-guide-target-id", "wall");
    expect(ring).toHaveAttribute("data-guide-anchor-mode", "dom");
    expect(ring.closest(".guide-layer")).toHaveAttribute("aria-hidden", "true");

    view.rerender(<Harness targetId="gone" />);
    expect(screen.queryByTestId("guide-ring")).not.toBeInTheDocument();

    view.rerender(<Harness targetId={null} />);
    expect(screen.queryByTestId("guide-ring")).not.toBeInTheDocument();
  });

  it("swaps ring, label, glyph and cue together when the step target changes (atomic)", async () => {
    const view = render(
      <Harness targetId="wall" cue="INSPECT" label="Wall outlet and power strip" />,
    );
    await screen.findByTestId("guide-ring");
    expect(screen.getByTestId("guide-ring-label")).toHaveTextContent(
      "Wall outlet and power strip",
    );
    expect(screen.getByTestId("guide-ring")).toHaveClass("guide-ring--inspect");
    expect(screen.getByTestId("guide-ring").querySelector(".guide-ring-dot")).not.toBeNull();
    expect(screen.getByTestId("guide-cue")).toHaveTextContent("INSPECT");

    // One commit: every surface names the NEXT target — no frame can show a
    // ring on A while the card already describes B.
    view.rerender(
      <Harness targetId="power-supply" cue="CLICK" label="PSU AC power cable" />,
    );
    const ring = screen.getByTestId("guide-ring");
    expect(ring).toHaveAttribute("data-guide-target-id", "power-supply");
    expect(ring).toHaveClass("guide-ring--click");
    expect(ring.querySelector(".guide-ring-glyph")).toHaveTextContent("☞");
    expect(screen.getByTestId("guide-ring-label")).toHaveTextContent("PSU AC power cable");
    expect(screen.getByTestId("guide-cue")).toHaveTextContent("CLICK");
    expect(document.querySelectorAll('[data-guide-target-id="wall"]')).toHaveLength(0);
    expect(document.querySelectorAll(".guide-ring-label")).toHaveLength(1);
  });
});

function stubFrameLoop() {
  const frames: Array<FrameRequestCallback | undefined> = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
    frames[id - 1] = undefined;
  });
  return {
    flush(): void {
      const pending = frames.splice(0, frames.length);
      for (const cb of pending) cb?.(0);
    },
    pending: () => frames.filter(Boolean).length,
  };
}

function rect(left: number, top: number): DOMRect {
  return {
    left,
    top,
    width: 2,
    height: 2,
    right: left + 2,
    bottom: top + 2,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("3D marker live tracking", () => {
  it("follows the projected marker as the camera moves, without React churn", () => {
    const loop = stubFrameLoop();
    let current = rect(120, 80);

    document.body.innerHTML = [
      `<div class="hw3d-stage" data-guide-3d-target="wall">`,
      `  <div id="host" style="transform: translate3d(120px, 80px, 0)">`,
      `    <div style="transform: translate3d(-50%, -50%, 0px)">`,
      `      <div data-guide-anchor-3d="wall"></div>`,
      `    </div>`,
      `  </div>`,
      `</div>`,
      `<div data-testid="guide-overlay"></div>`,
    ].join("");

    const marker = document.querySelector<HTMLElement>('[data-guide-anchor-3d="wall"]')!;
    marker.getBoundingClientRect = () => current;
    const card = document.querySelector<HTMLElement>('[data-testid="guide-overlay"]')!;
    card.getBoundingClientRect = () =>
      ({
        left: 900,
        top: 100,
        width: 200,
        height: 300,
        right: 1100,
        bottom: 400,
        x: 900,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    const view = render(
      <GuideTargetLayer
        targetId="wall"
        anchor={{ rect: { left: 120, top: 80, width: 2, height: 2 }, mode: "3d" }}
        cue="INSPECT"
      />,
    );
    const ring = screen.getByTestId("guide-ring");
    const cue = screen.getByTestId("guide-cue");
    expect(ring).toHaveAttribute("data-guide-anchor-mode", "3d");

    // First frame: the tracker corrects from the marker, not the stale rect.
    loop.flush();
    expect(ring.style.left).toBe("114px");
    expect(cue.style.left).toBe("114px");

    // Camera orbits: marker projection moves -> ring, cue and leader follow.
    current = rect(400, 300);
    document.getElementById("host")!.style.transform = "translate3d(400px, 300px, 0)";
    const line = document.querySelector<SVGLineElement>(".guide-leader-line")!;
    const before = line.getAttribute("x2");
    loop.flush();
    expect(ring.style.left).toBe("394px");
    expect(ring.style.top).toBe("294px");
    expect(cue.style.top).toBe("290px");
    expect(line.getAttribute("x2")).not.toBe(before);
    expect(line.getAttribute("x2")).not.toBeNull();

    // Camera idle: signature unchanged -> no measurement, no writes.
    const measure = vi.spyOn(marker, "getBoundingClientRect");
    loop.flush();
    loop.flush();
    expect(measure).not.toHaveBeenCalled();
    expect(loop.pending()).toBe(1); // exactly one scheduled frame, no pile-up

    view.unmount();
    expect(loop.pending()).toBe(0);
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });
});

describe("GuideOverlay fallback line", () => {
  it("shows the authored fallback only while the target is unmeasurable", () => {
    const scenario = fixtureScenario("pc-no-power", powerWalkthrough);
    const run = createRun(scenario, "guided");
    const { rerender } = render(
      <GuideOverlay
        scenario={scenario}
        run={run}
        onExit={vi.fn()}
        onOpenKb={vi.fn()}
        anchorMissing
      />,
    );
    expect(screen.getByTestId("guide-fallback")).toHaveTextContent(
      "Look for the power strip along the edge of the bench.",
    );
    expect(screen.getByTestId("guide-target")).toBeInTheDocument();

    rerender(
      <GuideOverlay scenario={scenario} run={run} onExit={vi.fn()} onOpenKb={vi.fn()} />,
    );
    expect(screen.queryByTestId("guide-fallback")).not.toBeInTheDocument();
  });
});

describe("lab guide threading", () => {
  it("hardware bench: guide focus selects the part and applies the step camera preset", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    const run = createRun(scenario!, "guided");
    render(
      <HardwareLabView
        scenario={scenario!}
        run={run}
        onInspect={vi.fn()}
        guideFocus={{
          componentId: "power-supply",
          label: "PSU AC power cable",
          cameraPreset: "power-supply",
        }}
      />,
    );
    const body = document.querySelector(".hw-body");
    expect(body).toHaveAttribute("data-guide-focus", "power-supply");
    expect(body).toHaveAttribute("data-camera-preset", "power-supply");
    expect(screen.getByTestId("hw-inspector")).toBeInTheDocument();
  });

  it("hardware bench: inert with no open guide", () => {
    const scenario = getScenario("pc-no-power")!;
    const run = createRun(scenario, "guided");
    render(
      <HardwareLabView scenario={scenario} run={run} onInspect={vi.fn()} />,
    );
    const body = document.querySelector(".hw-body");
    expect(body).toHaveAttribute("data-guide-focus", "");
    expect(body).toHaveAttribute("data-camera-preset", "full");
    expect(screen.queryByTestId("hw-inspector")).not.toBeInTheDocument();
  });

  it("equipment bench: guide focus overrides the scenario default selection and preset", () => {
    const scenario = getScenario("printer-paper-jam");
    expect(scenario).toBeDefined();
    const run = createRun(scenario!, "guided");
    render(
      <EquipmentLabView
        scenario={scenario!}
        run={run}
        onInspect={vi.fn()}
        guideFocus={{
          componentId: "printer-cartridge",
          label: "Toner cover (cartridge door)",
          cameraPreset: "printer-controls",
        }}
      />,
    );
    const body = document.querySelector(".hw-body");
    expect(body).toHaveAttribute("data-guide-focus", "printer-cartridge");
    expect(body).toHaveAttribute("data-camera-preset", "printer-controls");
    expect(screen.getByTestId("eq-inspector")).toBeInTheDocument();
  });

  it("equipment bench: inert with no open guide", () => {
    const scenario = getScenario("printer-paper-jam")!;
    const run = createRun(scenario, "guided");
    render(
      <EquipmentLabView scenario={scenario} run={run} onInspect={vi.fn()} />,
    );
    const body = document.querySelector(".hw-body");
    expect(body).toHaveAttribute("data-guide-focus", "");
    expect(body).toHaveAttribute("data-camera-preset", "printer-paper");
    expect(screen.getByTestId("eq-inspector")).toBeInTheDocument();
  });
});

describe("ScenarioPage guided targeting", () => {
  it("printer lab: the ring lands on the status-panel anchor and follows step changes", async () => {
    renderScenarioPage("printer-paper-jam");
    openGuide();

    const ring = await screen.findByTestId("guide-ring");
    expect(ring).toHaveAttribute("data-guide-target-id", "printer-panel");
    expect(ring).toHaveAttribute("data-guide-anchor-mode", "dom");
    expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 1 of 4");

    fireEvent.click(screen.getByRole("button", { name: "Printer" }));

    await waitFor(() =>
      expect(screen.getByTestId("guide-ring")).toHaveAttribute(
        "data-guide-target-id",
        "printer-cartridge",
      ),
    );
    expect(screen.getByTestId("guide-count")).toHaveTextContent("Step 2 of 4");
  });

  it("linux lab: the terminal step anchors on the dock terminal button", async () => {
    renderScenarioPage("linux-permission-denied");
    openGuide();

    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    const ring = await screen.findByTestId("guide-ring");
    expect(ring).toHaveAttribute("data-guide-target-id", "terminal-input");
    expect(ring).toHaveAttribute("data-guide-anchor-mode", "dom");
    expect(screen.queryByTestId("guide-overlay")).toBeNull();
  });
});

describe("guide target layer CSS", () => {
  const css = readFileSync("src/index.css", "utf8");

  it("styles the ring, leader, fallback, and expands the exit hit area", () => {
    expect(css).toMatch(/\.guide-ring\s*\{[^}]*animation:\s*guide-pulse/);
    expect(css).toMatch(/@keyframes\s+guide-pulse/);
    expect(css).toMatch(/\.guide-leader-line\s*\{[^}]*stroke:/);
    expect(css).toMatch(/\.guide-layer\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.guide-fallback\s*\{/);
    expect(css).toMatch(/\.guide-exit::after\s*\{[^}]*inset:\s*-6px/);
  });

  it("disables the ring pulse under prefers-reduced-motion", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.guide-card \{\s*animation: none;\s*\}\s*\.guide-ring \{\s*animation: none;\s*\}/,
    );
  });

  it("styles the cue variants, glyphs, and the label under the ring", () => {
    expect(css).toMatch(/\.guide-ring--observe \.guide-ring-dot\s*\{/);
    expect(css).toMatch(/\.guide-ring--click\s*\{/);
    expect(css).toMatch(/\.guide-ring--toggle\s*\{/);
    expect(css).toMatch(/\.guide-ring--connect\s*\{/);
    expect(css).toMatch(/\.guide-ring--verify\s*\{/);
    expect(css).toMatch(/\.guide-ring-glyph\s*\{/);
    expect(css).toMatch(/\.guide-ring-label\s*\{/);
  });
});
