/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Text-encoding invariant: source must never contain mojibake.
 *
 * Phase 15B.2 fixed eight genuine corruptions (UTF-8 multi-byte sequences
 * interpreted as Latin-1: ellipsis became U+00E2 U+2026, em dash became
 * U+00E2 U+20AC U+201C-style runs, middle dot became U+00C2 U+00B7). This
 * test scans source files as UTF-8 for that corruption signature so it can
 * never land again.
 *
 * Legitimate typographic characters (ellipsis, em dash, middle dot) are
 * single code points and are never preceded by a Latin-1 letter in this
 * codebase, so they don't match. Corruption samples below are written as
 * escapes so this very file stays clean.
 */

const ROOTS = ["src", "index.html"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".html"]);

/**
 * A mojibake pair: Latin-1 letter (U+00E2, U+00C2, U+00C3, ...) followed by
 * a code point that only makes sense as a mis-decoded second byte — C1
 * controls / Latin-1 supplement, general punctuation, arrows, euro sign —
 * or a lone U+FFFD replacement character anywhere.
 */
const MOJIBAKE = /[\u00c2\u00c3\u00e2][\u0080-\u024f\u2010-\u2027\u2030-\u203a\u2190-\u21ff\u20ac]|\uFFFD/;

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, out);
    } else if (EXTENSIONS.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(): string[] {
  const files: string[] = [];
  for (const root of ROOTS) {
    if (statSync(root).isDirectory()) collectFiles(root, files);
    else files.push(root);
  }
  return files;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

describe("text encoding — no mojibake in source", () => {
  const files = sourceFiles();

  it("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("never contains mis-decoded UTF-8 sequences or replacement characters", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(new RegExp(MOJIBAKE.source, "g"))) {
        offenders.push(
          `${file}:${lineOf(text, match.index ?? 0)}: ${JSON.stringify(match[0])}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("matches corruption signatures but not legitimate typography", () => {
    expect("a\u00e2\u2026b").toMatch(MOJIBAKE); // ellipsis mis-decoded
    expect("\u00c2\u00b7").toMatch(MOJIBAKE); // middle dot mis-decoded
    expect("\u00e2\u20ac\u201c").toMatch(MOJIBAKE); // quote run mis-decoded
    expect("Loading 3D workbench\u2026").not.toMatch(MOJIBAKE);
    expect("OPEN OFFICE \u00b7 CEILING ZONE").not.toMatch(MOJIBAKE);
    expect("CASE \u00b7 MODE").not.toMatch(MOJIBAKE);
    expect("resets \u2014 cleanly").not.toMatch(MOJIBAKE);
  });

  it("keeps the previously corrupted strings intact", () => {
    const hardware = readFileSync("src/features/environments/HardwareLabView.tsx", "utf8");
    expect(hardware).toContain("Loading 3D workbench\u2026");
    const accessPoint = readFileSync(
      "src/features/environments/equipment/svg/AccessPointSvg.tsx",
      "utf8",
    );
    expect(accessPoint).toContain("PWR \u00b7 WIFI \u00b7 CLIENT");
  });
});
