import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { getScenarios } from "@/content";
import { kbArticles } from "@/content/kb/articles";
import { BenchMark } from "@/components/BenchMark";
import { SecHead } from "@/components/ui";
import { VM_PROFILE } from "@/features/vmlab/vmProfile";
import { LabPreview } from "./landing/LabPreview";
import { BootTranscript } from "./landing/BootTranscript";
import { CountUp } from "./landing/motion";
import { useReveal } from "./landing/motionHooks";
import {
  GUIDE_EXAMPLE,
  METHOD_STEPS,
  getActiveDisciplines,
} from "./landing/landingData";

/**
 * Public landing page (Phase 15B) — the front door to the laboratory.
 *
 * DISCOVER-mode composition: own header (no app rails), one interactive
 * miniature of the real product, then varied bands (method · disciplines ·
 * guided · VM · facts · entry). Every number and example is computed from
 * the live catalog; no v86, no WASM, no 3D and no scenario engine is in
 * this page's import graph.
 */

const lpNav = [
  { href: "#try", label: "Try a case" },
  { href: "#method", label: "Method" },
  { href: "#disciplines", label: "Disciplines" },
  { href: "#vm", label: "Browser VM" },
];

export function LandingPage() {
  const scenarios = useMemo(() => getScenarios(), []);
  const disciplines = useMemo(() => getActiveDisciplines(), []);
  const guidedCount = useMemo(
    () => scenarios.filter((s) => s.modeSupport.includes("guided")).length,
    [scenarios],
  );

  // Scroll reveals (once per container, never per element) — fail open to
  // fully visible content wherever the observer cannot run.
  const methodRef = useRef<HTMLOListElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const vmRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLDListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const methodReveal = useReveal(methodRef);
  const discReveal = useReveal(discRef);
  const guideReveal = useReveal(guideRef);
  const vmReveal = useReveal(vmRef);
  const factsReveal = useReveal(factsRef);
  const ctaReveal = useReveal(ctaRef);

  // Landing sits outside the app Shell, so it owns its own top-of-page
  // reset when mounted by navigation (never over an in-page anchor).
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  const memory = VM_PROFILE.hardware.find((h) => h.id === "memory")?.value ?? "";

  return (
    <div className="lp">
      <a href="#lp-main" className="skip-link">
        Skip to content
      </a>

      <header className="lp-head">
        <div className="lp-head-inner">
          <Link to="/" className="wordmark" aria-label="IT Lab — home">
            <BenchMark />
            <span className="wordmark-mark">IT Lab</span>
            <span className="wordmark-sub">Troubleshooting Lab</span>
          </Link>

          <nav className="lp-nav" aria-label="Page sections">
            {lpNav.map((item) => (
              <a key={item.href} href={item.href} className="lp-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="lp-head-actions">
            <Link to="/auth" className="btn-quiet">
              Sign in
            </Link>
            <Link to="/workbench" className="btn-primary">
              Enter the lab
            </Link>
          </div>
        </div>
      </header>

      <main id="lp-main" className="lp-main">
        {/* Hero — the statement beside the live product miniature. */}
        <section className="lp-hero" id="try" aria-labelledby="lp-title">
          <div className="inset lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="t-case lp-hero-title" id="lp-title">
                Practice diagnosing real IT problems — in your browser.
              </h1>
              <p className="t-lead lp-hero-lead">
                Collect the evidence, test a hypothesis, fix the fault, verify the
                fix. {scenarios.length} real incidents with simulated terminals,
                lab instruments and a bootable Linux machine — everything runs on
                your machine.
              </p>
              <div className="lp-hero-actions">
                <Link to="/workbench" className="btn-primary">
                  Enter the lab
                </Link>
                <Link to="/auth" className="btn-secondary">
                  Sign in
                </Link>
              </div>
              <p className="lp-hero-note">
                No account required — progress is stored on this device.
              </p>
            </div>

            <div className="lp-hero-stage">
              <LabPreview />
            </div>
          </div>
        </section>

        {/* Method — the five steps as a ruled process row, not feature cards. */}
        <section className="band band--paper" id="method" aria-labelledby="lp-method-title">
          <div className="inset">
            <SecHead
              headingId="lp-method-title"
              title="How a case runs"
              note="the method"
            />
            <ol
              className={`lp-method ${methodReveal}`}
              ref={methodRef}
            >
              {METHOD_STEPS.map((step, i) => (
                <li key={step.title} className="lp-method-step">
                  <span className="obj-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="lp-method-name">{step.title}</span>
                  <span className="lp-method-text">{step.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Disciplines — a register of what the catalog actually serves. */}
        <section
          className="lp-section"
          id="disciplines"
          aria-labelledby="lp-disciplines-title"
        >
          <div className="inset">
            <SecHead
              headingId="lp-disciplines-title"
              title="What you can practice"
              note={`${disciplines.length} disciplines · ${scenarios.length} incidents`}
              action={
                <Link className="sec-link" to="/labs">
                  All labs
                </Link>
              }
            />
            <div
              className={`ruled-list ${discReveal}`}
              ref={discRef}
            >
              {disciplines.map((d) => (
                <Link
                  key={d.id}
                  to={`/labs?category=${d.id}`}
                  className="ruled-row lp-disc-row"
                >
                  <span className="lp-disc-name">
                    <d.icon size={16} />
                    {d.label}
                  </span>
                  <span className="lp-disc-example">{d.example}</span>
                  <span className="t-mono lp-disc-count">{d.count} incidents</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Guided troubleshooting — a real walkthrough step, static. */}
        <section className="band band--paper" id="guided" aria-labelledby="lp-guided-title">
          <div className="inset">
            <SecHead
              headingId="lp-guided-title"
              title="Guided troubleshooting"
              note={`${guidedCount} of ${scenarios.length} cases`}
            />
            <div
              className={`lp-guide-grid ${guideReveal}`}
              ref={guideRef}
            >
              <div className="lp-guide-copy">
                <p className="t-body">
                  Guided mode puts an instructor beside you without taking the
                  controls. The guide marks the object to inspect, explains why the
                  check matters, and tells you exactly what to look for — then lets
                  you perform the real action yourself.
                </p>
                <p className="t-body">
                  The walkthrough never runs the diagnosis for you. Evidence,
                  fixes and verification stay in your hands; the guide only keeps
                  you on the method.
                </p>
              </div>

              <figure className="lp-guide-card">
                <div className="lp-guide-head">
                  <span className="t-mono">Step 2 of 4</span>
                  <span className="lp-guide-ticks" aria-hidden>
                    <span className="lp-guide-tick" data-s="done" />
                    <span className="lp-guide-tick" data-s="now" />
                    <span className="lp-guide-tick" />
                    <span className="lp-guide-tick" />
                  </span>
                  <span className="state-mark state-mark--active">Guided</span>
                </div>
                <p className="lp-guide-target">
                  <span>Target:</span> {GUIDE_EXAMPLE.target}
                </p>
                <div className="lp-guide-blocks">
                  <section className="lp-guide-block">
                    <h3>What to do</h3>
                    <p>{GUIDE_EXAMPLE.what}</p>
                  </section>
                  <section className="lp-guide-block">
                    <h3>Why</h3>
                    <p>{GUIDE_EXAMPLE.why}</p>
                  </section>
                  <section className="lp-guide-block">
                    <h3>Look for</h3>
                    <p>{GUIDE_EXAMPLE.lookFor}</p>
                  </section>
                </div>
                <div className="lp-guide-viz" aria-hidden>
                  <span className="lp-file-path t-mono">config.yaml</span>
                  <span className="lp-file-meta t-mono">600 · root:root</span>
                </div>
                <figcaption>
                  A step from the guided walkthrough of “{GUIDE_EXAMPLE.scenarioTitle}”.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Browser VM — real verified guest facts and a real transcript. */}
        <section className="band band--steel" id="vm" aria-labelledby="lp-vm-title">
          <div className="inset">
            <SecHead
              headingId="lp-vm-title"
              title="A real Linux machine boots in this page"
              note="VM Lab"
            />
            <div
              className={`lp-vm-grid ${vmReveal}`}
              ref={vmRef}
            >
              <div className="lp-vm-copy">
                <p className="t-body">
                  VM Lab boots a Buildroot Linux machine with SeaBIOS firmware and a
                  BusyBox shell. Pause it, save and restore its state, and step
                  through the boot sequence one stage at a time.
                </p>
                <p className="lp-vm-note">
                  The emulator loads only when you open VM Lab — this page pulls in
                  none of it.
                </p>
                <div>
                  <Link to="/vm-lab" className="btn-secondary">
                    Open VM Lab
                  </Link>
                </div>
              </div>

              <div className="lp-vm-panel">
                <BootTranscript />
                <dl className="lp-specs">
                  <div>
                    <dt>Guest OS</dt>
                    <dd>{VM_PROFILE.guest.os}</dd>
                  </div>
                  <div>
                    <dt>Kernel</dt>
                    <dd>{VM_PROFILE.guest.kernel}</dd>
                  </div>
                  <div>
                    <dt>Shell</dt>
                    <dd>{VM_PROFILE.guest.shell}</dd>
                  </div>
                  <div>
                    <dt>Memory</dt>
                    <dd>{memory}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Facts — computed from the catalog, phrased as a spec shelf. */}
        <section className="lp-section" aria-labelledby="lp-facts-title">
          <div className="inset">
            <SecHead
              headingId="lp-facts-title"
              title="The lab right now"
              note="computed from the catalog"
            />
            <dl
              className={`lp-facts ${factsReveal}`}
              ref={factsRef}
            >
              <div className="lp-fact">
                <dt>Incidents</dt>
                <dd>
                  <CountUp value={scenarios.length} />
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Disciplines</dt>
                <dd>
                  <CountUp value={disciplines.length} />
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Reference articles</dt>
                <dd>
                  <CountUp value={kbArticles.length} />
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Guided walkthroughs</dt>
                <dd>
                  <CountUp value={guidedCount} />
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Lab stages</dt>
                <dd>2D + 3D</dd>
              </div>
              <div className="lp-fact">
                <dt>Runs in</dt>
                <dd>Your browser</dd>
              </div>
              <div className="lp-fact">
                <dt>Progress storage</dt>
                <dd>On this device</dd>
              </div>
              <div className="lp-fact">
                <dt>Account</dt>
                <dd>Optional</dd>
              </div>
              <div className="lp-fact">
                <dt>Source</dt>
                <dd>Open-source project</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Final entry — the door, twice. */}
        <section className="band band--steel lp-cta" aria-labelledby="lp-cta-title">
          <div
            className={`inset lp-cta-inner ${ctaReveal}`}
            ref={ctaRef}
          >
            <div>
              <h2 className="t-case" id="lp-cta-title">
                The lab is open.
              </h2>
              <p className="lp-cta-line">
                {scenarios.length} incidents · {disciplines.length} disciplines ·
                no account required
              </p>
            </div>
            <div className="lp-cta-actions">
              <Link to="/workbench" className="btn-primary">
                Enter the lab
              </Link>
              <Link to="/auth" className="btn-secondary">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-foot-inner">
          <span className="lp-foot-brand">IT Lab</span>
          <span>Local-first simulator — everything runs in your browser.</span>
          <nav className="lp-foot-links" aria-label="Product">
            <Link to="/labs">Labs</Link>
            <Link to="/kb">Knowledge</Link>
            <Link to="/vm-lab">VM Lab</Link>
            <Link to="/workbench">Workbench</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
