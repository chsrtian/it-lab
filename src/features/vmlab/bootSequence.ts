import type { VmStatus } from "./VmController";

/**
 * Phase 14B-3 — Boot Sequence Explorer: presentation model derived from
 * observed runtime output.
 *
 * The emulator stays the single source of truth. This module NEVER simulates
 * or predicts a boot: a stage is claimed only after its marker string was
 * actually seen in the guest's `screen-put-char` stream (or, for restore, the
 * truth that boot history is unknown is claimed instead).
 *
 * Marker evidence (captured from the real guest, phase 14B-3A):
 *   SeaBIOS (version rel-1.16.2-…)        → firmware      @ ~1.3 s
 *   Booting from DVD/CD...                → boot device   @ ~1.4 s
 *   ISOLINUX 5.10 … Copyright …           → bootloader    @ ~1.5 s
 *   [    0.000000] Linux version 2.6.34…  → kernel        (dmesg, first line)
 *   [    4.667617] VFS: Mounted root …    → userspace     (last kernel line)
 *   /root%                                → ready         (shell prompt)
 */

export type BootStageId =
  | "firmware"
  | "bootDevice"
  | "bootloader"
  | "kernel"
  | "userspace"
  | "ready";

/** Observation emitted by the runtime adapter toward the UI. */
export interface BootObservation {
  /** Highest stage observed this boot from real screen output, or null. */
  stage: BootStageId | null;
  /** True after a state restore — boot history for this session is unknown. */
  restored: boolean;
}

export interface BootStageDef {
  id: BootStageId;
  /** Timeline node label (rendered uppercase by CSS). */
  label: string;
  /** Substring observed in the screen put-char stream to claim this stage. */
  marker: string;
  /** "What am I seeing?" — shown while the stage is current. */
  what: string;
  /** "Why does this matter?" — troubleshooting relevance, no fault claims. */
  why: string;
}

/** Ordered boot stages as they occur on this machine. */
export const BOOT_STAGES: readonly BootStageDef[] = [
  {
    id: "firmware",
    label: "Firmware",
    marker: "SeaBIOS",
    what: "The firmware is the first software to run when the machine starts. It prepares the hardware and looks for a device it can boot.",
    why: "If nothing appears here at all, the problem is firmware or hardware — the operating system never gets a chance to start.",
  },
  {
    id: "bootDevice",
    label: "Boot device",
    marker: "Booting from DVD/CD",
    what: "The firmware has chosen where to start from — here, the read-only CD-ROM image this lab boots from.",
    why: "If no boot device is found, nothing can be loaded: check the boot media before blaming the operating system.",
  },
  {
    id: "bootloader",
    label: "Bootloader",
    marker: "ISOLINUX",
    what: "The bootloader loads the operating system kernel into memory and starts it. On this machine it reads Linux straight from the CD.",
    why: "If the bootloader fails or cannot find the kernel, Linux never begins.",
  },
  {
    id: "kernel",
    label: "Kernel",
    marker: "Linux version 2.6",
    what: "The kernel is starting up — testing memory, finding hardware, and preparing the system. These lines are its own startup report.",
    why: "Kernel messages expose hardware, driver, and filesystem problems that happen during startup.",
  },
  {
    id: "userspace",
    label: "Userspace",
    marker: "VFS: Mounted root",
    what: "The kernel has mounted the operating system files and is starting the first user programs.",
    why: "If Linux starts but the system never becomes usable, the failure is in this hand-off to user programs, not in the kernel itself.",
  },
  {
    id: "ready",
    label: "Ready",
    marker: "/root%",
    what: "The shell prompt is up — the guest operating system finished booting and is waiting for commands.",
    why: "Once the prompt appears the boot is complete; problems from here are ordinary usage questions, not startup failures.",
  },
];

/** Shared explanatory copy (kept next to the stage semantics it describes). */
export const BOOT_COPY = {
  /** Stage null while the machine runs — honest fallback (never a fake stage). */
  observing: "Booting… The virtual machine is producing startup output.",
  stopped: "The machine is off. Power it on to watch the boot sequence.",
  restored: "Restored state — boot history unavailable.",
  paused: "The machine is paused — the boot output is frozen where it is. Resume to continue.",
  /** Failure-boundary education — observed stops, not injected faults. */
  clue:
    "Where boot stops is a clue: no output at all points to firmware or hardware, " +
    "no bootloader points to the boot media, no kernel messages point to the kernel, " +
    "and kernel messages without a prompt point to startup after the kernel.",
} as const;

/**
 * Rolling observation of the guest's put-char stream.
 *
 * O(1) per character: a fixed ring holds the recent stream and each pending
 * marker is compared against the ring tail the moment its final character
 * arrives (console writes are contiguous, as captured in the 14B-3A trace).
 * Stages are sticky per boot — `reset()` (fresh boot, reset, stop) is the
 * only way observations clear.
 */
const RING_SIZE = 1024;

export interface BootObserver {
  /** Feed one character from the emulator's screen put-char stream. */
  onChar(ch: string): void;
  /** Highest stage observed this boot; null when nothing was observed. */
  stage(): BootStageId | null;
  /** Clear all observations (fresh boot / reset / stopped machine). */
  reset(): void;
}

export function createBootObserver(): BootObserver {
  const ring: string[] = new Array<string>(RING_SIZE).fill("");
  let pos = 0; // next write slot
  let size = 0; // characters held (capped at RING_SIZE)
  let matched = -1; // index of highest confirmed stage

  const tailMatches = (marker: string): boolean => {
    const n = marker.length;
    if (size < n) return false;
    for (let i = 0; i < n; i++) {
      // Walk backwards from the newest character.
      const idx = (pos - 1 - i + RING_SIZE * 2) % RING_SIZE;
      if (ring[idx] !== marker[n - 1 - i]) return false;
    }
    return true;
  };

  return {
    onChar(ch: string): void {
      ring[pos] = ch;
      pos = (pos + 1) % RING_SIZE;
      size = Math.min(size + 1, RING_SIZE);
      let best = matched;
      for (let i = matched + 1; i < BOOT_STAGES.length; i++) {
        if (tailMatches(BOOT_STAGES[i].marker)) best = i;
      }
      matched = best;
    },
    stage(): BootStageId | null {
      return matched < 0 ? null : BOOT_STAGES[matched].id;
    },
    reset(): void {
      pos = 0;
      size = 0;
      matched = -1;
      ring.fill("");
    },
  };
}

/** What the boot guide shows — derived, never simulated. */
export type BootPresentation =
  | { kind: "stopped" }
  | /** stage null = nothing observed yet (fallback copy). */
    { kind: "booting"; stage: BootStageId | null }
  | { kind: "ready" }
  | { kind: "paused"; stage: BootStageId | null }
  | { kind: "restored" };

/**
 * Pure presentation derivation: runtime status + observed stage + the
 * restore flag. No timing, no prediction — inputs only.
 */
export function deriveBootPresentation(
  status: VmStatus,
  stage: BootStageId | null,
  restored: boolean,
): BootPresentation {
  if (restored) return { kind: "restored" };
  if (status === "stopped" || status === "error") return { kind: "stopped" };
  if (status === "paused") return { kind: "paused", stage };
  if (stage === "ready") return { kind: "ready" };
  return { kind: "booting", stage };
}

/** Index of a stage in BOOT_STAGES, or -1. Exported for tests. */
export function bootStageIndex(id: BootStageId | null): number {
  return id === null ? -1 : BOOT_STAGES.findIndex((s) => s.id === id);
}
