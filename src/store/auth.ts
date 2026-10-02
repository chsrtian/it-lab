import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthCallbackUrl } from "@/lib/authRedirect";

export type AuthStatus = "loading" | "unconfigured" | "signedOut" | "signedIn";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;

function applySession(session: Session | null) {
  return {
    user: session?.user ?? null,
    status: session ? ("signedIn" as const) : ("signedOut" as const),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  error: null,
  initialized: false,

  initialize: async () => {
    if (useAuthStore.getState().initialized) return;
    const client = getSupabaseClient();
    if (!client) {
      set({ status: "unconfigured", user: null, initialized: true });
      return;
    }
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      set({ ...applySession(data.session), initialized: true, error: null });
    } catch {
      set({
        status: "signedOut",
        user: null,
        initialized: true,
        error: "We could not restore your session. You can still sign in below.",
      });
    }
    if (!authSubscription) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        set(applySession(session));
      });
      authSubscription = data.subscription;
    }
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const client = getSupabaseClient();
    if (!client) {
      set({
        status: "unconfigured",
        error:
          "Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your local .env file.",
      });
      return;
    }
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
      });
      if (error) throw error;
    } catch {
      set({
        error: "Google sign-in could not be started. Check your connection and Supabase Google provider configuration.",
      });
    }
  },

  signOut: async () => {
    set({ error: null });
    const client = getSupabaseClient();
    if (!client) {
      set({ status: "signedOut", user: null });
      return;
    }
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      set({ status: "signedOut", user: null });
    } catch {
      set({ error: "Sign out failed. Please try again." });
    }
  },

  clearError: () => set({ error: null }),
}));
