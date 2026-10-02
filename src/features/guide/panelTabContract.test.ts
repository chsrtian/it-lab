import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getScenarios } from "@/content";
import type { Scenario } from "@/content/schema";

/**
 * Windows panel-tab <-> guide target contract.
 *
 * WindowsLab only renders a panel tab (and its `data-guide-anchor`) when the
 * scenario's initial world carries that tab's data. A guided step pointing at
 * "event-viewer" with an empty event log has no anchor and no click target —
 * the learner is told to open a tab that does not exist. This audit proves
 * every guided step targeting a Windows panel id lands in an environment that
 * renders that tab from initialWorld.
 */
const WINDOWS_PANEL_IDS = [
  "event-viewer",
  "task-manager",
  "services",
  "device-manager",
  "storage",
] as const;
type PanelId = (typeof WINDOWS_PANEL_IDS)[number];

/** Mirrors EnvironmentRenderer priority 1–5 + shell fallbacks for WindowsLab. */
function routesToWindowsLab(scenario: Scenario): boolean {
  const kind = scenario.environment.kind;
  const cat = scenario.category;
  const shell = scenario.environment.shell;

  if (kind === "equipment-bench" || scenario.environment.deviceFamily) return false;
  if (cat === "hardware" || kind === "hardware-bench") return false;
  if (cat === "networking" || cat === "database") return false;
  if (cat === "windows" || kind === "windows-panel") return true;
  if (cat === "linux" || kind === "linux-terminal") return false;
  if (cat === "sysadmin") return shell === "windows";
  if (cat === "security") return false;
  if (cat === "support" || kind === "mixed") return false;
  return shell === "windows";
}

/** Mirrors WindowsLab's tab visibility conditions on initialWorld. */
function tabHasInitialData(scenario: Scenario, tab: PanelId): boolean {
  const w = scenario.environment.initialWorld as Record<string, unknown>;
  switch (tab) {
    case "event-viewer": {
      const records = w.events ?? w.eventLog ?? w.logs;
      return Array.isArray(records) && records.length > 0;
    }
    case "task-manager": {
      const procs = w.processes ?? w.taskManager;
      return Array.isArray(procs) && procs.length > 0;
    }
    case "services": {
      const services = w.services;
      if (Array.isArray(services)) return services.length > 0;
      return (
        services !== undefined &&
        services !== null &&
        typeof services === "object" &&
        Object.keys(services).length > 0
      );
    }
    case "device-manager":
      return w.devices !== undefined;
    case "storage": {
      const disks = w.disks;
      return Array.isArray(disks) && disks.length > 0;
    }
  }
}

describe("Windows panel-tab guide target contract", () => {
  const guided = getScenarios().filter((s) => s.guidedWalkthrough);

  it("every guided step targeting a Windows panel id lands where that tab renders", () => {
    const failures: string[] = [];
    for (const scenario of guided) {
      if (!routesToWindowsLab(scenario)) continue;
      for (const step of scenario.guidedWalkthrough!.steps) {
        const target = step.target.componentId;
        if (!(WINDOWS_PANEL_IDS as readonly string[]).includes(target)) continue;
        if (!tabHasInitialData(scenario, target as PanelId)) {
          failures.push(
            `${scenario.id} / ${step.id}: target "${target}" but initialWorld has no data for that tab`,
          );
        }
      }
    }
    expect(failures, failures.join("\n")).toHaveLength(0);
  });

  it("the event-viewer contract covers every guided scenario that points at it", () => {
    const eventTargets = guided.filter((s) =>
      s.guidedWalkthrough!.steps.some((step) => step.target.componentId === "event-viewer"),
    );
    expect(eventTargets.length).toBeGreaterThan(10);
    for (const scenario of eventTargets) {
      expect(routesToWindowsLab(scenario), `${scenario.id} routes to a lab with Event Viewer`).toBe(
        true,
      );
      expect(tabHasInitialData(scenario, "event-viewer"), `${scenario.id} seeds event records`).toBe(
        true,
      );
    }
  });

  it("a WindowsLab-routed scenario with an event-viewer guide step exposes the anchor contract in source", () => {
    // Source-level guard: the anchor wiring in WindowsLab must not be removed.
    const source = readFileSync("src/features/environments/WindowsLab.tsx", "utf8");
    expect(source).toContain('data-guide-anchor={t.id}');
    expect(source).toContain('t.id === "event-viewer" && records.length > 0');
  });
});


