import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userApi, type UserProfile } from "./api";
import { useRoadmapStore } from "./roadmapStore";
import { queryClient } from "./queryClient";

interface User {
  pk: number;
  email: string;
  first_name: string;
  last_name?: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  creditBalance: number;
  plan: "Free" | "Pro" | "Expert";
  planFeatures: string[];
  login: (user: User, access: string, refresh: string) => void;
  logout: () => void;
  setCreditBalance: (balance: number) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      creditBalance: 0,
      plan: "Free" as const,
      planFeatures: [] as string[],
      login: (user, accessToken, refreshToken) => {
        // Clear old cache to avoid stale query data across sessions
        queryClient.clear();
        useRoadmapStore.getState().clearStore();
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        // 1. Clear Zustand stores
        useRoadmapStore.getState().clearStore();

        // 2. Clear React Query cache
        queryClient.clear();

        // 3. Clear Local Storage
        localStorage.removeItem("edtrack-auth");
        localStorage.removeItem("edtrack-roadmaps");

        // 4. Clear browser caches to prevent stale auth headers
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          creditBalance: 0,
          plan: "Free" as const,
          planFeatures: [] as string[],
        });
      },
      setCreditBalance: (creditBalance) => set({ creditBalance }),
      fetchProfile: async () => {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const profile = await userApi.getProfile(tz);
          set({
            creditBalance: profile.credit_balance,
            plan: profile.plan,
            planFeatures: profile.plan_features ?? [],
            user: {
              pk: profile.id,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
            },
          });
        } catch {
          // Silently fail — profile fetch is best-effort
        }
      },
    }),
    { name: "edtrack-auth" }
  )
);
