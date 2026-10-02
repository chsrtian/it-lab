/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

const PAGE_FILES = [
  "src/pages/HomePage.tsx",
  "src/pages/CatalogPage.tsx",
  "src/pages/KbPage.tsx",
  "src/pages/ProgressPage.tsx",
  "src/pages/SettingsPage.tsx",
  "src/pages/VmLabPage.tsx",
] as const;

describe("page header — one shared primitive across the shell", () => {
  it.each(PAGE_FILES)("%s uses the shared `inset page-head` + `t-display` title", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("inset page-head");
    expect(src).toContain('className="t-display"');
  });

  it("the shared primitive defines the title row rhythm once", () => {
    expect(css).toMatch(/\.page-head \{[^}]*gap:\s*0\.35rem 1\.5rem/);
    // Exactly one `.page { … padding-block … }` rules the top padding for all pages.
    const pagePadding = css.match(/\.page \{[^}]*padding-block[^}]*\}/g) ?? [];
    expect(pagePadding.length).toBe(1);
  });

  it("no page forks the header spacing with its own page-level padding", () => {
    expect(css).not.toContain(".page--catalog");
    expect(css).not.toMatch(/\.page--[a-z]+ \{[^}]*padding-block/);
  });

  it("the Labs title line carries no incident-count badge beside it", () => {
    const src = readFileSync("src/pages/CatalogPage.tsx", "utf8");
    expect(src).not.toContain("catalog-count");
    expect(css).not.toContain(".catalog-count");
  });
});
