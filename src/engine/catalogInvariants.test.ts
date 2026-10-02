import { describe, expect, it } from "vitest";
import { getScenario, getScenarios, validateContent } from "@/content";
import { deriveWorld } from "@/engine";
import { validateGuidedWalkthrough } from "@/features/guide/logic";

const DOMAIN_COUNTS: Record<string, number> = {
  hardware: 36,
  networking: 5,
  windows: 11,
  linux: 11,
  sysadmin: 10,
  database: 9,
  security: 9,
  support: 9,
};

describe("catalog invariants (Phase 13G final audit)", () => {
  const all = getScenarios();

  it("ships exactly 100 scenarios", () => {
    expect(all.length).toBe(100);
    expect(validateContent().errors).toEqual([]);
  });

  it("domain counts are exact", () => {
    const counts: Record<string, number> = {};
    for (const s of all) counts[s.category] = (counts[s.category] ?? 0) + 1;
    expect(counts).toEqual(DOMAIN_COUNTS);
  });

  it("scenario ids and ticket ids are unique", () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(100);
    expect(new Set(all.map((s) => s.ticket.id)).size).toBe(100);
  });

  it("prerequisite graph is intact, acyclic, and shallow", () => {
    const ids = new Set(all.map((s) => s.id));
    const byId = new Map(all.map((s) => [s.id, s]));
    for (const s of all) {
      for (const p of s.prerequisites) expect(ids.has(p), `${s.id} -> ${p}`).toBe(true);
    }
    // depth-limited DFS: no cycles, chain depth ≤ 6
    const memo = new Map<string, number>();
    const depth = (id: string, stack: string[]): number => {
      if (memo.has(id)) return memo.get(id)!;
      expect(stack, `cycle at ${id}`).not.toContain(id);
      const s = byId.get(id);
      if (!s || s.prerequisites.length === 0) return 0;
      let max = 0;
      for (const p of s.prerequisites) max = Math.max(max, depth(p, [...stack, id]));
      const value = max + 1;
      memo.set(id, value);
      return value;
    };
    let deepest = 0;
    for (const s of all) deepest = Math.max(deepest, depth(s.id, []));
    expect(deepest).toBeLessThanOrEqual(6);
    // every scenario is reachable as a start: either a root or behind a prereq
    const roots = all.filter((s) => s.prerequisites.length === 0);
    expect(roots.length).toBeGreaterThanOrEqual(30);
  });

  it("guided walkthrough coverage is 100/100 with real completion triggers", () => {
    let covered = 0;
    for (const s of all) {
      const walk = s.guidedWalkthrough;
      expect(walk, `${s.id} missing guided walkthrough`).toBeDefined();
      if (!walk) continue;
      covered += 1;
      expect(walk.steps.length, s.id).toBeGreaterThanOrEqual(1);
      expect(validateGuidedWalkthrough(s), s.id).toEqual([]);
      let sawDiagnosticStep = false;
      for (const step of walk.steps) {
        const action = step.actionId ? s.actions.find((a) => a.id === step.actionId) : undefined;
        if (action?.isFix) {
          expect(
            sawDiagnosticStep,
            `${s.id}/${step.id} walks to a fix before any evidence step`,
          ).toBe(true);
        }
        if (action?.isDiagnostic) sawDiagnosticStep = true;
      }
    }
    expect(covered).toBe(100);
  });

  it("all 100 seeds are stable under deriveWorld (no drift)", () => {
    for (const s of all) {
      const seeded = structuredClone(s.environment.initialWorld);
      expect(deriveWorld(seeded), s.id).toEqual(s.environment.initialWorld);
    }
  });

  it("every scenario carries diagnostics, a fix, and verification", () => {
    for (const s of all) {
      expect(s.actions.some((a) => a.isDiagnostic), `${s.id} diagnostics`).toBe(true);
      expect(s.actions.some((a) => a.isFix), `${s.id} fix`).toBe(true);
      expect(s.successConditions.length, `${s.id} successConditions`).toBeGreaterThanOrEqual(1);
      expect(s.verificationSteps.length, `${s.id} verificationSteps`).toBeGreaterThanOrEqual(1);
      expect(s.debrief.rootCause.length, `${s.id} rootCause`).toBeGreaterThan(10);
      expect(s.hypotheses.length, `${s.id} hypotheses`).toBeGreaterThanOrEqual(3);
      expect(s.knowledgeLinks.length, `${s.id} knowledgeLinks`).toBeGreaterThanOrEqual(1);
    }
  });

  it("catalog parse cost stays modest (measured, not asserted hard)", () => {
    const t0 = performance.now();
    getScenarios();
    const ms = performance.now() - t0;
    // Recorded so regressions show up in test output; generous ceiling only.
    expect(ms).toBeLessThan(1500);
  });

  it("known scenario spot-checks stay registered", () => {
    for (const id of [
      "pc-no-power",
      "patch-crossconnect-mislabelled",
      "db-schema-mismatch",
      "security-outbound-beacon",
      "support-dock-peripherals",
    ]) {
      expect(getScenario(id), id).toBeDefined();
    }
  });
});
