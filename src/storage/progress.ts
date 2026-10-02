import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface ScenarioProgress {
  scenarioId: string;
  status: "in_progress" | "verified" | "completed";
  mode: string;
  hintsUsed: number;
  actionCount: number;
  startedAt: number;
  completedAt: number | null;
  bestMode?: string;
}

export interface LearnerProfile {
  id: "default";
  createdAt: number;
  completedScenarioIds: string[];
  xp: number;
}

interface LabDB extends DBSchema {
  progress: {
    key: string;
    value: ScenarioProgress;
    indexes: { "by-status": string };
  };
  profile: {
    key: string;
    value: LearnerProfile;
  };
}

let dbPromise: Promise<IDBPDatabase<LabDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LabDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LabDB>("it-simulator", 1, {
      upgrade(db) {
        const progress = db.createObjectStore("progress", { keyPath: "scenarioId" });
        progress.createIndex("by-status", "status");
        db.createObjectStore("profile", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function loadProgress(): Promise<ScenarioProgress[]> {
  try {
    const db = await getDb();
    return await db.getAll("progress");
  } catch {
    return loadProgressFallback();
  }
}

export async function saveProgress(entry: ScenarioProgress): Promise<void> {
  try {
    const db = await getDb();
    await db.put("progress", entry);
  } catch {
    saveProgressFallback(entry);
  }
}

export async function loadProfile(): Promise<LearnerProfile> {
  const fallback: LearnerProfile = {
    id: "default",
    createdAt: Date.now(),
    completedScenarioIds: [],
    xp: 0,
  };
  try {
    const db = await getDb();
    const existing = await db.get("profile", "default");
    return existing ?? fallback;
  } catch {
    return loadProfileFallback();
  }
}

export async function saveProfile(profile: LearnerProfile): Promise<void> {
  try {
    const db = await getDb();
    await db.put("profile", profile);
  } catch {
    try {
      localStorage.setItem("it-sim:profile", JSON.stringify(profile));
    } catch {
      /* ignore */
    }
  }
}

const LS_PROGRESS = "it-sim:progress";

function loadProgressFallback(): ScenarioProgress[] {
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScenarioProgress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProgressFallback(entry: ScenarioProgress): void {
  try {
    const all = loadProgressFallback().filter((p) => p.scenarioId !== entry.scenarioId);
    all.push(entry);
    localStorage.setItem(LS_PROGRESS, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function loadProfileFallback(): LearnerProfile {
  try {
    const raw = localStorage.getItem("it-sim:profile");
    if (raw) return JSON.parse(raw) as LearnerProfile;
  } catch {
    /* ignore */
  }
  return {
    id: "default",
    createdAt: Date.now(),
    completedScenarioIds: [],
    xp: 0,
  };
}
