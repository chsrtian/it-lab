import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BenchMark } from "@/components/BenchMark";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

type CallbackState =
  | { kind: "working" }
  | { kind: "error"; message: string }
  | { kind: "denial"; message: string };

/**
 * `/auth/callback` — the OAuth return route. The Supabase client is
 * configured with detectSessionInUrl, and for the PKCE flow the code in the
 * URL must be exchanged for a session. Either way we end on a confirmed
 * session (→ /workbench) or a readable error. The user never sits on a
 * blank page.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>({ kind: "working" });

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const oauthError = searchParams.get("error");
      if (oauthError) {
        const description = searchParams.get("error_description") ?? oauthError;
        setState({
          kind: "denial",
          message:
            oauthError === "access_denied"
              ? "Google sign-in was cancelled or denied. You can try again whenever you are ready."
              : `Google sign-in did not complete: ${description}`,
        });
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        setState({
          kind: "error",
          message:
            "Accounts are not configured on this build, so we could not finish signing you in. Add the Supabase environment values and try again.",
        });
        return;
      }

      try {
        const code = searchParams.get("code");
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        if (data.session) {
          useAuthStore.setState({
            user: data.session.user,
            status: "signedIn",
            initialized: true,
            error: null,
          });
          navigate("/workbench", { replace: true });
          return;
        }
        setState({
          kind: "error",
          message:
            "We could not confirm your sign-in. The link may have expired — start again from the sign-in page.",
        });
      } catch {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            "Sign-in could not be completed. Check your connection and try again from the sign-in page.",
        });
      }
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="lp lp--auth">
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

      <main className="lp-auth-main">
        <div className="lp-auth-card">
          {state.kind === "working" ? (
            <>
              <h1 className="t-display">Finishing sign-in…</h1>
              <p className="t-body">
                Confirming your Google session with IT Lab. This takes a moment.
              </p>
            </>
          ) : (
            <>
              <h1 className="t-display">Sign-in problem</h1>
              <p className="lp-auth-error" role="alert">
                {state.message}
              </p>
              <div className="lp-hero-actions">
                <Link to="/auth" className="btn-primary">
                  Back to sign in
                </Link>
                <Link to="/workbench" className="btn-secondary">
                  Continue without an account
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
