import { useState } from "react";
import { Link } from "react-router-dom";
import { BenchMark } from "@/components/BenchMark";
import { useAuthStore } from "@/store/auth";

/**
 * `/auth` — account access for IT Lab. Google is the single sign-in/registration
 * path: first-time users get an account on their first Continue with Google,
 * returning users get a session on the same button. Local simulator progress
 * (XP, scenarios, settings, VM state) is untouched by signing in or out.
 */
export function AuthPage() {
  const { status, user, error, signInWithGoogle, signOut, clearError } =
    useAuthStore();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  const signedIn = status === "signedIn" && user;

  return (
    <div className="lp lp--auth">
      <a href="#auth-main" className="skip-link">
        Skip to content
      </a>

      <header className="lp-head">
        <div className="lp-head-inner">
          <Link to="/" className="wordmark" aria-label="IT Lab — home">
            <BenchMark />
            <span className="wordmark-mark">IT Lab</span>
            <span className="wordmark-sub">Troubleshooting Lab</span>
          </Link>
          <div className="lp-head-actions">
            <Link to="/" className="btn-quiet">
              Back to the lab door
            </Link>
          </div>
        </div>
      </header>

      <main id="auth-main" className="lp-auth-main">
        <div className="lp-auth-card">
          {status === "loading" ? (
            <>
              <h1 className="t-display">Sign in</h1>
              <p className="t-body">Checking your session…</p>
            </>
          ) : status === "unconfigured" ? (
            <>
              <h1 className="t-display">Sign in</h1>
              <p className="lp-auth-error" role="alert">
                Accounts are not configured on this build yet. Add
                VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your
                local environment to enable Google sign-in.
              </p>
              <p className="t-body">
                The lab runs fully without an account — sign-in is optional and
                never touches your local progress.
              </p>
              <div className="lp-hero-actions">
                <Link to="/workbench" className="btn-primary">
                  Enter the lab
                </Link>
                <Link to="/" className="btn-secondary">
                  Back to the lab door
                </Link>
              </div>
            </>
          ) : signedIn ? (
            <>
              <h1 className="t-display">Signed in</h1>
              <p className="t-body">
                Signed in as <strong>{user?.email ?? "your Google account"}</strong>.
                <br />
                Local progress on this device is unaffected by sign-in or sign-out.
              </p>
              {error ? (
                <p className="lp-auth-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="lp-hero-actions">
                <Link to="/workbench" className="btn-primary">
                  Enter the lab
                </Link>
                <button type="button" className="btn-secondary" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="lp-auth-tabs" role="group" aria-label="Account mode">
                <button
                  type="button"
                  className="lp-auth-tab"
                  aria-pressed={mode === "signin"}
                  onClick={() => {
                    setMode("signin");
                    clearError();
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className="lp-auth-tab"
                  aria-pressed={mode === "register"}
                  onClick={() => {
                    setMode("register");
                    clearError();
                  }}
                >
                  Create account
                </button>
              </div>

              <h1 className="t-display">
                {mode === "signin" ? "Sign in" : "Create your account"}
              </h1>
              <p className="t-body">
                {mode === "signin"
                  ? "Welcome back. Continue with Google to open your session — the lab on this device keeps everything it has already saved."
                  : "New to IT Lab? Continue with Google once to create your account. From then on the same button signs you in — no separate password, and nothing is reset on this device."}
              </p>

              {error ? (
                <p className="lp-auth-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="lp-hero-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void signInWithGoogle()}
                >
                  Continue with Google
                </button>
                <Link to="/workbench" className="btn-secondary">
                  Continue without an account
                </Link>
              </div>
              <p className="lp-auth-note">
                One Google path for both new and returning users. We never store
                a password.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
