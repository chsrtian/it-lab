import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./auth";

const mocks = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
      signInWithOAuth: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => mocks.client,
}));

function makeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
  };
}

beforeEach(() => {
  useAuthStore.setState({ status: "loading", user: null, error: null, initialized: false });
  localStorage.clear();
  mocks.client = null;
});

describe("auth store", () => {
  it("marks the build unconfigured when env values are missing", async () => {
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("unconfigured");
    expect(useAuthStore.getState().initialized).toBe(true);
  });

  it("initializes signed out when no session is restored", async () => {
    mocks.client = makeClient();
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(mocks.client.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it("restores a signed-in session on load", async () => {
    mocks.client = makeClient({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { email: "learner@example.com" } } },
        error: null,
      }),
    });
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("signedIn");
    expect(useAuthStore.getState().user?.email).toBe("learner@example.com");
  });

  it("surfaces a session restore failure without crashing", async () => {
    mocks.client = makeClient({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: new Error("boom"),
      }),
    });
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().error).toMatch(/could not restore/i);
  });

  it("starts Google OAuth with the environment-aware callback URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    mocks.client = makeClient({ signInWithOAuth });
    await useAuthStore.getState().signInWithGoogle();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });

  it("reports an error instead of crashing when OAuth cannot start", async () => {
    mocks.client = makeClient({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: {},
        error: new Error("provider off"),
      }),
    });
    await useAuthStore.getState().signInWithGoogle();
    expect(useAuthStore.getState().error).toMatch(/could not be started/i);
  });

  it("reports a clear error when Supabase is not configured", async () => {
    await useAuthStore.getState().signInWithGoogle();
    expect(useAuthStore.getState().status).toBe("unconfigured");
    expect(useAuthStore.getState().error).toMatch(/not configured/i);
  });

  it("signs out without touching local simulator progress", async () => {
    localStorage.setItem(
      "it-sim:profile",
      JSON.stringify({ id: "default", createdAt: 1, completedScenarioIds: ["pc-no-power"], xp: 50 }),
    );
    mocks.client = makeClient();
    await useAuthStore.getState().initialize();
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().user).toBeNull();
    expect(mocks.client.auth.signOut).toHaveBeenCalled();
    expect(localStorage.getItem("it-sim:profile")).toContain("pc-no-power");
  });

  it("keeps an error visible when sign out fails", async () => {
    mocks.client = makeClient({
      signOut: vi.fn().mockResolvedValue({ error: new Error("nope") }),
    });
    await useAuthStore.getState().initialize();
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().error).toMatch(/sign out failed/i);
  });
});
