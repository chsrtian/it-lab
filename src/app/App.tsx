import { Suspense, lazy, useEffect, useMemo } from "react";
import { NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useProgressStore } from "@/store/progress";
import { useAuthStore } from "@/store/auth";
import { getScenarios } from "@/content";
import { BenchMark } from "@/components/BenchMark";
import { LandingPage } from "@/pages/LandingPage";
import { AuthPage } from "@/pages/AuthPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { HomePage } from "@/pages/HomePage";
import { CatalogPage } from "@/pages/CatalogPage";
import { KbPage } from "@/pages/KbPage";
import { KbArticlePage } from "@/pages/KbArticlePage";
import { ProgressPage } from "@/pages/ProgressPage";
import { SettingsPage } from "@/pages/SettingsPage";

// VM Lab and the scenario workspace are heavyweight features: their pages
// (and everything they pull in — the v86 emulator, xterm, the 3D stages)
// must never be part of the entry bundle, so the public landing page loads
// none of them.
const VmLabPage = lazy(() => import("@/pages/VmLabPage"));
const ScenarioPage = lazy(() =>
  import("@/pages/ScenarioPage").then((m) => ({ default: m.ScenarioPage })),
);

/**
 * Product shell: two graphite steel rails clamping the bench floor. The
 * active section is marked with `aria-current`, a lifted background and a
 * signal rule — never colour alone. The landing page and auth pages
 * render outside this shell; every workbench section runs under it.
 */
const nav = [
  { to: "/workbench", label: "Workbench", end: true },
  { to: "/labs", label: "Labs", end: false },
  { to: "/kb", label: "Knowledge", end: false },
  { to: "/progress", label: "Progress", end: false },
  { to: "/vm-lab", label: "VM Lab", end: false },
  { to: "/settings", label: "Settings", end: false },
];

function Shell() {
  const { pathname } = useLocation();
  const xp = useProgressStore((s) => s.profile?.xp ?? 0);
  const verified = useProgressStore(
    (s) => s.profile?.completedScenarioIds.length ?? 0,
  );
  const total = useMemo(() => getScenarios().length, []);
  const authStatus = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);
  // Simulation workspace: break out of the content column so the environment
  // gets the full viewport width (scenario-first composition).
  const isWorkspace = pathname.startsWith("/lab/");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="steel-rail steel-rail--top">
        <div className="rail-inner">
          <NavLink to="/workbench" className="wordmark" aria-label="IT Lab — workbench">
            <BenchMark />
            <span className="wordmark-mark">IT Lab</span>
            <span className="wordmark-sub hidden xl:inline">Troubleshooting Lab</span>
          </NavLink>

          <nav className="rail-nav" aria-label="Primary">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="rail-nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="rail-readout hidden md:flex">
            <span className="state-mark state-mark--verified">Verified</span>
            <span className="rail-readout-val">
              {verified}/{total}
            </span>
            <span className="rail-readout-val">{xp} XP</span>
          </div>

          <div className="rail-auth">
            {authStatus === "signedIn" ? (
              <button
                type="button"
                className="btn-quiet"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            ) : (
              <NavLink to="/auth" className="btn-quiet">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={isWorkspace ? "flex-1 w-full" : "shell flex-1 w-full"}
      >
        <Outlet />
      </main>

      <footer className="steel-rail steel-rail--bottom">
        <div className="rail-inner">
          <span className="rail-foot">
            Local-first simulator — terminal input is an allowlist; no host commands run.
          </span>
          <span className="rail-foot rail-foot--end">IT Problem-Solving Simulator</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const hydrate = useProgressStore((s) => s.hydrate);
  const initAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<Shell />}>
        <Route path="/workbench" element={<HomePage />} />
        <Route path="/labs" element={<CatalogPage />} />
        <Route
          path="/lab/:scenarioId"
          element={
            <Suspense
              fallback={
                <div className="page">
                  <div className="inset">
                    <p className="page-note t-mono">Loading lab…</p>
                  </div>
                </div>
              }
            >
              <ScenarioPage />
            </Suspense>
          }
        />
        <Route path="/kb" element={<KbPage />} />
        <Route path="/kb/:articleId" element={<KbArticlePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route
          path="/vm-lab"
          element={
            <Suspense
              fallback={
                <div className="page">
                  <div className="inset">
                    <p className="page-note t-mono">Loading VM Lab…</p>
                  </div>
                </div>
              }
            >
              <VmLabPage />
            </Suspense>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <div className="page">
              <div className="inset">
                <div className="empty-state items-start">
                  <h1 className="t-title">No such bench</h1>
                  <p className="t-body">
                    That address does not match a workbench section or a lab.
                  </p>
                  <NavLink className="link" to="/workbench">
                    Back to workbench
                  </NavLink>
                </div>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
