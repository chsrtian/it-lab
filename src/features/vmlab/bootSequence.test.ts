import { describe, expect, it } from "vitest";
import {
  BOOT_COPY,
  BOOT_STAGES,
  bootStageIndex,
  createBootObserver,
  deriveBootPresentation,
  type BootStageId,
} from "./bootSequence";

/** Feed a string of printable characters into an observer. */
function feed(observer: ReturnType<typeof createBootObserver>, text: string): void {
  for (const ch of text) observer.onChar(ch);
}

describe("boot stage model (14B-3)", () => {
  it("defines six ordered stages, each with marker, what and why copy", () => {
    expect(BOOT_STAGES.map((s) => s.id)).toEqual([
      "firmware",
      "bootDevice",
      "bootloader",
      "kernel",
      "userspace",
      "ready",
    ]);
    for (const stage of BOOT_STAGES) {
      expect(stage.label.trim()).not.toBe("");
      expect(stage.marker.trim()).not.toBe("");
      expect(stage.what.trim().length).toBeGreaterThan(20);
      expect(stage.why.trim().length).toBeGreaterThan(20);
    }
    expect(BOOT_COPY.observing.trim()).not.toBe("");
    expect(BOOT_COPY.stopped.trim()).not.toBe("");
    expect(BOOT_COPY.restored).toContain("boot history unavailable");
    expect(BOOT_COPY.paused.trim()).not.toBe("");
    expect(BOOT_COPY.clue.trim()).not.toBe("");
  });

  it("markers are unique and appear in a stable order for this guest", () => {
    const markers = BOOT_STAGES.map((s) => s.marker);
    expect(new Set(markers).size).toBe(markers.length);
    // Simulated guest text containing every marker in real boot order.
    const bootLog =
      "SeaBIOS (version rel-1.16.2)\nBooting from DVD/CD...\n" +
      "ISOLINUX 5.10\nIt works!\nLoading /bzImage... ok\n" +
      "[    0.000000] Linux version 2.6.34.14 (fabian@eevee)\n" +
      "[    4.667617] VFS: Mounted root (ext2 filesystem) on device 1:0.\n" +
      "/root% ";
    const observer = createBootObserver();
    feed(observer, bootLog);
    expect(observer.stage()).toBe("ready");
  });
});

describe("boot observer (14B-3)", () => {
  it("claims stages only when their marker is actually observed", () => {
    const observer = createBootObserver();
    expect(observer.stage()).toBeNull();

    feed(observer, "SeaBIOS (version rel-1.16.2-0-gea1b7a0)");
    expect(observer.stage()).toBe("firmware");

    feed(observer, "\nBooting from DVD/CD...");
    expect(observer.stage()).toBe("bootDevice");

    feed(observer, "\nISOLINUX 5.10 2013-06-04");
    expect(observer.stage()).toBe("bootloader");

    // Partial kernel line must NOT claim the kernel (no fake states).
    feed(observer, "\n[    0.000000] Linux version");
    expect(observer.stage()).toBe("bootloader");
    feed(observer, " 2.6.34.14 (fabian@eevee)");
    expect(observer.stage()).toBe("kernel");
  });

  it("never fabricates later stages from earlier output alone", () => {
    const observer = createBootObserver();
    feed(observer, "SeaBIOS (version rel-1.16.2)\nBooting from DVD/CD...\nISOLINUX 5.10");
    expect(observer.stage()).toBe("bootloader");
    expect(observer.stage()).not.toBe("kernel");
    expect(observer.stage()).not.toBe("ready");
  });

  it("stages are sticky: markers scrolling off screen never regress state", () => {
    const observer = createBootObserver();
    feed(observer, "SeaBIOS\nBooting from DVD/CD...\nISOLINUX\nLinux version 2.6.34.14");
    expect(observer.stage()).toBe("kernel");
    // 4000 characters of later console output (scrolls everything away).
    feed(observer, "[    1.000000] x".repeat(300));
    expect(observer.stage()).toBe("kernel");
  });

  it("reset() clears every observation (fresh boot / reset / stop)", () => {
    const observer = createBootObserver();
    feed(observer, "SeaBIOS ... ISOLINUX ... Linux version 2.6.34.14 ... /root%");
    expect(observer.stage()).toBe("ready");

    observer.reset();
    expect(observer.stage()).toBeNull();

    // A new boot observes from zero again.
    feed(observer, "SeaBIOS (version rel-1.16.2)");
    expect(observer.stage()).toBe("firmware");
  });

  it("detects markers spanning the ring-buffer wrap point", () => {
    const observer = createBootObserver();
    // Fill well past the ring with filler, then a marker that straddles wrap.
    feed(observer, "x".repeat(1100));
    feed(observer, "VFS: Mount");
    feed(observer, "ed root (ext2 filesystem)");
    expect(observer.stage()).toBe("userspace");
  });

  it("ignores non-marker output and control-like characters", () => {
    const observer = createBootObserver();
    feed(observer, "random console output without any known marker\n\r\t");
    expect(observer.stage()).toBeNull();
  });
});

describe("boot presentation derivation (14B-3)", () => {
  it("maps runtime status to honest presentation states", () => {
    expect(deriveBootPresentation("stopped", null, false)).toEqual({
      kind: "stopped",
    });
    expect(deriveBootPresentation("error", null, false)).toEqual({
      kind: "stopped",
    });
    // Running with no observation yet — the honest fallback, not a stage.
    expect(deriveBootPresentation("running", null, false)).toEqual({
      kind: "booting",
      stage: null,
    });
    expect(deriveBootPresentation("starting", null, false)).toEqual({
      kind: "booting",
      stage: null,
    });
    expect(deriveBootPresentation("running", "kernel", false)).toEqual({
      kind: "booting",
      stage: "kernel",
    });
    expect(deriveBootPresentation("running", "ready", false)).toEqual({
      kind: "ready",
    });
    expect(deriveBootPresentation("paused", "kernel", false)).toEqual({
      kind: "paused",
      stage: "kernel",
    });
    expect(deriveBootPresentation("paused", null, false)).toEqual({
      kind: "paused",
      stage: null,
    });
  });

  it("restore always wins: boot history is never fabricated", () => {
    for (const status of ["starting", "running", "paused", "restoring"] as const) {
      for (const stage of [null, "firmware", "ready"] as const) {
        expect(deriveBootPresentation(status, stage, true)).toEqual({
          kind: "restored",
        });
      }
    }
  });

  it("bootStageIndex resolves every stage id and null", () => {
    const ids: BootStageId[] = ["firmware", "bootDevice", "bootloader", "kernel", "userspace", "ready"];
    expect(ids.map(bootStageIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(bootStageIndex(null)).toBe(-1);
  });
});
