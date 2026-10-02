import { describe, expect, it, vi } from "vitest";
import {
  VmController,
  type VmAssets,
  type VmControllerDeps,
} from "./VmController";
import { createFakeVm } from "./fakeEmulator";

const ASSETS: VmAssets = {
  wasmUrl: "/test/v86.wasm",
  biosUrl: "/test/seabios.bin",
  vgaBiosUrl: "/test/vgabios.bin",
  cdromUrl: "/test/linux.iso",
};

function setup(overrides: Partial<VmControllerDeps> = {}) {
  const fake = createFakeVm();
  const onStatus = vi.fn();
  const onError = vi.fn();
  const onProgress = vi.fn();
  const onSavedStateChanged = vi.fn();
  const onBootObservation = vi.fn();
  const controller = new VmController({
    loadEmulator: async () => fake.Ctor,
    assets: ASSETS,
    storage: {
      save: vi.fn(async () => {}),
      load: vi.fn(async () => null),
      clear: vi.fn(async () => {}),
    },
    onStatus,
    onError,
    onProgress,
    onSavedStateChanged,
    onBootObservation,
    ...overrides,
  });
  return {
    controller,
    fake,
    onStatus,
    onError,
    onProgress,
    onSavedStateChanged,
    onBootObservation,
  };
}

/** Emit screen put-char events for a printable string (row 0, wrapping). */
function feedScreen(fake: ReturnType<typeof createFakeVm>, text: string): void {
  const emulator = fake.latest();
  if (!emulator) throw new Error("no emulator instance");
  let col = 0;
  for (const ch of text) {
    emulator.emit("screen-put-char", [0, col % 80, ch.charCodeAt(0)]);
    col += 1;
  }
}

function container(): HTMLElement {
  const el = document.createElement("div");
  el.className = "vm-screen";
  return el;
}

async function waitForStatus(
  controller: VmController,
  status: string,
): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (controller.getStatus() === status) return;
    await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error(`status never became ${status}; now ${controller.getStatus()}`);
}

describe("VmController — lifecycle adapter", () => {
  it("cold boots to running and reports statuses through onStatus only", async () => {
    const { controller, fake, onStatus } = setup();

    expect(controller.getStatus()).toBe("stopped");
    await controller.start(container());
    await waitForStatus(controller, "running");

    expect(onStatus).toHaveBeenCalledWith("starting");
    expect(onStatus).toHaveBeenCalledWith("running");
    expect(controller.getStatus()).toBe("running");
    expect(fake.instances).toHaveLength(1);
    expect(fake.latest()?.running).toBe(true);
  });

  it("pauses and resumes with distinct statuses", async () => {
    const { controller } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");

    await controller.pause();
    expect(controller.getStatus()).toBe("paused");

    await controller.resume();
    expect(controller.getStatus()).toBe("running");
  });

  it("RESET destroys the runtime and cold-boots a fresh machine", async () => {
    const { controller, fake } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");

    await controller.reset();
    await waitForStatus(controller, "running");

    expect(fake.instances).toHaveLength(2);
    expect(fake.instances[0].destroyed).toBe(true);
    expect(fake.instances[1].destroyed).toBe(false);
    // No leaked listeners on the discarded instance.
    expect(fake.instances[0].removeCount).toBe(fake.instances[0].addCount);
    expect(fake.instances[0].activeListenerCount).toBe(0);
  });

  it("destroy() tears the emulator down and removes every own listener", async () => {
    const { controller, fake } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");
    const emulator = fake.latest();
    const added = emulator?.addCount ?? 0;
    expect(added).toBeGreaterThan(0);

    await controller.destroy();

    expect(controller.getStatus()).toBe("stopped");
    expect(controller.hasEmulator()).toBe(false);
    expect(emulator?.destroyed).toBe(true);
    expect(emulator?.removeCount).toBe(added);
    expect(emulator?.activeListenerCount).toBe(0);
  });

  it("aborts a start that is cancelled by destroy() (no zombie emulator)", async () => {
    const fake = createFakeVm();
    let resolveLoad!: (ctor: (typeof fake.Ctor)) => void;
    const loadPromise = new Promise<(typeof fake.Ctor)>((r) => {
      resolveLoad = r;
    });
    const controller = new VmController({
      loadEmulator: () => loadPromise,
      assets: ASSETS,
      storage: {
        save: async () => {},
        load: async () => null,
        clear: async () => {},
      },
    });

    const starting = controller.start(container());
    await controller.destroy();
    resolveLoad(fake.Ctor);
    await starting;

    expect(fake.instances).toHaveLength(0);
    expect(controller.getStatus()).toBe("stopped");
    expect(controller.hasEmulator()).toBe(false);
  });

  it("surfaces a friendly error when the emulator module fails to load", async () => {
    const { controller, onError, onStatus } = setup({
      loadEmulator: async () => {
        throw new Error("wasm boom");
      },
    });

    await controller.start(container());

    expect(controller.getStatus()).toBe("error");
    expect(onError).toHaveBeenCalledWith({
      message:
        "VM could not start. The emulator or guest image failed to initialize.",
      details: "Error: wasm boom",
    });
    expect(onStatus).toHaveBeenCalledWith("error");
  });

  it("forwards download progress and reports download errors", async () => {
    const { controller, fake, onProgress, onError } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");

    fake.latest()?.emit("download-progress", {
      file_name: "linux.iso",
      loaded: 512,
      total: 1024,
    });
    expect(onProgress).toHaveBeenCalledWith({
      file: "linux.iso",
      loaded: 512,
      total: 1024,
    });

    fake.latest()?.emit("download-error", { file_name: "v86.wasm" });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("asset failed to load"),
        details: "download-error: v86.wasm",
      }),
    );
  });

  it("save state persists through storage and notifies availability", async () => {
    const save = vi.fn(async (_state: ArrayBuffer) => {});
    const { controller, onSavedStateChanged } = setup({
      storage: { save, load: async () => null, clear: async () => {} },
    });
    await controller.start(container());
    await waitForStatus(controller, "running");

    await controller.saveState();

    expect(save).toHaveBeenCalledTimes(1);
    expect(onSavedStateChanged).toHaveBeenCalledWith(true);
  });

  it("RESTORE on a live machine calls restore_state with the stored bytes", async () => {
    const stored = new ArrayBuffer(16);
    const { controller, fake } = setup({
      storage: { save: async () => {}, load: async () => ({ state: stored, savedAt: 1, sizeBytes: 16 }), clear: async () => {} },
    });
    await controller.start(container());
    await waitForStatus(controller, "running");

    await controller.restoreState();

    expect(fake.latest()?.receivedState).toBe(stored);
    expect(controller.getStatus()).toBe("running");
  });

  it("RESTORE while stopped cold-boots seeded with the stored state", async () => {
    const stored = new ArrayBuffer(16);
    const { controller, fake } = setup({
      storage: { save: async () => {}, load: async () => ({ state: stored, savedAt: 1, sizeBytes: 16 }), clear: async () => {} },
    });
    const el = container();
    await controller.start(el);
    await waitForStatus(controller, "running");
    await controller.destroy();

    await controller.restoreState();
    await waitForStatus(controller, "running");

    expect(fake.instances).toHaveLength(2);
    expect(fake.latest()?.options.initial_state).toEqual({ buffer: stored });
  });

  it("RESTORE on a freshly loaded page (no prior start) uses the passed screen container", async () => {
    const stored = new ArrayBuffer(16);
    const { controller, fake } = setup({
      storage: { save: async () => {}, load: async () => ({ state: stored, savedAt: 1, sizeBytes: 16 }), clear: async () => {} },
    });
    const el = container();

    await controller.restoreState(el);
    await waitForStatus(controller, "running");

    expect(fake.instances).toHaveLength(1);
    expect(fake.latest()?.options.initial_state).toEqual({ buffer: stored });
    expect((fake.latest()?.options.screen as { container?: HTMLElement })?.container).toBe(el);
  });

  it("RESTORE with no container and no prior start fails with a clear message", async () => {
    const { controller } = setup({
      storage: { save: async () => {}, load: async () => ({ state: new ArrayBuffer(4), savedAt: 1, sizeBytes: 4 }), clear: async () => {} },
    });
    await expect(controller.restoreState()).rejects.toThrow("Open the machine");
  });

  it("reports restore failure as an error status", async () => {
    const { controller, fake, onError } = setup({
      storage: {
        save: async () => {},
        load: async () => ({ state: new ArrayBuffer(8), savedAt: 1, sizeBytes: 8 }),
        clear: async () => {},
      },
    });
    await controller.start(container());
    await waitForStatus(controller, "running");
    fake.latest()!.restoreShouldFail = true;

    await expect(controller.restoreState()).rejects.toThrow("restore exploded");
    expect(controller.getStatus()).toBe("error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Reset the machine") }),
    );
  });

  it("builds options for a disconnected guest (networking is absent by contract)", async () => {
    const { controller } = setup();
    const options = controller.buildOptions(container()) as Record<string, unknown>;

    expect(options.net_device).toBeUndefined();
    expect(options.network_relay_url).toBeUndefined();
    expect(Object.keys(options)).not.toContain("net_device");
    expect(options).toMatchObject({
      wasm_path: ASSETS.wasmUrl,
      bios: { url: ASSETS.biosUrl },
      vga_bios: { url: ASSETS.vgaBiosUrl },
      cdrom: { url: ASSETS.cdromUrl },
      memory_size: 64 * 1024 * 1024,
      autostart: true,
    });
    expect((options.screen as { container?: HTMLElement }).container).toBeTruthy();
  });

  it("save before the machine exists fails with a clear message", async () => {
    const { controller } = setup();
    await expect(controller.saveState()).rejects.toThrow("must be running");
  });

  it("hasSavedState reflects the storage", async () => {
    const { controller } = setup({
      storage: {
        save: async () => {},
        load: async () => ({ state: new ArrayBuffer(4), savedAt: 1, sizeBytes: 4 }),
        clear: async () => {},
      },
    });
    expect(await controller.hasSavedState()).toBe(true);
  });
});

describe("VmController — boot observation (14B-3)", () => {
  it("observes real screen output and emits only genuine stage changes", async () => {
    const { controller, fake, onBootObservation } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");

    // Fresh boot: nothing observed yet, history known (not restored).
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: false,
    });

    feedScreen(fake, "SeaBIOS (version rel-1.16.2)");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "firmware",
      restored: false,
    });

    // No re-emit when later output matches no new stage.
    const calls = onBootObservation.mock.calls.length;
    feedScreen(fake, "\nrandom console noise");
    expect(onBootObservation).toHaveBeenCalledTimes(calls);

    feedScreen(fake, "\nBooting from DVD/CD...\nISOLINUX 5.10");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "bootloader",
      restored: false,
    });
    // Non-printable characters are ignored entirely.
    feedScreen(fake, "\u0007\u001b[0m");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "bootloader",
      restored: false,
    });
  });

  it("collapses consecutive duplicate cell writes (guest double-writes the prompt)", async () => {
    const { controller, fake, onBootObservation } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");

    feedScreen(
      fake,
      "SeaBIOS ... ISOLINUX ... Linux version 2.6.34.14 ... VFS: Mounted root",
    );
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "userspace",
      restored: false,
    });

    // The real guest rewrites every prompt cell twice in a row
    // (observed as (24,0,'/'), (24,0,'/'), (24,1,'r'), (24,1,'r') …).
    // Identical consecutive writes carry no new state and must not split
    // the marker string the observer matches against.
    const emulator = fake.latest();
    if (!emulator) throw new Error("no emulator instance");
    const prompt = "/root%";
    for (let i = 0; i < prompt.length; i++) {
      const ch = prompt.charCodeAt(i);
      emulator.emit("screen-put-char", [24, i, ch]);
      emulator.emit("screen-put-char", [24, i, ch]);
    }
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "ready",
      restored: false,
    });
  });

  it("RESTORE marks boot history unknown and stops claiming stages", async () => {
    const stored = new ArrayBuffer(16);
    const { controller, fake, onBootObservation } = setup({
      storage: {
        save: async () => {},
        load: async () => ({ state: stored, savedAt: 1, sizeBytes: 16 }),
        clear: async () => {},
      },
    });
    await controller.start(container());
    await waitForStatus(controller, "running");
    feedScreen(fake, "SeaBIOS (version rel-1.16.2)");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "firmware",
      restored: false,
    });

    await controller.restoreState();
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: true,
    });

    // Even a prompt on the restored screen claims nothing (history unknown).
    feedScreen(fake, "/root%");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: true,
    });
  });

  it("a failed restore drops the restore flag (no false 'restored' claim)", async () => {
    const { controller, fake, onBootObservation } = setup({
      storage: {
        save: async () => {},
        load: async () => ({ state: new ArrayBuffer(8), savedAt: 1, sizeBytes: 8 }),
        clear: async () => {},
      },
    });
    await controller.start(container());
    await waitForStatus(controller, "running");
    fake.latest()!.restoreShouldFail = true;

    await expect(controller.restoreState()).rejects.toThrow("restore exploded");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: false,
    });
  });

  it("RESET clears the observation so the next boot re-observes from zero", async () => {
    const { controller, fake, onBootObservation } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");
    feedScreen(fake, "SeaBIOS ... ISOLINUX ... Linux version 2.6.34.14");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "kernel",
      restored: false,
    });

    await controller.reset();
    await waitForStatus(controller, "running");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: false,
    });
    expect(fake.instances).toHaveLength(2);

    // Fresh instance, only firmware output so far — never the old kernel stage.
    feedScreen(fake, "SeaBIOS (version rel-1.16.2)");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "firmware",
      restored: false,
    });
  });

  it("destroy() reports a cleared observation (unmount leaves nothing stale)", async () => {
    const { controller, fake, onBootObservation } = setup();
    await controller.start(container());
    await waitForStatus(controller, "running");
    feedScreen(fake, "SeaBIOS ... ISOLINUX");
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: "bootloader",
      restored: false,
    });

    await controller.destroy();
    expect(onBootObservation).toHaveBeenLastCalledWith({
      stage: null,
      restored: false,
    });
    expect(fake.latest()?.activeListenerCount).toBe(0);
  });
});
