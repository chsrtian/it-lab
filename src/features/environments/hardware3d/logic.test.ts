import { describe, expect, it } from "vitest";
import { getScenario } from "@/content";
import { environmentSchema } from "@/content/schema";
import { applyAction, createRun } from "@/engine";
import { buildBenchHotspot, HOTSPOT_META, type CompId } from "../benchHotspot";
import { resolveInitialView } from "./capabilities";
import { CAMERA_PRESETS, presetById, PRESET_COMPONENT } from "./presets";

describe("resolveInitialView (capability gate)", () => {
  it("forces 2D without WebGL even with a stored 3D preference", () => {
    expect(
      resolveInitialView({ webgl: false, reducedMotion: false, stored: "3d" }),
    ).toBe("2d");
    expect(
      resolveInitialView({ webgl: false, reducedMotion: false, stored: null }),
    ).toBe("2d");
  });

  it("lets an explicit user preference win when WebGL exists", () => {
    expect(
      resolveInitialView({ webgl: true, reducedMotion: true, stored: "3d" }),
    ).toBe("3d");
    expect(
      resolveInitialView({ webgl: true, reducedMotion: false, stored: "2d" }),
    ).toBe("2d");
  });

  it("defaults to 2D under reduced motion, 3D otherwise", () => {
    expect(
      resolveInitialView({ webgl: true, reducedMotion: true, stored: null }),
    ).toBe("2d");
    expect(
      resolveInitialView({ webgl: true, reducedMotion: false, stored: null }),
    ).toBe("3d");
  });
});

describe("camera presets", () => {
  it("covers the mandated view set with finite camera data", () => {
    expect(CAMERA_PRESETS.map((p) => p.id)).toEqual([
      "full",
      "front",
      "motherboard",
      "power-supply",
      "cables",
      "front-panel",
      "ram",
      "cpu-cooler",
      "storage",
    ]);
    for (const p of CAMERA_PRESETS) {
      expect(p.label.length, p.id).toBeGreaterThan(0);
      expect(p.pos.every(Number.isFinite), p.id).toBe(true);
      expect(p.target.every(Number.isFinite), p.id).toBe(true);
      expect(presetById(p.id).id, p.id).toBe(p.id);
      const dist = Math.hypot(
        p.pos[0] - p.target[0],
        p.pos[1] - p.target[1],
        p.pos[2] - p.target[2],
      );
      expect(dist, p.id).toBeGreaterThanOrEqual(0.3);
      expect(dist, p.id).toBeLessThanOrEqual(2.4);
    }
  });

  it("falls back to the full view for unknown ids", () => {
    expect(presetById("nope" as never).id).toBe("full");
  });

  it("keeps schema focus enums, presets, and hotspot components in sync", () => {
    const focusShape = environmentSchema.shape.focusTarget.unwrap().shape;
    const presetIds = CAMERA_PRESETS.map((p) => p.id);
    // Hardware presets are the leading block of the shared enum (Phase 11
    // appended equipment presets after them — equipment keeps its own sync
    // test in equipment/logic.test.ts).
    expect([...focusShape.cameraPreset.options].slice(0, presetIds.length)).toEqual(
      presetIds,
    );
    const componentOptions = new Set(focusShape.componentId.options as readonly string[]);
    for (const id of Object.keys(HOTSPOT_META)) {
      expect(componentOptions.has(id), id).toBe(true);
    }
    for (const bound of Object.values(PRESET_COMPONENT)) {
      expect(
        (focusShape.componentId.options as readonly string[]).includes(bound),
        bound,
      ).toBe(true);
    }
  });
});

describe("buildBenchHotspot (shared by SVG and 3D workbenches)", () => {
  it("projects pc-no-power bench state into inspector evidence", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    if (!scenario) return;

    let run = createRun(scenario, "guided");

    const wallBefore = buildBenchHotspot(scenario, run, "wall");
    expect(wallBefore).not.toBeNull();
    expect(wallBefore?.stateTone).toBe("crit");
    const wallEvidence = wallBefore?.evidence?.find(
      (e) => e.label === "Wall / strip power",
    );
    expect(wallEvidence?.value).toBe("fail");
    expect(wallEvidence?.tone).toBe("crit");

    run = applyAction(scenario, run, "check-wall");
    const wallAfter = buildBenchHotspot(scenario, run, "wall");
    expect(wallAfter?.stateTone).toBe("ok");

    const psu = buildBenchHotspot(scenario, run, "power-supply");
    expect(psu?.stateSummary?.toLowerCase()).toContain("standby");

    run = applyAction(scenario, run, "check-front-panel");
    run = applyAction(scenario, run, "press-power");
    const board = buildBenchHotspot(scenario, run, "motherboard");
    expect(board?.stateTone).toBe("ok");
    expect(board?.stateSummary).toBe("Healthy after POST");
  });

  it("produces a hotspot for every bench component", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const ids = Object.keys(HOTSPOT_META) as CompId[];
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      const hs = buildBenchHotspot(scenario, run, id);
      expect(hs, id).not.toBeNull();
      expect(hs?.label.length, id).toBeGreaterThan(0);
    }
  });
});
