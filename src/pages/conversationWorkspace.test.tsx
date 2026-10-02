import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

function conversationLogs(): Element[] {
  return Array.from(document.querySelectorAll('[data-testid="conversation-log"]'));
}

describe("conversation workspace", () => {
  it("a support case owns its conversation inside the stage — exactly one copy, no rail toggle", async () => {
    renderScenarioPage("email-not-receiving");

    expect(document.querySelector(".sim-stage")).not.toBeNull();
    expect(conversationLogs()).toHaveLength(1);

    const log = conversationLogs()[0]!;
    expect(log.closest(".sim-stage")).not.toBeNull();
    expect(log.closest("aside.sim-tool")).toBeNull();

    expect(document.querySelector('[data-guide-anchor="customer"]')).toBeNull();
    expect(conversationLogs()).toHaveLength(1);
  });

  it("a non-support case keeps the conversation out of the stage until Customer opens in the rail", async () => {
    renderScenarioPage("pc-no-power");

    expect(document.querySelector(".sim-stage")).not.toBeNull();
    expect(conversationLogs()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /customer/i }));
    await waitFor(() => expect(conversationLogs()).toHaveLength(1));

    const log = conversationLogs()[0]!;
    expect(log.closest("aside.sim-tool")).not.toBeNull();
    expect(log.closest(".sim-stage")).toBeNull();
    expect(conversationLogs()).toHaveLength(1);
  });
});
