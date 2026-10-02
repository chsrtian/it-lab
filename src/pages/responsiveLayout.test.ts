/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

describe("workspace — responsive drawer contracts", () => {
  it("≥960px reserves a real right tool column (340–420px) beside the stage", () => {
    expect(css).toMatch(
      /@media \(min-width: 960px\) \{\s*\.sim-main--tool \{\s*grid-template-columns: minmax\(0, 1fr\) clamp\(21\.25rem, 26vw, 26\.25rem\)/,
    );
  });

  it("≤959px becomes a full-width bottom sheet (≤72vh) while the stage keeps height", () => {
    expect(css).toMatch(/@media \(max-width: 959px\) \{\s*\.sim-tool \{[^}]*max-height:\s*72vh/);
    expect(css).toMatch(/\.sim-main--tool \.sim-stage\s*\{[^}]*min-height:\s*42vh/);
    expect(css).toMatch(/@media \(max-width: 959px\) \{[\s\S]*?\.sim-main--tool \{\s*overflow-y:\s*auto/);
  });

  it("the rail shell never overflows horizontally", () => {
    expect(css).toMatch(/\.sim-tool \{[^}]*box-sizing:\s*border-box[^}]*max-width:\s*100%[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.sim-tool-body \{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/\.rail-input-row \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  });

  it("the customer panel fills the rail with a scrolling log and pinned controls", () => {
    expect(css).toMatch(/\.sim-rail-tool \.panel \{[^}]*display:\s*flex/);
    expect(css).toMatch(
      /\.sim-rail-tool \.panel \[data-testid="conversation-log"\] \{[^}]*flex:\s*1 1 auto[^}]*max-height:\s*none/,
    );
    expect(css).toMatch(/\.sim-rail-tool \.panel > \* \{\s*flex:\s*none/);
  });

  it("the side column stacks drawer sections instead of pairing them", () => {
    expect(css).toMatch(/\.sim-main--tool \.sim-drawer-cols\s*\{[^}]*minmax\(0, 1fr\)/);
  });

  it("keeps a GUIDE zone in the header", () => {
    expect(css).toContain(".sim-zone--guide");
  });
});

describe("labs register — responsive contracts", () => {
  it("≥900px shows the discipline rail beside the ledger", () => {
    expect(css).toMatch(
      /@media \(min-width: 900px\) \{\s*\.catalog-grid \{[^}]*clamp\(12rem, 16vw, 14\.5rem\)/,
    );
  });

  it("≤899px turns the rail into a horizontal scroll strip", () => {
    expect(css).toMatch(
      /@media \(max-width: 899px\) \{\s*\.disc-rail-items \{[^}]*overflow-x:\s*auto/,
    );
  });

  it("hides the wide env column first, then stacks rows on phones", () => {
    expect(css).toMatch(
      /@media \(max-width: 1199px\) and \(min-width: 761px\) \{[\s\S]*?\.case-row-env[\s\S]*?display:\s*none/,
    );
    expect(css).toMatch(/grid-template-areas:[\s\S]*?"diff domain env"/);
    expect(css).toMatch(/@media \(max-width: 760px\) \{\s*\.ledger-head \{\s*display:\s*none/);
  });
});

describe("locked rows — readable, never greyed out", () => {
  it("uses data-locked instead of aria-disabled and drops the opacity fade", () => {
    expect(css).toContain('.case-row[data-locked="true"]');
    expect(css).not.toContain(".case-row[aria-disabled");
  });

  it("styles the prerequisite line as a warning-toned requirement", () => {
    expect(css).toMatch(/\.case-row-req\s*\{[^}]*color:\s*var\(--color-warning\)/);
  });
});
