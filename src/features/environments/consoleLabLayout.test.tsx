import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WindowsLab } from "./WindowsLab";
import { LinuxLab } from "./LinuxLab";
import { SecurityLab } from "./SecurityLab";
import { getScenario } from "@/content";
import { createRun } from "@/engine";

/**
 * Layout + status-channel invariants for the console-style labs:
 * their root panels must define a scroll strategy (content taller than the
 * stage — e.g. 1024×640 — must stay reachable), and the diagnostic checks
 * strip must be announced as a status region.
 */
describe("console lab layout and status invariants", () => {
  it("WindowsLab scrolls instead of clipping and exposes checks as status", () => {
    const scenario = getScenario("windows-app-crash");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    const { container } = render(
      <WindowsLab scenario={scenario} run={run} onInspect={() => {}} />,
    );

    const root = container.querySelector('[aria-label="Windows workstation"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain("overflow-y-auto");
    expect(screen.getByRole("status", { name: "Diagnostic checks" })).toBeTruthy();
  });

  it("LinuxLab scrolls instead of clipping and exposes checks as status", () => {
    const scenario = getScenario("linux-permission-denied");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    const { container } = render(
      <LinuxLab scenario={scenario} run={run} onInspect={() => {}} />,
    );

    const root = container.querySelector('[aria-label="Linux workstation"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain("overflow-y-auto");
    expect(screen.getByRole("status", { name: "Diagnostic checks" })).toBeTruthy();
  });

  it("SecurityLab scrolls instead of clipping and exposes checks as status", () => {
    const scenario = getScenario("account-lockout");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    const { container } = render(
      <SecurityLab scenario={scenario} run={run} onInspect={() => {}} onOpenKb={() => {}} />,
    );

    const root = container.querySelector('[aria-label="Security investigation"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain("overflow-y-auto");
    expect(screen.getByRole("status", { name: "Diagnostic checks" })).toBeTruthy();
  });
});
