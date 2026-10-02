import type { V86Options } from "v86";
import {
  createBootObserver,
  type BootObservation,
  type BootObserver,
  type BootStageId,
} from "./bootSequence";

/**
 * Runtime status shown to the learner. Deliberately coarse — no internal
 * React state leaks into the UI.
 */
export type VmStatus =
  | "stopped"
  | "starting"
  | "running"
  | "paused"
  | "restoring"
  | "error";

export interface VmError {
  /** User-facing sentence; never a raw stack trace. */
  message: string;
  /** Optional technical detail for a collapsed <details> disclosure. */
  details?: string;
}

export interface VmProgress {
  file: string;
  loaded: number;
  total: number;
}

export interface VmAssets {
  /** URL of the v86 WebAssembly module. */
  wasmUrl: string;
  /** URL of the BIOS image (SeaBIOS). */
  biosUrl: string;
  /** URL of the VGA BIOS image. */
  vgaBiosUrl: string;
  /** URL of the read-only guest CD-ROM image. */
  cdromUrl: string;
}

/** State persisted in local browser storage (IndexedDB). */
export interface SavedVmState {
  state: ArrayBuffer;
  savedAt: number;
  sizeBytes: number;
}

export interface VmStateStorage {
  save(state: ArrayBuffer): Promise<void>;
  load(): Promise<SavedVmState | null>;
  clear(): Promise<void>;
}

/**
 * The subset of the v86 API the adapter actually uses. Structural typing so
 * tests can supply a fake without loading the real emulator.
 * Capabilities NOT used by the adapter (networking, etc.) are never exposed.
 */
export interface VmEmulator {
  run(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  save_state(): Promise<ArrayBuffer>;
  restore_state(state: ArrayBuffer): Promise<void>;
  is_running(): boolean;
  add_listener(event: string, listener: (arg: never) => void): void;
  remove_listener(event: string, listener: (arg: never) => void): void;
  keyboard_send_text(text: string): void;
  keyboard_send_scancodes(codes: number[]): void;
  screen_go_fullscreen(): void;
}

export interface VmEmulatorCtor {
  new (options: V86Options): VmEmulator;
}

export interface VmControllerDeps {
  /** Lazily provides the emulator (real implementation: `import("v86")`). */
  loadEmulator: () => Promise<VmEmulatorCtor>;
  assets: VmAssets;
  storage: VmStateStorage;
  onStatus?: (status: VmStatus) => void;
  onProgress?: (progress: VmProgress) => void;
  onError?: (error: VmError) => void;
  /** Called whenever saved-state availability may have changed. */
  onSavedStateChanged?: (hasState: boolean) => void;
  /** Observed boot-stage changes (real screen output only, never predicted). */
  onBootObservation?: (observation: BootObservation) => void;
  /** Guest RAM in bytes (power of two). Default 64 MiB. */
  memorySize?: number;
}

export interface VmStartOptions {
  /** Restore this state instead of cold-booting (RESTORE while stopped). */
  initialState?: ArrayBuffer;
}

const FRIENDLY_START_ERROR =
  "VM could not start. The emulator or guest image failed to initialize.";

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

/**
 * VM runtime adapter — the single boundary between React UI and v86.
 *
 * Guarantees:
 * - No emulator exists until `start()`; `destroy()` ends the lifecycle and
 *   removes every listener the controller itself added.
 * - Status transitions are emitted through `onStatus` only.
 * - Options never include networking (`net_device` is intentionally absent):
 *   the 14A guest is disconnected by design.
 */
export class VmController {
  private emulator: VmEmulator | null = null;
  private status: VmStatus = "stopped";
  private container: HTMLElement | null = null;
  private startOptions: VmStartOptions = {};
  private starting = false;
  private intent: "run" | "pause" | "destroy" = "run";
  private readonly listeners: Array<{
    event: string;
    fn: (arg: never) => void;
  }> = [];

  /** Observes real guest screen output; null while no emulator exists. */
  private bootObserver: BootObserver | null = null;
  private bootStage: BootStageId | null = null;
  /** Set by a state restore: boot history for this session is unknown. */
  private bootRestored = false;
  /** Previous accepted put-char cell — consecutive rewrites are collapsed. */
  private lastPutChar: [number, number, number] | null = null;

  private readonly deps: VmControllerDeps;

  constructor(deps: VmControllerDeps) {
    this.deps = deps;
  }

  getStatus(): VmStatus {
    return this.status;
  }

  isRunning(): boolean {
    return this.emulator !== null && this.emulator.is_running();
  }

  hasEmulator(): boolean {
    return this.emulator !== null;
  }

  private setStatus(status: VmStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.deps.onStatus?.(status);
  }

  private emitBoot(): void {
    this.deps.onBootObservation?.({
      stage: this.bootStage,
      restored: this.bootRestored,
    });
  }

  private on(event: string, fn: (arg: never) => void): void {
    this.emulator?.add_listener(event, fn);
    this.listeners.push({ event, fn });
  }

  /** Build v86 options. Exported for tests (networking-absence contract). */
  buildOptions(container?: HTMLElement | null): V86Options {
    const { assets } = this.deps;
    const options: V86Options = {
      wasm_path: assets.wasmUrl,
      bios: { url: assets.biosUrl },
      vga_bios: { url: assets.vgaBiosUrl },
      cdrom: { url: assets.cdromUrl },
      memory_size: this.deps.memorySize ?? 64 * 1024 * 1024,
      autostart: true,
      disable_speaker: true,
    };
    if (container) {
      options.screen = { container, encoding: "cp437", scaling: 1 };
    }
    if (this.startOptions.initialState) {
      options.initial_state = { buffer: this.startOptions.initialState };
    }
    return options;
  }

  async start(
    container: HTMLElement,
    startOptions: VmStartOptions = {},
  ): Promise<void> {
    if (this.starting || this.emulator) return;
    this.starting = true;
    this.startOptions = startOptions;
    this.container = container;
    this.intent = "run";
    this.setStatus("starting");

    try {
      const V86 = await this.deps.loadEmulator();
      if (!this.starting) {
        // destroy() ran while the module was loading — abort quietly.
        this.setStatus("stopped");
        return;
      }
      const emulator = new V86(this.buildOptions(container));
      this.emulator = emulator;

      // Fresh boot observation: no stage history until real output appears.
      this.bootObserver = createBootObserver();
      this.bootStage = null;
      this.lastPutChar = null;
      this.emitBoot();
      this.on("screen-put-char", (arg: never) => {
        // A restored snapshot was not booted this session — never claim
        // stages we did not witness.
        if (this.bootRestored || !this.bootObserver) return;
        const ev = arg as unknown as [number, number, number];
        const [row, col, ch] = ev;
        if (typeof ch !== "number" || ch < 32 || ch > 126) return;
        // Some guest writes rewrite the same cell back-to-back (e.g. the
        // shell prompt on the last row emits every character twice). An
        // identical consecutive cell write carries no new screen state —
        // collapsing it keeps marker strings contiguous in the stream.
        const last = this.lastPutChar;
        if (last && last[0] === row && last[1] === col && last[2] === ch) return;
        this.lastPutChar = ev;
        this.bootObserver.onChar(String.fromCharCode(ch));
        const stage = this.bootObserver.stage();
        if (stage !== this.bootStage) {
          this.bootStage = stage;
          this.emitBoot();
        }
      });

      this.on("emulator-started", () => {
        if (this.intent === "run" && this.status !== "restoring") {
          this.setStatus("running");
        }
      });
      this.on("emulator-stopped", () => {
        if (this.intent === "pause") this.setStatus("paused");
        else if (this.intent === "destroy") this.setStatus("stopped");
      });
      this.on("download-progress", (arg: never) => {
        const e = arg as unknown as {
          file_name: string;
          loaded: number;
          total: number;
        };
        this.deps.onProgress?.({
          file: e.file_name,
          loaded: e.loaded,
          total: e.total,
        });
      });
      this.on("download-error", (arg: never) => {
        const e = arg as unknown as { file_name?: string };
        this.fail(
          "A VM asset failed to load. Check your connection and try again.",
          `download-error: ${e.file_name ?? "unknown file"}`,
        );
      });
    } catch (err) {
      this.fail(FRIENDLY_START_ERROR, describeError(err));
    } finally {
      this.starting = false;
    }
  }

  private fail(message: string, details?: string): void {
    // A failed start/restore never restored anything — drop the flag so the
    // boot guide reports the real (failed) state instead.
    if (this.bootRestored) {
      this.bootRestored = false;
      this.emitBoot();
    }
    this.setStatus("error");
    this.deps.onError?.({ message, details });
  }

  async pause(): Promise<void> {
    if (!this.emulator || this.status !== "running") return;
    this.intent = "pause";
    await this.emulator.stop();
    this.setStatus("paused");
  }

  async resume(): Promise<void> {
    if (!this.emulator || this.status !== "paused") return;
    this.intent = "run";
    await this.emulator.run();
    this.setStatus("running");
  }

  /**
   * Deterministic RESET: destroy the whole runtime and cold-boot a fresh
   * machine from the immutable base image (the guest disk is a read-only
   * CD-ROM, writes live only in emulator RAM, so every boot is clean).
   */
  async reset(): Promise<void> {
    const container = this.container;
    if (!container) return;
    await this.destroy();
    this.setStatus("starting");
    await this.start(container);
  }

  async saveState(): Promise<void> {
    if (!this.emulator) {
      throw new Error("The machine must be running before saving state.");
    }
    const state = await this.emulator.save_state();
    try {
      await this.deps.storage.save(state);
    } catch (err) {
      throw new Error(
        `Could not save machine state to browser storage: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { cause: err },
      );
    }
    this.deps.onSavedStateChanged?.(true);
  }

  /**
   * RESTORE SAVED STATE — distinct from RESET. Works on a live machine
   * (restore_state) and from stopped (cold start seeded with the state).
   * `container` covers restore on a freshly loaded page where this controller
   * instance has never started a machine yet.
   */
  async restoreState(container?: HTMLElement | null): Promise<void> {
    const saved = await this.deps.storage.load();
    if (!saved) throw new Error("No saved machine state exists yet.");
    // Restored snapshots arrive mid-life: boot history was never witnessed
    // this session, so stop observing and say so (cleared by fail()/destroy).
    this.bootRestored = true;
    this.bootObserver?.reset();
    this.bootStage = null;
    this.emitBoot();
    if (this.emulator) {
      this.setStatus("restoring");
      this.intent = "run";
      try {
        await this.emulator.restore_state(saved.state);
        if (!this.emulator.is_running()) await this.emulator.run();
        this.setStatus("running");
      } catch (err) {
        this.fail(
          "The saved state could not be restored. Reset the machine to keep going.",
          describeError(err),
        );
        throw err;
      }
    } else {
      const target = container ?? this.container;
      if (!target) throw new Error("Open the machine before restoring state.");
      this.setStatus("starting");
      await this.start(target, { initialState: saved.state });
    }
  }

  async hasSavedState(): Promise<boolean> {
    return (await this.deps.storage.load()) !== null;
  }

  async clearSavedState(): Promise<void> {
    await this.deps.storage.clear();
    this.deps.onSavedStateChanged?.(false);
  }

  async destroy(): Promise<void> {
    // Cancels an in-flight start() as well (no emulator yet case).
    this.starting = false;
    // A destroyed runtime observed nothing: the next boot starts the boot
    // guide from zero (also drops a pending restore flag). Cleared before the
    // no-emulator early return so the UI never keeps a stale observation.
    const bootDirty =
      this.bootObserver !== null || this.bootStage !== null || this.bootRestored;
    this.bootObserver = null;
    this.bootStage = null;
    this.bootRestored = false;
    if (bootDirty) this.emitBoot();
    const emulator = this.emulator;
    if (!emulator) return;
    this.intent = "destroy";
    this.setStatus("stopped");
    for (const { event, fn } of this.listeners) {
      emulator.remove_listener(event, fn);
    }
    this.listeners.length = 0;
    this.emulator = null;
    try {
      await emulator.stop();
    } catch {
      /* already stopped */
    }
    try {
      await emulator.destroy();
    } catch (err) {
      this.deps.onError?.({
        message: "The VM did not shut down cleanly. It has been discarded.",
        details: describeError(err),
      });
    }
  }

  sendText(text: string): void {
    this.emulator?.keyboard_send_text(text);
  }

  sendScancodes(codes: number[]): void {
    this.emulator?.keyboard_send_scancodes(codes);
  }

  goFullscreen(): void {
    this.emulator?.screen_go_fullscreen();
  }
}

/** Browser capabilities the VM Lab depends on. */
export function checkVmCapabilities(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (typeof WebAssembly === "undefined") missing.push("WebAssembly");
  if (typeof window === "undefined") missing.push("browser window");
  return { ok: missing.length === 0, missing };
}
