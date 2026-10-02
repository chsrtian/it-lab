import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LabPreview } from "./LabPreview";

function renderPreview() {
  return render(
    <MemoryRouter>
      <LabPreview />
    </MemoryRouter>,
  );
}

function pressedButtons(groupName: string): HTMLElement[] {
  const group = screen.getByRole("group", { name: groupName });
  return within(group)
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-pressed") === "true");
}

describe("lab preview — interactive product miniature", () => {
  it("opens on the real hardware incident with an Open work order", () => {
    renderPreview();

    expect(screen.getByTestId("lab-preview")).toBeInTheDocument();
    expect(screen.getByText("HD-1001")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(
      screen.getByText(/press the power button and nothing happens/i),
    ).toBeInTheDocument();

    // Hardware chain of custody, in product vocabulary.
    const chain = document.querySelector(".lp-chain");
    expect(chain).not.toBeNull();
    expect(chain!.textContent).toMatch(/Wall/);
    expect(chain!.textContent).toMatch(/Front panel/);

    // Observe phase shows no probe log yet (nothing has been run).
    expect(document.querySelector(".lp-log")).toBeNull();

    const domains = pressedButtons("Choose a discipline case");
    expect(domains).toHaveLength(1);
    expect(domains[0].textContent).toMatch(/Hardware/);
  });

  it("advances Observe → Trace → Verify with state and log feedback", () => {
    renderPreview();

    const steps = screen.getByRole("group", { name: "Case progress" });
    const [observe, trace, verify] =
      within(steps).getAllByRole("button");

    fireEvent.click(trace);
    expect(trace).toHaveAttribute("aria-pressed", "true");
    expect(observe).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("In progress")).toBeInTheDocument();

    // Trace reveals the loose front-panel header as the fault.
    const chain = document.querySelector(".lp-chain")!;
    expect(chain.textContent).toMatch(/Front panel/);
    const faultItem = Array.from(chain.querySelectorAll("li")).find((li) =>
      li.textContent?.includes("Front panel"),
    );
    expect(faultItem).toHaveAttribute("data-state", "fault");
    expect(document.querySelector(".lp-log")).not.toBeNull();
    expect(
      screen.getByText(/case power button cable was loose/i),
    ).toBeInTheDocument();

    fireEvent.click(verify);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/Fans spin, LEDs on, system POSTs\./)).toBeInTheDocument();

    // Every chain link resolves to ok on verify.
    const states = Array.from(
      document.querySelectorAll(".lp-chain li"),
    ).map((li) => li.getAttribute("data-state"));
    expect(states).toEqual(["ok", "ok", "ok", "ok", "ok"]);
  });

  it("switches discipline case with a clean instrument reset", () => {
    renderPreview();

    fireEvent.click(
      screen.getByRole("button", { name: /Networking/ }),
    );
    expect(
      screen.getByText(/Some websites work, some don't/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();

    // Networking trace: terminal commands + topology edge states.
    fireEvent.click(
      within(screen.getByRole("group", { name: "Case progress" }))
        .getAllByRole("button")[1],
    );
    expect(screen.getByText("ping 192.168.1.1")).toBeInTheDocument();
    const topo = document.querySelector(".lp-topo") as SVGElement | null;
    expect(topo).not.toBeNull();
    expect(topo!.getAttribute("aria-label")).toMatch(
      /DESKTOP-ALEX to DNS resolver: failing/,
    );

    // Switching channel resets the sequence back to Observe.
    fireEvent.click(screen.getByRole("button", { name: /Linux/ }));
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(document.querySelector(".lp-stage-hint")).not.toBeNull();

    // Linux case: permission evidence straight from the scenario transcript.
    fireEvent.click(
      within(screen.getByRole("group", { name: "Case progress" }))
        .getAllByRole("button")[1],
    );
    expect(screen.getByText("whoami")).toBeInTheDocument();
    expect(screen.getByText("-rw------- 1 root root 27 config.yaml")).toBeInTheDocument();
    expect(
      screen.getByText(/mode 600 — devon cannot write it/i),
    ).toBeInTheDocument();
  });

  it("marks pressed state on the stepper, never colour alone", () => {
    renderPreview();

    const steps = screen.getByRole("group", { name: "Case progress" });
    const buttons = within(steps).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "●Observe",
      "○Trace",
      "○Verify",
    ]);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("data-state", "now");
    expect(buttons[1]).toHaveAttribute("data-state", "todo");
  });
});
