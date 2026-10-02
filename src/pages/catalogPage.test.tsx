import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogPage } from "./CatalogPage";

function renderCatalog() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

describe("labs register — discipline rail + incident ledger", () => {
  it("renders a sticky discipline rail with totals and a labelled ledger", () => {
    renderCatalog();

    const rail = screen.getByRole("navigation", { name: "Disciplines" });
    const railButtons = within(rail).getAllByRole("button");
    expect(railButtons.length).toBeGreaterThan(1);
    expect(railButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(within(rail).getByText(/\d+ verified/)).toBeInTheDocument();

    expect(screen.getByLabelText("Search labs")).toBeInTheDocument();
    expect(screen.getByLabelText("Level")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(document.querySelector(".ledger-head")).not.toBeNull();
    expect(document.body.textContent).toMatch(/Showing\s+\d+\s+of\s+\d+/);

    const rows = document.querySelectorAll(".case-row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps locked rows fully readable and names the prerequisite they wait on", () => {
    renderCatalog();

    // pc-on-no-display requires pc-no-power; with no progress both are open.
    // (Other locked rows may quote this scenario in their Requires line, so
    // pick the row by its own ticket id.)
    const row = Array.from(document.querySelectorAll<HTMLAnchorElement>(".case-row")).find(
      (r) => r.querySelector(".case-row-id")?.textContent === "HD-1002",
    );
    if (!row) throw new Error("HD-1002 row not found");
    expect(row).toHaveAttribute("data-locked", "true");
    expect(row).not.toHaveAttribute("aria-disabled");

    // Title and symptom at normal contrast; the lock is a status, not a blur.
    const title = within(row).getByText("PC powers on but no display");
    expect(title).toHaveClass("text-ink");
    expect(within(row).getByText(/Fans turn on and lights work/)).toBeInTheDocument();

    expect(row.textContent).toMatch(/Locked/);
    expect(row.textContent).toMatch(/Requires HD-1001 · Desktop PC does not power on/);

    // The row stays a working link — locks are advisory, never disabled.
    expect(row.getAttribute("href")).toBe("/lab/pc-on-no-display");
  });

  it("filters the ledger by status", () => {
    renderCatalog();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "locked" } });
    const rows = document.querySelectorAll(".case-row");
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => expect(row).toHaveAttribute("data-locked", "true"));

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "all" } });
    const all = document.querySelectorAll(".case-row");
    expect(all.length).toBeGreaterThan(rows.length);
  });
});
