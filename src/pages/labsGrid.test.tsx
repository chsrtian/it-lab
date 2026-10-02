/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogPage } from "./CatalogPage";

const css = readFileSync("src/index.css", "utf8");

const COLUMN_CLASSES = [
  "case-row-status",
  "case-row-id",
  "case-row-title",
  "case-row-domain",
  "case-row-diff",
  "case-row-env",
  "case-row-min",
];

describe("labs grid — one rigid template shared by header and every row", () => {
  it("header and rows are declared in the same combined rule (cannot drift by construction)", () => {
    const sharedRules = css.match(/\.case-row,\s*\.ledger-head \{[^}]*\}/g) ?? [];
    // Base grid + the 761–1199 narrowing both keep one combined selector.
    expect(sharedRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of sharedRules) {
      expect(rule).toMatch(/grid-template-columns/);
      // No content-sized tracks: auto tracks are what let columns drift.
      expect(rule).not.toMatch(/\bauto\b/);
    }
  });

  it("any rule that lays out the header's tracks also lays out the row's", () => {
    const rules = css.match(/[^{}]*\.ledger-head[^{}]*\{[^}]*\}/g) ?? [];
    const trackRules = rules.filter((r) => r.includes("grid-template-columns"));
    expect(trackRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of trackRules) {
      expect(rule).toContain(".case-row");
    }
    // Presentation-only header rules (padding/font/hidden) never own the grid.
    const presentationOnly = rules.filter((r) => !r.includes("grid-template-columns"));
    for (const rule of presentationOnly) {
      expect(rule).not.toContain("grid-template");
    }
  });

  it("uses fixed rails: Status 6.5rem · Ticket 5.5rem · Incident 1fr · Domain 7rem · Level 6.5rem · Env 9rem · Time 3.5rem", () => {
    expect(css).toContain(
      "grid-template-columns: 6.5rem 5.5rem minmax(0, 1fr) 7rem 6.5rem 9rem 3.5rem;",
    );
    expect(css).toMatch(/\.case-row,\s*\.ledger-head \{[^}]*align-items:\s*baseline/);
  });

  it("narrows without auto tracks: env column drops between 761–1199, phone stacks keep fixed rails", () => {
    expect(css).toMatch(
      /@media \(max-width: 1199px\) and \(min-width: 761px\) \{[\s\S]*?\.case-row,[\s\S]*?\.ledger-head \{[\s\S]*?6\.5rem 5\.5rem minmax\(0, 1fr\) 7rem 6\.5rem 3\.5rem/,
    );
    expect(css).toContain("grid-template-columns: 6.5rem minmax(0, 1fr) 3.5rem;");
  });

  it("header cells and body cells use the same column classes", () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    const head = document.querySelector(".ledger-head");
    const row = document.querySelector(".case-row");
    expect(head).not.toBeNull();
    expect(row).not.toBeNull();

    for (const cls of COLUMN_CLASSES) {
      expect(head!.querySelector(`.${cls}`)).not.toBeNull();
      expect(row!.querySelector(`.${cls}`)).not.toBeNull();
    }
  });

  it("rows of different incident heights keep identical column cells (locked 3-line vs open 2-line)", () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    const locked = document.querySelector('.case-row[data-locked="true"]');
    expect(locked).not.toBeNull();
    // Locked rows carry the extra Requires line — every column class still present.
    for (const cls of COLUMN_CLASSES) {
      expect(locked!.querySelector(`.${cls}`)).not.toBeNull();
    }

    const open = Array.from(document.querySelectorAll(".case-row")).find(
      (r) => r.getAttribute("data-locked") === null,
    );
    expect(open).toBeDefined();
    for (const cls of COLUMN_CLASSES) {
      expect(open!.querySelector(`.${cls}`)).not.toBeNull();
    }

    // And the header labels still name all seven columns.
    const head = document.querySelector(".ledger-head")!;
    for (const label of [
      "Status",
      "Ticket",
      "Incident",
      "Domain",
      "Level",
      "Environment",
      "Time",
    ]) {
      expect(within(head as HTMLElement).getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("navigation", { name: "Disciplines" })).toBeInTheDocument();
  });
});
