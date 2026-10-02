import { Link } from "react-router-dom";
import { BenchMark } from "@/components/BenchMark";

/**
 * `/auth` placeholder (Phase 15B). Authentication itself arrives in 15C —
 * this route exists so the landing's Sign in action has a correct target
 * instead of falling through to the 404. It collects nothing, stores
 * nothing, and never touches local progress.
 */
export function AuthPlaceholderPage() {
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
          <h1 className="t-display">Sign in</h1>
          <p className="t-body">
            Account sign-in arrives with the Supabase integration in a later Phase
            15 step. Until then the lab runs exactly as it does today — nothing
            here changes your local progress.
          </p>
          <div className="lp-hero-actions">
            <Link to="/workbench" className="btn-primary">
              Enter the lab
            </Link>
            <Link to="/" className="btn-secondary">
              Back to the lab door
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
