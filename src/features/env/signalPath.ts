import type { Scenario } from "@/content/schema";

/**
 * Environments that own a real signal chain render it themselves (hardware
 * power path, printer print path, switch data path …). Every other workspace
 * gets the case path instead, so the composition is always
 * case header → path → environment.
 *
 * Routing mirrors `EnvironmentRenderer` priority: equipment families first,
 * then the hardware bench.
 */
export function hasOwnSignalPath(scenario: Scenario): boolean {
  return (
    scenario.environment.kind === "equipment-bench" ||
    Boolean(scenario.environment.deviceFamily) ||
    scenario.category === "hardware" ||
    scenario.environment.kind === "hardware-bench"
  );
}
