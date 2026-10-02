import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  applyAction,
  askCustomer,
  canVerify,
  createConversation,
  createRun,
  verify,
} from "@/engine";
import { getScenario } from "@/content";
import { SupportLab } from "@/features/environments/SupportLab";

describe("support expansion: email-not-receiving chain", () => {
  it("golden path ends verified with trace → filter layers → client ordering", () => {
    const scenario = getScenario("email-not-receiving");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "run-message-trace",
      "check-quarantine",
      "check-inbox-rules",
      "disable-rule",
      "confirm-delivery",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("filter-layer checks wait for the trace; fixes wait for evidence", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "check-inbox-rules");
    expect(run.appliedActions).not.toContain("check-inbox-rules");

    run = applyAction(scenario, run, "run-message-trace");
    run = applyAction(scenario, run, "check-inbox-rules");
    run = applyAction(scenario, run, "check-quarantine");
    expect(run.appliedActions).toContain("check-quarantine");

    run = applyAction(scenario, run, "confirm-delivery");
    expect(run.appliedActions).not.toContain("confirm-delivery");
    run = applyAction(scenario, run, "disable-rule");
    run = applyAction(scenario, run, "confirm-delivery");
    expect(run.appliedActions).toContain("confirm-delivery");
    expect((run.world.mailflow as Record<string, unknown>).verified).toBe(true);
  });

  it("recreate-mailbox trap never verifies", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    run = applyAction(scenario, run, "recreate-mailbox-wrong");
    expect(run.appliedActions).toContain("recreate-mailbox-wrong");
    expect(canVerify(scenario, run)).toBe(false);
  });

  it("conversation reply about the resend changes only after the rule is disabled", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Did their test message arrive yet?", run);
    const before = conv.messages[conv.messages.length - 1]?.text ?? "";
    expect(before).toContain("nothing appears");

    run = applyAction(scenario, run, "run-message-trace");
    run = applyAction(scenario, run, "check-inbox-rules");
    run = applyAction(scenario, run, "disable-rule");
    conv = askCustomer(scenario, conv, "Did their test message arrive yet?", run);
    const after = conv.messages[conv.messages.length - 1]?.text ?? "";
    expect(after).toContain("landed right in my Inbox");
    expect(after).not.toBe(before);
  });

  it("support surface exposes persona, follow-ups and trace-first hints", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const conv = createConversation(scenario);
    render(
      <SupportLab
        scenario={scenario}
        run={run}
        conversation={conv}
        onCustomer={() => {}}
        onDiagnosis={() => {}}
        onMentorTip={() => {}}
      />,
    );
    expect(
      screen.getAllByText((_, el) => el?.textContent === "Conversation · Sofia Lang")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Did you get any bounce messages?")).toBeTruthy();
    expect(screen.getByText("When did it last work?")).toBeTruthy();
  });

  it("customer rail structure: input rows live inside the conversation panel and the log scrolls", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const conv = createConversation(scenario);
    const { container } = render(
      <SupportLab
        scenario={scenario}
        run={run}
        conversation={conv}
        onCustomer={() => {}}
        onDiagnosis={() => {}}
        onMentorTip={() => {}}
        onExplainConcept={() => {}}
      />,
    );

    const panel = container.querySelector('section[aria-label="Customer conversation"]');
    expect(panel).not.toBeNull();
    expect(panel!.className).toContain("conversation-workspace");

    // Every input+action row is inside the panel — no control can escape it.
    const rows = Array.from(panel!.querySelectorAll(".rail-input-row"));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.closest('section[aria-label="Customer conversation"]')).toBe(panel);
      const inputs = row.querySelectorAll("input");
      const buttons = row.querySelectorAll("button");
      expect(inputs).toHaveLength(1);
      expect(buttons).toHaveLength(1);
      expect(inputs[0]!.className).toContain("min-w-0");
      expect(inputs[0]!.className).toContain("w-full");
    }

    // The conversation grows and scrolls; the action form stays pinned.
    const log = panel!.querySelector('[data-testid="conversation-log"]');
    expect(log).not.toBeNull();
    // In the new conversation-workspace layout, the history is a grid child that scrolls
    expect(log!.className).toContain("conversation-history");
    // The composer area is pinned at the bottom
    const composer = panel!.querySelector(".conversation-composer");
    expect(composer).not.toBeNull();
  });

  it("pins the latest customer turn above the scrollable history", () => {
    const scenario = getScenario("email-not-receiving");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    let conv = createConversation(scenario);
    conv = askCustomer(scenario, conv, "Did their test message arrive yet?", run);

    render(
      <SupportLab
        scenario={scenario}
        run={run}
        conversation={conv}
        onCustomer={() => {}}
        onDiagnosis={() => {}}
        onMentorTip={() => {}}
        onExplainConcept={() => {}}
      />,
    );

    const current = screen.getByTestId("current-customer-turn");
    expect(current).toHaveTextContent("Current customer turn");
    expect(current).toHaveTextContent("nothing appears");
    expect(current.compareDocumentPosition(screen.getByTestId("conversation-log"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("defines readable dark input states for conversation tools", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/\.conversation-input[\s\S]*color:\s*var\(--color-lab-text\)/);
    expect(css).toMatch(/caret-color:\s*var\(--color-lab-accent\)/);
    expect(css).toMatch(/\.conversation-input::placeholder[\s\S]*color:\s*var\(--color-lab-faint\)/);
    expect(css).toMatch(/\.conversation-input:disabled[\s\S]*opacity:\s*1/);
    expect(css).toMatch(/\.conversation-input::selection[\s\S]*background:\s*var\(--color-lab-accent\)/);
  });
});
