import type { Scenario } from "@/content/schema";

/**
 * True when a scenario has a customer/mentor conversation worth exposing as a
 * dock tool. Support-category scenarios use SupportLab as the environment
 * itself, so they are excluded (the conversation lives in the stage there).
 */
export function hasCustomerConversation(scenario: Scenario): boolean {
  if (!scenario.conversationEnabled) return false;
  if (scenario.category === "support" || scenario.environment.kind === "mixed")
    return false;
  return (
    scenario.conversation !== undefined ||
    scenario.ticket.channel === "phone" ||
    scenario.ticket.channel === "walkup"
  );
}
