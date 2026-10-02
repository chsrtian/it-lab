import { useCallback, useEffect, useState } from "react";
import wasmUrl from "v86/build/v86.wasm?url";
import {
  VmController,
  checkVmCapabilities,
  type VmAssets,
  type VmControllerDeps,
  type VmEmulatorCtor,
  type VmError,
  type VmProgress,
  type VmStateStorage,
  type VmStatus,
} from "./VmController";
import { loadV86Emulator } from "./loadV86";
import { createVmStateStorage } from "./vmStateStorage";
import type { BootObservation } from "./bootSequence";

/**
 * Default asset locations. BIOS + guest image are plain static files under
 * `public/vm/` (served verbatim by Vite/Vercel); the wasm module URL comes
 * from the installed `v86` package via Vite's asset pipeline so it can never
 * drift from the dependency version.
 */
export const DEFAULT_VM_ASSETS: VmAssets = {
  wasmUrl,
  biosUrl: "/vm/seabios.bin",
  vgaBiosUrl: "/vm/vgabios.bin",
  cdromUrl: "/vm/linux.iso",
};

export interface UseVmLabOverrides {
  loadEmulator?: () => Promise<VmEmulatorCtor>;
  assets?: VmAssets;
  storage?: VmStateStorage;
}

export interface UseVmLabResult {
  status: VmStatus;
  progress: VmProgress | null;
  error: VmError | null;
  hasSavedState: boolean;
  /** Observed boot stage (real screen output) + restore-history truth. */
  boot: BootObservation;
  capabilities: { ok: boolean; missing: string[] };
  start: (container: HTMLElement) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  saveState: () => Promise<void>;
  restoreState: (container?: HTMLElement | null) => Promise<void>;
  goFullscreen: () => void;
  dismissError: () => void;
}

/**
 * React binding for the VM runtime. The controller is created once per
 * mount and destroyed on unmount — closing the VM Lab always tears the
 * emulator down (no leaked listeners, no background CPU).
 */
export function useVmLab(overrides?: UseVmLabOverrides): UseVmLabResult {
  const [status, setStatus] = useState<VmStatus>("stopped");
  const [progress, setProgress] = useState<VmProgress | null>(null);
  const [error, setError] = useState<VmError | null>(null);
  const [hasSavedState, setHasSavedState] = useState(false);
  const [boot, setBoot] = useState<BootObservation>({ stage: null, restored: false });

  // Lazily created once per mount (React state initializer, not a ref).
  const [controller] = useState(
    () =>
      new VmController({
        loadEmulator: overrides?.loadEmulator ?? loadV86Emulator,
        assets: overrides?.assets ?? DEFAULT_VM_ASSETS,
        storage: overrides?.storage ?? createVmStateStorage(),
        onStatus: (s) => {
          setStatus(s);
          if (s === "starting") {
            setError(null);
            setProgress(null);
          }
        },
        onProgress: setProgress,
        onError: setError,
        onSavedStateChanged: setHasSavedState,
        onBootObservation: setBoot,
      } satisfies VmControllerDeps),
  );

  useEffect(() => {
    void controller.hasSavedState().then(setHasSavedState);
    return () => {
      void controller.destroy();
    };
  }, [controller]);

  const start = useCallback(
    async (container: HTMLElement) => {
      setError(null);
      setProgress(null);
      await controller.start(container);
    },
    [controller],
  );
  const pause = useCallback(async () => {
    await controller.pause();
  }, [controller]);
  const resume = useCallback(async () => {
    await controller.resume();
  }, [controller]);
  const reset = useCallback(async () => {
    setError(null);
    setProgress(null);
    await controller.reset();
  }, [controller]);
  const saveState = useCallback(async () => {
    setError(null);
    try {
      await controller.saveState();
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [controller]);
  const restoreState = useCallback(
    async (container?: HTMLElement | null) => {
      setError(null);
      setProgress(null);
      try {
        await controller.restoreState(container);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [controller],
  );
  const goFullscreen = useCallback(() => {
    controller.goFullscreen();
  }, [controller]);
  const dismissError = useCallback(() => setError(null), []);

  return {
    status,
    progress,
    error,
    hasSavedState,
    boot,
    capabilities: checkVmCapabilities(),
    start,
    pause,
    resume,
    reset,
    saveState,
    restoreState,
    goFullscreen,
    dismissError,
  };
}
