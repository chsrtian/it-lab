import { describe, expect, it } from "vitest";
import {
  createMemoryStateStorage,
  createVmStateStorage,
} from "./vmStateStorage";

function bytes(n: number, fill: number): ArrayBuffer {
  const buf = new ArrayBuffer(n);
  new Uint8Array(buf).fill(fill);
  return buf;
}

describe("VM save-state storage", () => {
  it("memory fallback saves, loads and clears a copy of the state", async () => {
    const storage = createMemoryStateStorage();
    expect(await storage.load()).toBeNull();

    const state = bytes(64, 0x11);
    await storage.save(state);
    const saved = await storage.load();
    expect(saved).not.toBeNull();
    expect(saved?.sizeBytes).toBe(64);
    expect(new Uint8Array(saved!.state)[0]).toBe(0x11);

    // The stored buffer is a copy — later mutation of the source is invisible.
    new Uint8Array(state).fill(0x22);
    const again = await storage.load();
    expect(new Uint8Array(again!.state)[0]).toBe(0x11);

    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  it("createVmStateStorage falls back to memory when IndexedDB is absent", async () => {
    // jsdom has no indexedDB — the lab must still be constructible.
    expect(typeof indexedDB).toBe("undefined");
    const storage = createVmStateStorage();
    await storage.save(bytes(8, 0x77));
    const saved = await storage.load();
    expect(saved?.sizeBytes).toBe(8);
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });
});
