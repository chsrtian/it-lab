import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthCallbackPage } from "./AuthCallbackPage";
import { useAuthStore } from "@/store/auth";

const mocks = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      exchangeCodeForSession: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => mocks.client,
}));

function renderCallback(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/workbench" element={<div>WORKBENCH_OK</div>} />
        <Route path="/auth" element={<div>AUTH_OK</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: "loading", user: null, error: null, initialized: false });
  mocks.client = null;
});

describe("/auth/callback", () => {
  it("exchanges the OAuth code, signs in, and lands on the workbench", async () => {
    mocks.client = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: "new.user@example.com" } } },
          error: null,
        }),
      },
    };
    renderCallback("/auth/callback?code=pkce-code-123");

    await waitFor(() =>
      expect(screen.getByText("WORKBENCH_OK")).toBeInTheDocument(),
    );
    expect(mocks.client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "pkce-code-123",
    );
    expect(useAuthStore.getState().status).toBe("signedIn");
    expect(useAuthStore.getState().user?.email).toBe("new.user@example.com");
  });

  it("shows a readable error when the exchange fails", async () => {
    mocks.client = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: new Error("expired"),
        }),
        getSession: vi.fn(),
      },
    };
    renderCallback("/auth/callback?code=bad-code");
    expect(
      await screen.findByText(/could not be completed/i),
    ).toBeInTheDocument();
  });

  it("handles a cancelled Google login gracefully", async () => {
    mocks.client = null;
    renderCallback("/auth/callback?error=access_denied&error_description=denied");
    expect(
      await screen.findByText(/cancelled or denied/i),
    ).toBeInTheDocument();
  });

  it("explains when the session cannot be confirmed", async () => {
    mocks.client = {
      auth: {
        exchangeCodeForSession: vi.fn(),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    };
    renderCallback("/auth/callback");
    expect(
      await screen.findByText(/could not confirm your sign-in/i),
    ).toBeInTheDocument();
  });

  it("reports missing configuration instead of a blank page", async () => {
    mocks.client = null;
    renderCallback("/auth/callback?code=abc");
    expect(
      await screen.findByText(/not configured/i),
    ).toBeInTheDocument();
  });
});
