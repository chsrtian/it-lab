import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const marker = "PHASE 15 — PUBLIC LANDING";
const phase15Start = css.indexOf(marker);
const phase15 = phase15Start === -1 ? "" : css.slice(phase15Start);

const appSource = readFileSync("src/app/App.tsx", "utf8");

describe("phase 15 structure — route split + landing stylesheet", () => {
  it("splits routes: bare landing/auth, shell layout for the workbench", () => {
    expect(appSource).toContain('path="/" element={<LandingPage />}');
    expect(appSource).toContain('path="/workbench" element={<HomePage />}');
    expect(appSource).toContain('path="/auth" element={<AuthPlaceholderPage />}');
    expect(appSource).toContain('path="/auth/callback" element={<AuthPlaceholderPage />}');
    expect(appSource).toContain("element={<Shell />}");
    // Shell renders an outlet, not page children.
    expect(appSource).toContain("<Outlet />");
    // Heavyweight pages stay out of the entry bundle: the landing must not
    // pull the scenario workspace (xterm) or VM Lab (v86).
    expect(appSource).toMatch(/const ScenarioPage = lazy\(/);
    expect(appSource).toMatch(/const VmLabPage = lazy\(/);
    expect(appSource).not.toContain('import { ScenarioPage } from "@/pages/ScenarioPage"');
    // The only remaining "/" navigation targets are the new workbench door.
    expect(appSource).not.toMatch(/to="\/" className="wordmark"/);
  });

  it("keeps the Phase 15 block scoped and motion-safe", () => {
    expect(phase15.length).toBeGreaterThan(1000);
    expect(phase15).toContain("@layer components");
    expect(phase15).toContain("@media (prefers-reduced-motion: reduce)");

    // Phase 15B.1 permits motion, but only as lp-scoped keyframes — no
    // generic animation names could leak into the app shell.
    const keyframes = [...phase15.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(
      (m) => m[1],
    );
    expect(keyframes.length).toBeGreaterThan(0);
    expect(keyframes.every((k) => k.startsWith("lp-"))).toBe(true);

    // The reduced-motion guard must neutralise every animation and keep
    // reveal content fully visible.
    const guard = phase15.slice(
      phase15.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(guard).toContain("animation: none");
    expect(guard).toContain(".lp-reveal");
    expect(guard).toMatch(/opacity:\s*1/);
  });

  it("ships the required responsive breakpoints", () => {
    expect(phase15).toContain("@media (min-width: 1024px)");
    expect(phase15).toContain("@media (max-width: 900px)");
    expect(phase15).toContain("@media (max-width: 820px)");
    expect(phase15).toContain("@media (max-width: 640px)");
    expect(phase15).toContain("@media (max-width: 390px)");
    expect(phase15).toContain("@media (max-width: 320px)");
  });

  it("never advertises a cloud discipline in landing styles or markup", () => {
    const landingMarkup = [
      readFileSync("src/pages/LandingPage.tsx", "utf8"),
      readFileSync("src/pages/landing/landingData.ts", "utf8"),
    ].join("\n");
    expect(landingMarkup).not.toMatch(/category=cloud/);
    expect(landingMarkup).not.toMatch(/id:\s*"cloud"/);
    expect(
      readFileSync("src/pages/LandingPage.tsx", "utf8"),
    ).not.toMatch(/cloud/i);
    expect(phase15).not.toMatch(/cloud/i);
  });
});
