import { create } from "zustand";
import {
  getDb,
  loadProfile,
  loadProgress,
  saveProfile,
  saveProgress,
  type LearnerProfile,
  type ScenarioProgress,
} from "@/storage/progress";

export const EMPTY_IDS: readonly string[] = [];

interface ProgressState {
  profile: LearnerProfile | null;
  scenarios: Record<string, ScenarioProgress>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  recordRun: (entry: ScenarioProgress) => Promise<void>;
  resetProgress: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  profile: null,
  scenarios: {},
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const [profile, list] = await Promise.all([loadProfile(), loadProgress()]);
    const map: Record<string, ScenarioProgress> = {};
    for (const item of list) map[item.scenarioId] = item;
    set({ profile, scenarios: map, hydrated: true });
  },
  recordRun: async (entry) => {
    const prevProfile = get().profile ?? {
      id: "default" as const,
      createdAt: Date.now(),
      completedScenarioIds: [],
      xp: 0,
    };
    const completed =
      entry.status === "completed" || entry.status === "verified"
        ? prevProfile.completedScenarioIds
        : prevProfile.completedScenarioIds;
    const isNewComplete =
      (entry.status === "completed" || entry.status === "verified") &&
      !completed.includes(entry.scenarioId);

    const profile: LearnerProfile = {
      ...prevProfile,
      completedScenarioIds: isNewComplete
        ? [...completed, entry.scenarioId]
        : completed,
      xp: prevProfile.xp + (isNewComplete ? 50 : 0),
    };

    set((state) => ({
      profile,
      scenarios: { ...state.scenarios, [entry.scenarioId]: entry },
    }));
    await Promise.all([saveProgress(entry), saveProfile(profile)]);
  },
  resetProgress: async () => {
    const profile: LearnerProfile = {
      id: "default",
      createdAt: Date.now(),
      completedScenarioIds: [],
      xp: 0,
    };
    set({ profile, scenarios: {} });
    await saveProfile(profile);
    try {
      localStorage.removeItem("it-sim:progress");
    } catch {
      /* ignore */
    }
    try {
      const db = await getDb();
      await db.clear("progress");
    } catch {
      /* ignore */
    }
  },
}));
