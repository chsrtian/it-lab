import type { VmEmulatorCtor } from "./VmController";

/**
 * The only place the v86 runtime is imported. Kept as a dynamic import so the
 * emulator (libv86 + wasm fetch at construction) lives in its own chunk and is
 * never part of the entry bundle — it only loads when the learner starts a VM.
 */
export async function loadV86Emulator(): Promise<VmEmulatorCtor> {
  const mod = await import("v86");
  return mod.V86 as unknown as VmEmulatorCtor;
}
