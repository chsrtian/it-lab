import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function browserKeyCode(char: string): number {
  if (/[a-z]/i.test(char)) return char.toUpperCase().charCodeAt(0);
  if (/[0-9]/.test(char)) return char.charCodeAt(0);
  if (char === ".") return 190;
  if (char === "/") return 191;
  if (char === "-") return 189;
  if (char === "\\") return 220;
  if (char === "," || char === ";") return 186;
  if (char === "=") return 187;
  return char.charCodeAt(0);
}

function typeIntoTerminal(line: string) {
  const textarea = document.querySelector(
    ".xterm-helper-textarea",
  ) as HTMLTextAreaElement | null;
  expect(textarea, "terminal input is mounted").not.toBeNull();
  for (const char of line) {
    if (char === " ") {
      textarea!.dispatchEvent(
        new InputEvent("input", { bubbles: true, data: " ", inputType: "insertText" }),
      );
      continue;
    }
    const keyCode = browserKeyCode(char);
    fireEvent.keyDown(textarea!, { key: char, keyCode, which: keyCode, charCode: keyCode });
  }
  fireEvent.keyDown(textarea!, { key: "Enter", keyCode: 13, which: 13, charCode: 13 });
}

async function openTerminal() {
  const rail = screen.getByRole("toolbar", { name: "Lab tools" });
  fireEvent.click(within(rail).getByRole("button", { name: /^terminal/i }));
  await waitFor(() =>
    expect(document.querySelector(".xterm-helper-textarea")).not.toBeNull(),
  );
  expect(screen.queryByTestId("guide-overlay")).toBeNull();
}

async function closeToolAndShowGuide(stepText: string) {
  fireEvent.click(screen.getByRole("button", { name: "Close tool panel" }));
  await waitFor(() => expect(screen.getByTestId("guide-count")).toHaveTextContent(stepText));
  return screen.getByTestId("guide-overlay");
}

async function dismissActionReview() {
  const feedback = await screen.findByLabelText("Action review");
  expect(feedback).toHaveAttribute("role", "status");
  expect(feedback.parentElement).toBe(document.querySelector(".sim-main"));
  expect(feedback.closest(".sim-stage")).toBeNull();
  fireEvent.click(
    within(feedback).getByRole("button", { name: "Dismiss action review" }),
  );
  await waitFor(() => expect(screen.queryByLabelText("Action review")).toBeNull());
}

describe("dns-some-sites-broken — guided troubleshooting end to end", () => {
  it(
    "COMMAND and PURPOSE drive every TYPE step, the network fix advances by click, and the walkthrough completes",
    async () => {
      renderScenarioPage("dns-some-sites-broken");

      const count = () => screen.getByTestId("guide-count");
      let guide = screen.getByTestId("guide-overlay");

      expect(count()).toHaveTextContent("Step 1 of 5");
      expect(within(guide).getByRole("heading", { name: "COMMAND" })).toBeInTheDocument();
      expect(
        within(guide).getByText("ping 192.168.1.1", { selector: "code" }),
      ).toBeInTheDocument();
      expect(within(guide).getByRole("heading", { name: "PURPOSE" })).toBeInTheDocument();
      expect(
        within(guide).getByText("Test reachability to a host (gateway, DNS, internet)"),
      ).toBeInTheDocument();

      await openTerminal();
      typeIntoTerminal("ping 192.168.1.1");
      await dismissActionReview();
      guide = await closeToolAndShowGuide("Step 2 of 5");
      expect(document.querySelector(".sim-stage")).not.toBeNull();
      expect(document.querySelector(".guide-card")).not.toBeNull();

      expect(within(guide).getByText("ping 8.8.8.8", { selector: "code" })).toBeInTheDocument();
      await openTerminal();
      typeIntoTerminal("ping 8.8.8.8");
      await dismissActionReview();
      guide = await closeToolAndShowGuide("Step 3 of 5");

      expect(
        within(guide).getByText("nslookup example.com", { selector: "code" }),
      ).toBeInTheDocument();
      await openTerminal();
      typeIntoTerminal("nslookup example.com");
      await dismissActionReview();
      await closeToolAndShowGuide("Step 4 of 5");

      const chip = await screen.findByTitle(/^DNS resolver/);
      fireEvent.click(chip);
      expect(screen.queryByRole("region", { name: "Troubleshooting controls" })).not.toBeInTheDocument();
      const fix = screen.getByRole("button", {
        name: "Point DNS to working secondary (1.1.1.1)",
      });
      fireEvent.click(fix);
      await waitFor(() => expect(count()).toHaveTextContent("Step 5 of 5"));

      await openTerminal();
      typeIntoTerminal("nslookup example.com");
      await dismissActionReview();
      await closeToolAndShowGuide("Complete");
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 2, name: "Walkthrough complete" }),
        ).toBeInTheDocument(),
      );
      expect(count()).toHaveTextContent("Complete");
      expect(within(screen.getByTestId("guide-overlay")).getByRole("status")).toHaveTextContent(
        /all 5 steps done/i,
      );

      const topbar = document.querySelector(".sim-topbar");
      expect(topbar).not.toBeNull();
      const names = Array.from(topbar!.querySelectorAll("button")).map((button) =>
        (button.getAttribute("aria-label") ?? button.textContent ?? "").trim(),
      );
      expect(names.some((name) => /^verify/i.test(name))).toBe(true);
    },
    60000,
  );
});
