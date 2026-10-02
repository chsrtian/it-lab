/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

describe("power-path trace — a compact ruler, not a band or a row of cards", () => {
  it("the trace itself is frameless: transparent, borderless, single-line height", () => {
    expect(css).toMatch(/\.sig\s*\{[^}]*background:\s*transparent/);
    expect(css).toMatch(/\.sig\s*\{[^}]*border:\s*none/);
    expect(css).toMatch(/\.sig\s*\{[^}]*min-height:\s*26px/);
    // The old 52px band variable is gone.
    expect(css).not.toContain("--sig-h");
  });

  it("nodes are card-free and inline: marker · label · state on one line", () => {
    expect(css).toMatch(/\.sig-node\s*\{[^}]*background:\s*transparent/);
    expect(css).toMatch(/\.sig-node\s*\{[^}]*border:\s*none/);
    expect(css).not.toMatch(/\.sig-node\s*\{[^}]*box-shadow/);
    expect(css).toMatch(/\.sig-node\s*\{[^}]*flex-direction:\s*row/);
    expect(css).toMatch(/\.sig-node::before\s*\{/);
    expect(css).toMatch(/\.sig-node\[data-tone="ok"\]::before/);
    expect(css).toMatch(/\.sig-node\.is-active::before/);
  });

  it("connectors stretch to fill so the line reads as one trace", () => {
    expect(css).toMatch(/\.sig-link\s*\{[^}]*flex:\s*1 1 auto/);
    expect(css).toMatch(/\.sig-link-line\s*\{[^}]*flex:\s*1 1 auto/);
    expect(css).toMatch(/\.sig-link\.is-live/);
    expect(css).toMatch(/\.sig-link\.is-broken/);
  });

  it("the rail scrolls horizontally instead of wrapping on narrow screens", () => {
    expect(css).toMatch(/\.sig-rail\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.sig-rail\s*\{[^}]*align-items:\s*center/);
  });
});
