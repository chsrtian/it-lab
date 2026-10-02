/**
 * Machine profile — the single authoritative description of what the
 * Linux Training Machine contains (Phase 14B-2).
 *
 * Every learner-facing hardware fact in the VM Lab UI is derived from this
 * file (strip, header and hardware inspector alike). The profile is STATIC
 * configuration; runtime state (stopped / running / paused / …) lives in
 * VmController + useVmLab and never mutates a value here.
 *
 * Every value was verified against the real guest in the 14B-1 inventory
 * (/etc/os-release, /proc/version, /proc/cpuinfo, /proc/mounts, dmesg, the
 * ISOLINUX boot chain of public/vm/linux.iso). Do not invent hardware the
 * machine does not have — the guest has NO disk image, NO network adapter
 * and NO audio device (the speaker is disabled in the emulator options).
 */

export type VmHardwareId =
  | "cpu"
  | "memory"
  | "firmware"
  | "storage"
  | "cdrom"
  | "display"
  | "keyboard"
  | "mouse"
  | "network";

export interface VmHardwareItem {
  readonly id: VmHardwareId;
  /** Equipment label used in the hardware inspector. */
  readonly label: string;
  /** Verified headline value, shown as-is in the UI. */
  readonly value: string;
  /** Beginner-facing explanation: what this is and why the machine has it. */
  readonly detail: string;
}

export interface VmProfile {
  /** Stable machine identity (storage namespace is derived from it). */
  readonly id: string;
  /** Short tag shown in the machine header. */
  readonly tag: string;
  /** Learner-facing machine name. */
  readonly name: string;
  /** Verified guest operating system facts. */
  readonly guest: {
    readonly os: string;
    readonly kernel: string;
    readonly arch: string;
    readonly shell: string;
  };
  readonly boot: {
    /** Boot devices in configured order — only devices that exist. */
    readonly order: readonly string[];
    readonly note: string;
  };
  /** Ordered hardware inventory rendered by the inspector. */
  readonly hardware: readonly VmHardwareItem[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value as Record<string, unknown>)) {
      deepFreeze(inner);
    }
  }
  return value;
}

export const VM_PROFILE: VmProfile = deepFreeze({
  id: "vm-01",
  tag: "VM-01",
  name: "Linux Training Machine",
  guest: {
    os: "Buildroot 2013.08.1",
    kernel: "Linux 2.6.34.14",
    arch: "i686 (32-bit x86)",
    shell: "BusyBox ash (/bin/sh)",
  },
  boot: {
    order: ["CD-ROM"],
    note: "The machine has a single boot device: the CD-ROM image. No hard disk or floppy drive is attached, so every power-on boots from the CD.",
  },
  hardware: [
    {
      id: "cpu",
      label: "CPU",
      value: "Pentium III-class (emulated)",
      detail:
        "The machine's virtual processor, recreated in software by the browser emulator. The guest operating system and its programs run on it — it is not your computer's real CPU.",
    },
    {
      id: "memory",
      label: "Memory (RAM)",
      value: "64 MiB virtual RAM",
      detail:
        "RAM is the computer's short-term working memory. Programs use it while they are running. This machine's RAM is virtual — the emulator creates it for the guest.",
    },
    {
      id: "firmware",
      label: "Boot firmware",
      value: "SeaBIOS",
      detail:
        "Firmware is the first software the machine runs after power-on. It initializes the emulated hardware and then starts loading the operating system from the boot media.",
    },
    {
      id: "storage",
      label: "Storage",
      value: "RAM disk (no hard disk)",
      detail:
        "The guest has no persistent hard disk. Its filesystem lives in a RAM disk, so everything you create stays until the machine is reset — this is where storage and persistence happen.",
    },
    {
      id: "cdrom",
      label: "CD-ROM (boot media)",
      value: "linux.iso · 5.4 MB, read-only",
      detail:
        "The operating system boots from this CD-ROM image. It is read-only, so the guest can never modify the training image — every boot starts from the same clean system.",
    },
    {
      id: "display",
      label: "Display",
      value: "Virtual VGA console (80×25)",
      detail:
        "An emulated graphics card shows what the guest draws. The guest currently uses an 80×25 text console — the shell you see on the VM screen.",
    },
    {
      id: "keyboard",
      label: "Keyboard",
      value: "Emulated PS/2 keyboard",
      detail:
        "Your keystrokes are forwarded into the virtual machine, so the guest shell responds to what you type. Input stays inside the emulator.",
    },
    {
      id: "mouse",
      label: "Mouse",
      value: "Emulated PS/2 mouse",
      detail:
        "A virtual PS/2 mouse is attached to the machine; the emulator delivers pointer input to the guest.",
    },
    {
      id: "network",
      label: "Network",
      value: "Disconnected (by design)",
      detail:
        "This machine has no network adapter at all — networking is intentionally disabled, so the guest cannot reach the internet, your network, or this computer.",
    },
  ],
} satisfies VmProfile);

/** Fast id → item lookup derived from the same profile (no second source). */
export const VM_HARDWARE: Record<VmHardwareId, VmHardwareItem> = Object.freeze(
  Object.fromEntries(VM_PROFILE.hardware.map((item) => [item.id, item])) as Record<
    VmHardwareId,
    VmHardwareItem
  >,
);
