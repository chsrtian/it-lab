import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { getActiveDisciplines } from "./landing/landingData";
import { getScenarios } from "@/content";
import { kbArticles } from "@/content/kb/articles";

const landingSources = [
  "src/pages/LandingPage.tsx",
  "src/pages/landing/LabPreview.tsx",
  "src/pages/landing/landingData.ts",
  "src/pages/landing/motion.tsx",
  "src/pages/landing/BootTranscript.tsx",
].map((p) => readFileSync(p, "utf8"));

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("landing page — public front door", () => {
  it("states the offer in one heading and offers both doors", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Practice diagnosing real IT problems — in your browser.",
      }),
    ).toBeInTheDocument();

    const header = document.querySelector(".lp-head")!;
    const headerLinks = within(header as HTMLElement).getAllByRole("link");
    const hrefs = headerLinks.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/workbench");
    expect(hrefs).toContain("/auth");

    // Own chrome: no app shell rails on the front door.
    expect(document.querySelector(".steel-rail")).toBeNull();
    expect(document.querySelector(".rail-nav")).toBeNull();
  });

  it("adverts only the eight scenario-bearing disciplines — never Cloud", () => {
    renderLanding();

    const rows = document.querySelectorAll(".lp-disc-row");
    const disciplines = getActiveDisciplines();
    expect(rows).toHaveLength(8);
    expect(disciplines).toHaveLength(8);
    expect(disciplines.map((d) => d.id)).not.toContain("cloud");

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/cloud/i);
    expect(text).toMatch(/Hardware/);
    expect(text).toMatch(/Networking/);

    // Every count and the total come from the live catalog.
    const total = getScenarios().length;
    expect(text).toContain(`${total} incidents`);
    expect(disciplines.every((d) => d.count > 0)).toBe(true);
  });

  it("renders the method, guided example, VM facts and computed shelf", () => {
    renderLanding();

    expect(document.getElementById("method")).not.toBeNull();
    expect(document.querySelectorAll(".lp-method-step")).toHaveLength(5);

    expect(document.getElementById("guided")).not.toBeNull();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(
      screen.getByText(/Mode and ownership tell you which permission class/),
    ).toBeInTheDocument();

    expect(document.getElementById("vm")).not.toBeNull();
    // Boot transcript: the marker line from the real guest, plus the
    // profile's kernel version in the spec shelf.
    expect(screen.getByText("Linux version 2.6.34.14")).toBeInTheDocument();
    expect(screen.getByText("Linux 2.6.34.14")).toBeInTheDocument();
    expect(screen.getByText("Buildroot 2013.08.1")).toBeInTheDocument();
    expect(screen.getByText(/bootable Linux machine/i)).toBeInTheDocument();

    // Transcript shows all six stages statically (no observer in jsdom)
    // and the stage chips follow the engine's own BOOT_STAGES labels.
    const chips = document.querySelectorAll(".lp-boot li");
    expect(chips).toHaveLength(6);
    expect(
      Array.from(chips).map((li) => li.getAttribute("aria-current")),
    ).toEqual([null, null, null, null, null, "step"]);
    expect(document.body.textContent).not.toMatch(/iPXE/);

    const facts = document.querySelector(".lp-facts")!;
    expect(facts.textContent).toContain(String(getScenarios().length));
    expect(facts.textContent).toContain("On this device");
    expect(facts.textContent).toContain("Optional");

    expect(screen.getAllByText(/no account required/i).length).toBeGreaterThan(0);
  });

  it("fails open to visible sections and settles count-ups on real values", () => {
    renderLanding();

    // jsdom has no IntersectionObserver: reveals must resolve to fully
    // visible content rather than hiding behind an animation.
    expect(document.querySelectorAll(".lp-reveal.is-in")).toHaveLength(6);

    // Every count-up span carries the exact catalog number.
    const guided = getScenarios().filter((s) =>
      s.modeSupport.includes("guided"),
    ).length;
    const counts = Array.from(
      document.querySelectorAll(".lp-count"),
    ).map((n) => n.textContent);
    expect(counts).toEqual([
      String(getScenarios().length),
      String(getActiveDisciplines().length),
      String(kbArticles.length),
      String(guided),
    ]);
  });

  it("is keyboard-reachable from the first paint (skip link + landmarks)", () => {
    renderLanding();

    const skip = document.querySelector<HTMLAnchorElement>(".skip-link");
    expect(skip?.getAttribute("href")).toBe("#lp-main");
    expect(document.getElementById("lp-main")).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Page sections" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "How a case runs" }),
    ).toBeInTheDocument();
  });

  it("imports no heavy runtime and no scenario engine (source check)", () => {
    // Only import specifiers matter: prose comments may mention anything.
    const specifiers = [...landingSources.join("\n").matchAll(/from\s+"([^"]+)"/g)].map(
      (m) => m[1],
    );
    const dynamic = [...landingSources.join("\n").matchAll(/import\(\s*"([^"]+)"\s*\)/g)].map(
      (m) => m[1],
    );
    const all = [...specifiers, ...dynamic];
    expect(all.length).toBeGreaterThan(0);
    for (const forbidden of [
      "v86",
      "three",
      "xterm",
      "supabase",
      "ScenarioPage",
      "lucide",
      "framer-motion",
      "gsap",
      "animejs",
    ]) {
      expect(all.filter((s) => s.includes(forbidden))).toEqual([]);
    }
    // VM facts are pure data, not the emulator.
    expect(all).toContain("@/features/vmlab/vmProfile");
    expect(all).not.toContain("@/pages/VmLabPage");
  });
});
