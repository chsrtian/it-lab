import { openDB, type IDBPDatabase } from "idb";
import type { SavedVmState, VmStateStorage } from "./VmController";

const DB_NAME = "itlab-vm-lab";
const STORE = "vm-state";
const KEY = "vm-01";

interface StoredRow {
  id: string;
  state: ArrayBuffer;
  savedAt: number;
  sizeBytes: number;
}

/**
 * Local-only save/restore storage. Prefers IndexedDB (browser-local, no
 * account, no server). Falls back to an in-memory store when IndexedDB is
 * unavailable (private-mode edge cases, jsdom tests) so the lab still runs —
 * with the documented limitation that state then lives only for the session.
 */
export function createVmStateStorage(): VmStateStorage {
  if (typeof indexedDB === "undefined") return createMemoryStateStorage();
  try {
    const dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
    return createIndexedDbStorage(dbPromise);
  } catch {
    return createMemoryStateStorage();
  }
}

function createIndexedDbStorage(dbPromise: Promise<IDBPDatabase>): VmStateStorage {
  return {
    async save(state: ArrayBuffer) {
      const db = await dbPromise;
      const row: StoredRow = {
        id: KEY,
        // structured-clone a copy: the caller's buffer may be reused.
        state: state.slice(0),
        savedAt: Date.now(),
        sizeBytes: state.byteLength,
      };
      await db.put(STORE, row);
    },
    async load() {
      const db = await dbPromise;
      const row = (await db.get(STORE, KEY)) as StoredRow | undefined;
      if (!row) return null;
      const saved: SavedVmState = {
        state: row.state,
        savedAt: row.savedAt,
        sizeBytes: row.sizeBytes,
      };
      return saved;
    },
    async clear() {
      const db = await dbPromise;
      await db.delete(STORE, KEY);
    },
  };
}

export function createMemoryStateStorage(): VmStateStorage {
  let saved: SavedVmState | null = null;
  return {
    async save(state) {
      saved = {
        state: state.slice(0),
        savedAt: Date.now(),
        sizeBytes: state.byteLength,
      };
    },
    async load() {
      return saved;
    },
    async clear() {
      saved = null;
    },
  };
}
