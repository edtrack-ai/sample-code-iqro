import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiRoadmap } from "./api";

interface RoadmapStore {
  activeRoadmap: ApiRoadmap | null;
  savedRoadmaps: ApiRoadmap[];
  setActiveRoadmap: (roadmap: ApiRoadmap | null) => void;
  saveRoadmap: (roadmap: ApiRoadmap) => void;
  updateRoadmap: (roadmap: ApiRoadmap) => void;
  removeRoadmap: (id: number) => void;
  clearStore: () => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      activeRoadmap: null,
      savedRoadmaps: [],
      setActiveRoadmap: (roadmap) => set({ activeRoadmap: roadmap }),
      saveRoadmap: (roadmap) => {
        const existing = get().savedRoadmaps;
        const idx = existing.findIndex((r) => r.id === roadmap.id);
        if (idx >= 0) {
          const updated = [...existing];
          updated[idx] = roadmap;
          set({ savedRoadmaps: updated });
        } else {
          set({ savedRoadmaps: [...existing, roadmap] });
        }
      },
      updateRoadmap: (roadmap) => {
        const existing = get().savedRoadmaps;
        const idx = existing.findIndex((r) => r.id === roadmap.id);
        if (idx >= 0) {
          const updated = [...existing];
          updated[idx] = roadmap;
          set({ savedRoadmaps: updated, activeRoadmap: roadmap });
        }
      },
      removeRoadmap: (id) =>
        set((s) => ({
          savedRoadmaps: s.savedRoadmaps.filter((r) => r.id !== id),
          activeRoadmap: s.activeRoadmap?.id === id ? null : s.activeRoadmap,
        })),
      clearStore: () => set({ activeRoadmap: null, savedRoadmaps: [] }),
    }),
    { name: "edtrack-roadmaps" }
  )
);
