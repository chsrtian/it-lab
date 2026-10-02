import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const sourceFiles = walk("src")
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes(".test."));

describe("guide is an instructor layer, never a permission gate", () => {
  it("the guide open flag exists only in the page shell", () => {
    expect(sourceFiles.some((file) => file.endsWith("ScenarioPage.tsx"))).toBe(true);
    const offenders = sourceFiles.filter((file) => /guideOpen/.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => file.replace(/\\/g, "/"))).toEqual([
      "src/pages/ScenarioPage.tsx",
    ]);
  });

  it("no disabled state anywhere references the guide", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (!file.endsWith(".tsx")) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/disabled=\{([^}]*)\}/g)) {
        if (/guide/i.test(match[1])) offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the engine never imports the guide feature", () => {
    const offenders = sourceFiles
      .filter((file) => file.replace(/\\/g, "/").includes("src/engine/"))
      .filter((file) => /@\/features\/guide/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the shared bench hotspot module carries no guide state or imports", () => {
    const bench = readFileSync(
      join("src", "features", "environments", "benchHotspot.ts"),
      "utf8",
    );
    expect(bench).not.toMatch(/guideOpen|guideFocus/);
    expect(bench).not.toMatch(/from ["']@\/features\/guide/);
  });
});
