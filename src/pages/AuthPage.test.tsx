import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "./AuthPage";
import { useAuthStore } from "@/store/auth";

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: "signedOut", user: null, error: null, initialized: true });
});

describe("/auth page", () => {
  it("renders the sign-in state with the Google action", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("switches to the create-account state", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/New to IT Lab/i)).toBeInTheDocument();
  });

  it("explains that new users register through the same Google button", () => {
    renderPage();
    expect(
      screen.getByText(/One Google path for both new and returning users/i),
    ).toBeInTheDocument();
  });

  it("shows a configuration message when Supabase env values are missing", () => {
    useAuthStore.setState({ status: "unconfigured", user: null, error: null });
    renderPage();
    expect(
      screen.getByText(/Accounts are not configured on this build yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Enter the lab" }),
    ).toHaveAttribute("href", "/workbench");
  });

  it("shows a loading message while the session is being checked", () => {
    useAuthStore.setState({ status: "loading", user: null, error: null });
    renderPage();
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
  });

  it("shows the signed-in state with a sign-out action", () => {
    useAuthStore.setState({
      status: "signedIn",
      user: { email: "learner@example.com" },
      error: null,
    } as never);
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Signed in" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/learner@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("shows an auth error without leaking sensitive detail", () => {
    useAuthStore.setState({
      status: "signedOut",
      user: null,
      error: "Google sign-in could not be started. Check your connection.",
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /could not be started/i,
    );
  });

  it("invokes the Google sign-in action from the primary button", async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signInWithGoogle } as never);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});
