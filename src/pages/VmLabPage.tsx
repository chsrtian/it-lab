import { useEffect, useRef, useState } from "react";
import {
  Cpu,
  Gauge,
  HardDrive,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Power,
  RotateCcw,
  Save,
  Undo2,
} from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { VmHardwareInspector } from "@/features/vmlab/VmHardwareInspector";
import { BootSequenceExplorer } from "@/features/vmlab/BootSequenceExplorer";
import { deriveBootPresentation } from "@/features/vmlab/bootSequence";
import { VM_HARDWARE, VM_PROFILE } from "@/features/vmlab/vmProfile";
import { useVmLab, type UseVmLabOverrides } from "@/features/vmlab/useVmLab";
import type { VmStatus } from "@/features/vmlab/VmController";

const STATUS_LABEL: Record<VmStatus, string> = {
  stopped: "STOPPED",
  starting: "STARTING",
  running: "RUNNING",
  paused: "PAUSED",
  restoring: "RESTORING",
  error: "ERROR",
};

const STATUS_TONE: Record<VmStatus, StatusTone> = {
  stopped: "unknown",
  starting: "pending",
  running: "ok",
  paused: "info",
  restoring: "pending",
  error: "crit",
};

/**
 * VM Lab — the browser virtual machine. The v86 display is the hero: a real
 * emulator screen inside a training-machine bezel, with a compact control
 * deck underneath. All emulator code loads only after Start is pressed.
 */
export function VmLabPage({ deps }: { deps?: UseVmLabOverrides } = {}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const machineRef = useRef<HTMLElement>(null);
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  const vm = useVmLab(deps);
  const {
    status,
    progress,
    error,
    hasSavedState,
    boot,
    capabilities,
    start,
    pause,
    resume,
    reset,
    saveState,
    restoreState,
    goFullscreen,
  } = vm;

  const handleStart = () => {
    if (screenRef.current) void start(screenRef.current);
  };

  // v86's keyboard adapter listens on window while the machine runs and calls
  // preventDefault() on every key whose target is not an input — which would
  // swallow Tab navigation and Enter/Space activation on page controls (the
  // boot explorer's mode toggle included). This capture-phase listener runs
  // before v86's window listeners no matter when the machine was started, so
  // those keys keep their native meaning on page UI and never leak into the
  // guest. Everything else — typing, keys aimed at the guest screen — keeps
  // the original v86 behavior.
  useEffect(() => {
    const inGuestScreen = (target: Element | null): boolean =>
      target !== null && target.closest("[data-testid='vm-screen']") !== null;
    const onControl = (target: Element | null): boolean =>
      target !== null && target.closest("button, a[href], [role='button'], [tabindex]") !== null;
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (inGuestScreen(target)) return;
      const navigation = event.key === "Tab";
      const activation = (event.key === "Enter" || event.key === " ") && onControl(target);
      if (navigation || activation) event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, []);
  const handleSave = () => void saveState();
  const handleRestore = () => void restoreState(screenRef.current);
  const handleReset = () => void reset();

  const machineLive = status === "running" || status === "paused";
  const busy = status === "starting" || status === "restoring";
  const progressPct =
    progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : null;

  const showOverlay = status === "stopped" || status === "starting" || status === "error";

  const bootPresentation = deriveBootPresentation(status, boot.stage, boot.restored);

  useEffect(() => {
    const updateFullscreen = (): void => {
      setIsFullscreen(document.fullscreenElement === machineRef.current);
      if (document.fullscreenElement === machineRef.current) setFullscreenError(null);
    };
    const onFullscreenError = (): void => {
      setFullscreenError("Fullscreen was blocked by the browser. Try again from the Fullscreen button.");
      setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("fullscreenerror", onFullscreenError);
    updateFullscreen();
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("fullscreenerror", onFullscreenError);
    };
  }, []);

  const handleFullscreen = async () => {
    if (!machineLive) return;
    setFullscreenError(null);
    try {
      if (document.fullscreenElement === machineRef.current) {
        await document.exitFullscreen();
        return;
      }
      if (!machineRef.current?.requestFullscreen) {
        throw new Error("Fullscreen is not available in this browser.");
      }
      await machineRef.current.requestFullscreen();
      goFullscreen();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fullscreen could not be started.";
      setFullscreenError(message);
      setIsFullscreen(false);
    }
  };

  return (
    <div className="page vm-page">
      <header className="inset page-head">
        <h1 className="t-display">VM Lab</h1>
        <p className="page-note">
          Browser-based x86 virtual machine — an experimental lab that runs entirely in your
          browser.
        </p>
      </header>

      <div className="inset">
        <div className={`vm-workspace${hardwareOpen ? " vm-workspace--hw" : ""}`}>
          <section
            className={`vm-machine${isFullscreen ? " vm-machine--fullscreen" : ""}`}
            aria-label="Virtual training machine"
            ref={machineRef}
          >
            <div className="vm-machine__head">
              <div className="vm-machine__id">
                <span className="vm-machine__tag t-mono">{VM_PROFILE.tag}</span>
                <span className="vm-machine__name">{VM_PROFILE.name}</span>
              </div>
              <span
                className="vm-machine__status"
                role="status"
                aria-live="polite"
                data-status={status}
              >
                <StatusBadge tone={STATUS_TONE[status]} hideIcon={status === "stopped"}>
                  {STATUS_LABEL[status]}
                </StatusBadge>
              </span>
            </div>

            <div className="vm-bezel">
              <div
                className="vm-screen"
                ref={screenRef}
                data-testid="vm-screen"
                data-status={status}
              >
                {/* v86 display structure: text layer first, graphics canvas second. */}
                <div className="vm-screen-text" />
                <canvas className="vm-screen-canvas" />
              </div>

              {status === "paused" && (
                <span className="vm-overlay-badge t-mono" role="status">
                  PAUSED
                </span>
              )}
              {status === "restoring" && (
                <span className="vm-overlay-badge t-mono" role="status">
                  RESTORING STATE…
                </span>
              )}

              {showOverlay && (
                <div className="vm-overlay">
                  {status === "stopped" && (
                    <div className="vm-overlay__panel">
                      <button
                        type="button"
                        className="btn-primary vm-power-btn"
                        onClick={handleStart}
                        disabled={!capabilities.ok}
                      >
                        <Power size={16} aria-hidden />
                        Power on
                      </button>
                      <p className="vm-overlay__hint">
                        BIOS → bootloader → Linux shell — the full boot sequence is visible on
                        screen.
                      </p>
                      {!capabilities.ok && (
                        <p className="vm-overlay__warn" role="alert">
                          This browser cannot run the VM (missing: {capabilities.missing.join(", ")}
                          ).
                        </p>
                      )}
                    </div>
                  )}

                  {status === "starting" && (
                    <div className="vm-overlay__panel">
                      <p className="vm-overlay__title t-mono">
                        LOADING MACHINE…
                        {progressPct !== null && ` ${progressPct}%`}
                      </p>
                      {progress && (
                        <div
                          className="vm-progress"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progressPct ?? undefined}
                          aria-label="VM asset loading"
                        >
                          <div
                            className="vm-progress__fill"
                            style={{
                              width: progressPct !== null ? `${progressPct}%` : "30%",
                            }}
                          />
                        </div>
                      )}
                      <p className="vm-overlay__hint t-mono">
                        {progress ? progress.file : "emulator + guest image"}
                      </p>
                    </div>
                  )}

                  {status === "error" && (
                    <div className="vm-overlay__panel">
                      <p className="vm-overlay__title">{error?.message ?? "VM could not start."}</p>
                      {error?.details && (
                        <details className="vm-details">
                          <summary>Technical details</summary>
                          <pre className="t-mono">{error.details}</pre>
                        </details>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleStart}
                        disabled={!capabilities.ok}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && status !== "error" && (
              <p className="vm-inline-error" role="alert">
                {error.message}
              </p>
            )}
            {fullscreenError && (
              <p className="vm-inline-error" role="alert">
                {fullscreenError}
              </p>
            )}

            <BootSequenceExplorer presentation={bootPresentation} />

            <div className="vm-deck" role="group" aria-label="Machine controls">
              <button
                type="button"
                className="btn-primary vm-deck-btn"
                onClick={handleStart}
                disabled={status !== "stopped" && status !== "error"}
                hidden={status !== "stopped" && status !== "error"}
              >
                <Play size={14} aria-hidden />
                Start
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={() => void pause()}
                disabled={status !== "running"}
              >
                <Pause size={14} aria-hidden />
                Pause
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={() => void resume()}
                disabled={status !== "paused"}
              >
                <Play size={14} aria-hidden />
                Resume
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={handleReset}
                disabled={!machineLive}
              >
                <RotateCcw size={14} aria-hidden />
                Reset
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={handleSave}
                disabled={!machineLive}
                title="Save machine state to this browser"
              >
                <Save size={14} aria-hidden />
                Save state
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={handleRestore}
                disabled={busy || !hasSavedState || status === "error"}
                title={
                  hasSavedState
                    ? "Restore the saved machine state"
                    : "No saved state in this browser yet"
                }
              >
                <Undo2 size={14} aria-hidden />
                Restore state
              </button>
              <button
                type="button"
                className="btn-secondary vm-deck-btn"
                onClick={() => void handleFullscreen()}
                disabled={!machineLive}
              >
                {isFullscreen ? (
                  <Minimize2 size={14} aria-hidden />
                ) : (
                  <Maximize2 size={14} aria-hidden />
                )}
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            </div>

            <dl className="vm-hw">
              <div className="vm-hw__cell">
                <dt className="t-mono">CPU</dt>
                <dd>{VM_HARDWARE.cpu.value}</dd>
              </div>
              <div className="vm-hw__cell">
                <dt className="t-mono">RAM</dt>
                <dd>{VM_HARDWARE.memory.value}</dd>
              </div>
              <div className="vm-hw__cell">
                <dt className="t-mono">
                  <HardDrive size={11} aria-hidden /> DISK
                </dt>
                <dd>{VM_HARDWARE.storage.value}</dd>
              </div>
              <div className="vm-hw__cell">
                <dt className="t-mono">
                  <Gauge size={11} aria-hidden /> BOOT
                </dt>
                <dd>
                  {VM_PROFILE.boot.order[0]} · {VM_HARDWARE.firmware.value}
                </dd>
              </div>
              <div className="vm-hw__cell">
                <dt className="t-mono">NET</dt>
                <dd>{VM_HARDWARE.network.value}</dd>
              </div>
            </dl>

            <div className="vm-spec__bar">
              <button
                type="button"
                className="btn-secondary vm-spec__toggle"
                aria-expanded={hardwareOpen}
                aria-controls={hardwareOpen ? "vm-hardware-panel" : undefined}
                onClick={() => setHardwareOpen((open) => !open)}
              >
                <Cpu size={14} aria-hidden />
                Virtual hardware
              </button>
              <span className="vm-spec__hint">
                See what this machine is made of — and what each part does.
              </span>
            </div>

            <p className="vm-footnote">
              Guest commands execute inside the browser emulator, not on your computer. State is
              saved only in this browser — nothing is uploaded. Networking is disabled: the guest
              cannot reach the internet, your LAN, or this machine.
            </p>
          </section>

          {hardwareOpen && <VmHardwareInspector onClose={() => setHardwareOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

export default VmLabPage;
