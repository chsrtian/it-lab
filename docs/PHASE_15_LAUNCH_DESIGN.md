# Phase 15 — Launch Design ("The Front Door to the Laboratory")

Status: 15A — design research + architecture. Binding for 15B–15G. Obeys
`docs/UI_ANTI_SLOP_RULES.md`, `docs/DOMAIN_GRAMMAR.md` R1–R10, and the
Phase 12 "Steel-Framed Bench" system (`docs/PHASE_12_DESIGN_SYSTEM.md`).
Design authorities: `ui-ux-pro-max` + `frontend-design` skills.

Phase 15 delivers three product surfaces (public landing, auth, authenticated
workbench home) plus Git/GitHub/Vercel readiness — without reopening the
scenario engine, equipment architecture, Guided Troubleshooting, VM Lab, or
the local-first behavior of the simulator.

---

## 1. Research log

### 1.1 External inspiration (cited, not copied)

| Source | What we take | What we reject |
|---|---|---|
| Evil Martians, *We studied 100 dev-tool landing pages* (2025) | "No salesy BS. Clever and simple wins." Centered hero whose visual is **the product UI itself** (static, animated, switchable, or — the power move — a **live embedded product element**). | Their light/neutral SaaS compositions; anything resembling pricing/testimonial templates. |
| Warp / Fly.io landing patterns (via design-community teardowns) | Code/terminal culture as visual identity: a real transcript beats an illustration. Our product genuinely has terminals (scenario consoles, VM Lab) — we can show real output honestly. | Dark-only hacker aesthetic (TryHackMe/HTB look); we stay on the pale bench. |
| TryHackMe | Positioning sentence shape: hands-on, browser-based, learn-by-doing; a **single "Continue with Google"** action rather than a provider menu; interactive content promoted directly under the hero. | Their gamified purple/dark visual language and social-proof volume. |
| Linear (cited in Evil Martians study) | Restraint: static product shot + one CTA is legitimate; whitespace does the work. | Their gradient/glass trends we explicitly forbid. |
| Google *Sign in with Google* best practices (developers.google.com) | One visibly trusted primary button; official Google branding only; frictionless sign-in = sign-in **is** registration. | One Tap / multiple simultaneous prompts on page load (adds complexity we don't need in phase 1). |
| Supabase Auth docs (current, 2026) | Browser OAuth via `signInWithOAuth`, redirect URL allow-list, `detectSessionInUrl`, publishable (public) client key. | SSR/cookie packages (`@supabase/ssr`) — no server exists. |
| BY Group, *Authentication Page UX* guide (2026) | OAuth state matrix: provider redirect, cancellation, consent error, callback error; every error names the **next action**; one primary task per page. | Magic-link patterns (not our provider). |

### 1.2 In-product authorities reused

- **Materials**: bench floor `--color-bench`, paper `--color-surface`,
  graphite steel `--color-steel`, hairline, signal orange `--color-accent`
  (interactive/armed only). 2px radius, no content shadows, no gradients.
- **Type**: Fira Sans (prose/controls), Fira Code (values/transcripts only),
  scale utilities `.t-case` … `.t-mono`. No uppercase micro-labels.
- **Primitives**: `.band--paper` / `.band--steel`, `.inset`, `.sec-head`,
  `.ruled-list`, `.readout`, `.well`, `.state-mark`, `.btn-primary` /
  `.btn-secondary` / `.btn-quiet`, `.steel-rail`, `.wordmark`, `.skip-link`.
- **Motion**: 120ms `background-color`/`border-color`/`color` only; global
  `prefers-reduced-motion` block; no transform hover, no loops.
- **Anti-slop checklist** (§50 of the phase spec) is enforced at review.

---

## 2. Route architecture

Follows the existing react-router v7 `<Routes>` setup in `src/app/App.tsx`.
No route guards: every current feature stays reachable without an account
(local-first). Auth is additive.

```
PUBLIC   /                  LandingPage        (NEW, own layout — no app rails)
AUTH     /auth              AuthPage           (NEW, own layout)
AUTH     /auth/callback     AuthCallbackPage   (NEW, minimal layout)
APP      /workbench         HomePage           (MOVED from "/")
APP      /labs  /lab/:id  /kb  /kb/:id  /progress  /vm-lab  /settings
         (unchanged, inside the existing Shell)
404      *                  unchanged, inside Shell
```

Implementation shape (15B/15C):

- `App` renders three top-level branches: landing route (bare), auth routes
  (bare), and an **outlet layout route** wrapping all existing app routes in
  the current `Shell` (Shell converts to a layout route with `<Outlet />`;
  scroll-to-top behavior stays). This is the smallest change that gives the
  public pages their own chrome while leaving every app page untouched.
- App-shell nav: label "Workbench" now points at `/workbench`; the app
  wordmark points at `/workbench` (work context); the landing has its own
  header whose wordmark points at `/`. A link audit for `to="/"` runs in 15B
  and every in-app link is updated to `/workbench`.
- Intended-destination preservation: `SignIn` links carry
  `state.from` (in-app) or `?next=` (landing) → `/auth` → after success,
  navigate to `next ?? "/workbench"`.

Conceptual flow:

```
/ (landing, discover)  →  Enter the lab  →  /workbench (work, no auth required)
                     ↘  Sign in  →  /auth  →  Google  →  /auth/callback  →  next ?? /workbench
```

---

## 3. Landing page design (15B)

**Visual thesis**: *The lab door* — the same steel-framed bench seen from the
workshop floor. Same materials, same wordmark, same orange; different
information architecture (DISCOVER, not WORK). The page must make the visitor
think "I want to try that machine," not "nice website."

### 3.1 Composition (varied bands — not nine repeated sections)

1. **Hero — statement + live miniature lab.**
   Statement (`.t-case`): "Practice diagnosing real IT problems — in your
   browser." Support: one sentence naming what you actually do (collect
   evidence, test a hypothesis, fix it, verify it). Actions: primary
   **Enter the lab** (→ `/workbench`), secondary **Sign in** (→ `/auth`,
   quiet button — auth is optional and the copy says so).
   Visual: the **Interactive Lab Preview** (§3.2) occupying a graphite
   instrument-well stage beside/below the statement — the product *is* the
   illustration. No stock art, no gradients, no glass.

2. **Interactive Lab Preview / "Try a case" — the memorable interaction.**
   A lightweight, presentation-only miniature built from SVG/CSS and real
   scenario copy:
   - A **domain selector** (Hardware · Networking · Linux) switches the
     miniature environment (bench with parts / compact topology / terminal).
   - A real symptom line from an actual scenario is displayed as a paper work
     order (e.g. link light dark on a switch port, a dmesg error).
   - **OBSERVE → TRACE → VERIFY** three-state control advances the story:
     OBSERVE shows the symptom; TRACE lights the diagnostic path (component
     highlights, a probe result line appears); VERIFY shows the verified-fix
     state (`✓` state-mark + one factual line).
   - Hover/focus on a component reveals: "This is what you'll investigate
     inside IT Lab."
   - Pure React state + CSS; no engine import, no scenario mutations, no
     timers running unattended. Fully keyboard operable; reduced-motion drops
     the transitions.

3. **How the lab works** — the method as a ruled process row:
   *Investigate → Gather evidence → Diagnose → Fix → Verify* — one ruled
   list with numbered `obj-num` marks (the product's work-order grammar), not
   five feature cards.

4. **What you can practice** — the 8 disciplines as a **register** (ruled
   rows: discipline icon, name, count, one concrete example symptom), reusing
   `DisciplineIcon` and domain data. Hover/focus tints the row and reveals
   the example. No tile wall (anti-slop R: "card grids for environments").

5. **Guided Troubleshooting** — a compact static/step-through case strip
   showing the instructor-assisted overlay on a work order (3 states max),
   explaining: the guide never does the diagnosis for you.

6. **Browser VM** — a steel band with a **real transcript** in Fira Code
   (actual `uname -a` / prompt output captured from the guest in 14B-1),
   explaining a real Linux machine boots in the browser. Explicitly lazy:
   nothing about v86/WASM loads here.

7. **Facts + open source** — truthful readout shelf (`.readout`): 100
   scenarios · 8 disciplines · browser-based VM · local-first · open source —
   phrased as facts, never as KPI tiles or fabricated social proof. GitHub
   link appears only once the repository exists.

8. **Final entry** — steel band, one statement, **Enter the lab** +
   Sign-in alternative, GitHub link.

### 3.2 Copy rules

Concrete verbs only (§10 banned list enforced). Every claim maps to a real
capability (scenario count from `getScenarios()`, domains from
`DOMAINS`). No user counts, logos, testimonials, ratings, or pricing.

### 3.3 Performance

Landing imports: existing content metadata + SVG/CSS only. No v86, no WASM,
no three/R3F, no xterm. New JS budget for the landing component: small enough
that the entry bundle delta is negligible (measured in 15B gates). All demo
motion honors `prefers-reduced-motion`.

---

## 4. Auth design (15C)

### 4.1 Supabase decision (§53)

**Selected: Supabase Auth via `@supabase/supabase-js` only.**

- Current project has **no auth library** (checked `package.json`).
- Supabase fits: first-class Google OAuth for SPAs, no server needed, official
  browser flow (`signInWithOAuth`), publishable key is public by design (no
  secret in frontend), redirects configurable per environment.
- Rejected: `@supabase/ssr` (SSR/cookies — no SSR exists), auth-ui packages
  (we design the page), hand-rolled OAuth (explicitly forbidden), other
  providers (none installed; Google is the requested path).
- Bundle: the Supabase client is loaded via **dynamic import inside the auth
  feature module** → its own chunk, fetched only when an auth surface mounts.
  The landing never imports it.

### 4.2 Files (planned)

```
src/features/auth/client.ts        dynamic-import Supabase singleton (config check)
src/features/auth/AuthProvider.tsx context: { user, session, loading, status,
                                   signInWithGoogle, signOut, error }
src/features/auth/useAuth.ts       hook
src/pages/AuthPage.tsx             /auth (lazy)
src/pages/AuthCallbackPage.tsx     /auth/callback (lazy)
```

`AuthProvider` mounts only around the auth routes and the app-shell layout —
never the landing. One provider; no per-page auth reads (§21).

### 4.3 Flow

- Client init: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { detectSessionInUrl: true } })` — supported current browser flow;
  callback page additionally handles `?code=` via `exchangeCodeForSession`
  if auto-detection did not (verified against the installed version in 15C).
- Sign-in: `supabase.auth.signInWithOAuth({ provider: "google", options:
  { redirectTo: <origin>/auth/callback?next=… } })` — full-page redirect
  (no popup gymnastics).
- `/auth/callback`: waits for session detection, exchanges code if needed,
  then `navigate(next ?? "/workbench")`; on failure shows a retry route back
  to `/auth`.
- No Google client secret anywhere in the app (credentials live in the
  Supabase provider config).

### 4.4 Auth page composition

Centered paper work order on the bench floor under a short steel header:

- Wordmark → back to landing.
- H1: "Sign in or create your IT Lab account."
- One honest line: *signing in adds an account; your progress already stays
  in this browser* (local-first promise, §4/§25).
- Single primary action: **Continue with Google** (official Google "G"
  mark + label, per Google branding guidance). No email field, no password,
  no extra providers (§18/§54).
- State model (all announced, `role="alert"` on errors):

  | State | UI |
  |---|---|
  | idle | button enabled |
  | submitting/redirecting | button disabled + "Opening Google…" + `aria-busy` |
  | callback/exchanging | standalone "Signing you in…" status |
  | success | brief "Signed in" then redirect (never shown before it is true) |
  | cancelled (`access_denied` / provider returned no session) | quiet note: "Google sign-in was cancelled — you can try again." No red alarm. |
  | OAuth/network error | "Sign-in didn't complete. Check your connection and try again." + Try again |
  | missing configuration | friendly "Sign-in isn't set up on this deployment." + `<details>` with developer diagnostics (which env var is missing — never values) |
  | signed out (on page while session exists) | "Signed in as …" + Continue / Sign out |

- Secondary: link back to landing and to the lab *without* signing in
  ("Continue without an account") — auth is never a wall (§4).
- Focus management: focus moves to the status heading on state change;
  keyboard order = heading → primary → secondary links.

### 4.5 Session layer (§21)

`AuthProvider` exposes exactly: `user` (Google identity: name, avatar,
email), `session`, `loading`, `signInWithGoogle(next?)`, `signOut()`,
`error`. Subscribes once to `onAuthStateChange`. Nothing else in the app
touches the Supabase client.

---

## 5. Workbench integration (15D)

Minimal, per §22/§26 — the Phase 12 shell keeps its 56px geometry:

- In the top rail's readout area: **signed out** → a quiet "Sign in" button
  (→ `/auth?next=<current>`); **signed in** → avatar (Google avatar image,
  24px, with `alt=""` next to the name) + display name in a native
  `<details>`/button account menu with "Sign out".
- No welcome banners, no over-personalization, no profile dashboard, no
  redesign of HomePage content. The Home page itself gains at most one
  optional line if the account makes it genuinely useful (default: nothing).
- Everything remains fully usable signed out; `signOut` never touches local
  progress stores (§25) — local state and auth state are separate stores by
  construction.

---

## 6. Design system summary (applies to landing + auth)

| Aspect | Decision |
|---|---|
| Typography | Fira Sans/Fira Code as-is; hero statement uses `.t-case`; transcripts `.t-mono` |
| Color | Existing tokens only; orange = interactive; state = shape + text; light bench surfaces for public pages (auth included) |
| Buttons | `.btn-primary` (Enter the lab / Continue with Google), `.btn-secondary`, `.btn-quiet`; ≥42px targets; visible `:focus-visible` ring |
| Layout | Bands (`.band--paper` / `.band--steel`) on bench floor, `.inset` 76rem measure; hero may go edge-to-edge for the preview stage |
| Motion | 120ms color transitions; the OBSERVE→TRACE→VERIFY advance is an instant state swap plus ≤120ms color change; global reduced-motion respected |
| Responsive | Designed at 1440/1024/820/640/390/320: hero statement clamps; preview stage stacks **below** the statement; registers become 3-line rows (existing `.case-row` mobile grammar); auth card = single column ≤480px; no horizontal scroll |
| Accessibility | Skip link on both new layouts; semantic landmarks + one h1; preview is a `role="group"` with real buttons for selector/states; `aria-pressed` on selectors; errors `role="alert"`; contrast ≥4.5:1 (existing tokens verified); no color-only meaning; no focus traps; no focus stealing |
| Anti-slop | §50 checklist run as a review gate before 15B/15C are called done |

---

## 7. Auth environment & redirects (15C/15F)

`.env.example` (placeholders only):

```
# Supabase — browser/public values only. Never a service-role key.
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXX
```

Redirect allow-list (Supabase → Authentication → URL Configuration):

```
http://localhost:5173/auth/callback      # local dev
https://YOUR_APP.vercel.app/auth/callback # production (exact deploy URL)
```

Environment-aware `redirectTo` = `window.location.origin + "/auth/callback" +
(next ? "?next=…" : "")` — localhost is never hardcoded as production.
Google Cloud console needs only the Supabase callback
`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` (documented in
`docs/DEPLOYMENT.md`, 15G). No secrets in Git; `.env`, `.env.local` ignored.

---

## 8. Git strategy (15E)

- Inspect first (`git status` / `rev-parse` / `remote -v`) — **confirmed no
  repository exists today**.
- `git init` (default branch `main`), extend `.gitignore`: `.env`,
  `.env.local`, `.env.*.local`, `.vercel`, keep existing entries; root junk
  (`b64test.js`, `test_dir.txt`) is excluded from the commit via explicit
  ignore entries rather than deleted; `dev.log` already covered by `*.log`.
- Pre-commit review: `git ls-files` + secret scan (API keys, OAuth secrets,
  service-role, passwords), large artifacts, licenses, VM assets
  (`public/vm/*` are small and intentional).
- Owner: **chsrtian**. Check `gh auth status`; if unauthenticated → report
  the exact `gh auth login` command and STOP the push step (no token
  handling by the agent).
- No remote exists and no name is confirmed → **propose `it-lab`, wait for
  user confirmation** before creating or pushing. Never force-push.

## 9. Vercel strategy (15F)

- Static SPA: framework preset Vite; build `npm run build`; output `dist/`.
- SPA fallback required for react-router deep links → minimal
  `vercel.json` rewrites: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
- No base-path assumptions; assets are root-relative (`/fonts`, `/vm/…`) —
  deployment-safe as-is.
- Env vars set per environment in Vercel dashboard (not in Git).
- No automatic deploy without explicit confirmation/credentials (§39).

---

## 10. Test plan (15B–15G)

- **Landing**: renders without auth; all links resolve (`/workbench`,
  `/auth`, `/labs` anchors); preview interaction works (selector switch,
  OBSERVE/TRACE/VERIFY advance, keyboard); no v86/WASM/three chunk requested
  on landing load; reduced-motion honored.
- **Auth**: states render (idle/loading/error/cancelled/config-missing/
  signed-out); `signInWithGoogle` called with expected `redirectTo`
  (mocked client); callback route exchanges/handles errors (mocked);
  signed-out state.
- **Session**: centralized provider; user exposed; sign-out clears only
  auth state (local progress store untouched — assert store identity).
- **Workbench**: identity appears signed in; signed-out rail unchanged;
  HomePage content intact (existing tests must stay green).
- **Routing**: `/` is landing; `/workbench` is Home; `?next` round-trip;
  app routes still inside Shell; 404 intact.
- **Security**: no secrets in source; `.env*` ignored; no service-role key;
  supabase chunk not in landing/entry (assert build output / import graph).
- **Gates**: typecheck, lint, full vitest, production build, bundle deltas.

**Honesty rule (§47)**: tests prove wiring only. "CODE VERIFIED" and
"LIVE OAUTH VERIFIED" are reported separately; no fabricated OAuth success.

---

## 11. Out of scope (locked)

No profiles table, no cloud sync, no progress migration, no password auth,
no extra providers, no route guards, no Workbench redesign, no changes to
scenario engine / equipment / guided logic / VM internals, no automatic
deploy.

---

## 12. 15B implementation record (executed)

Status: **complete — all gates green.** Scope was landing + route split
only; auth/Git/Vercel/cloud remain untouched (placeholders only).

### 12.1 Files delivered

| File | Role |
| --- | --- |
| `src/pages/landing/landingData.ts` | Grounded demo/register data — demo cases, stage transcripts, discipline register (`getActiveDisciplines()` filters to scenario-bearing categories), method, guided example |
| `src/pages/landing/LabPreview.tsx` | Presentation-only interactive miniature (React state + SVG; no engine, no timers) |
| `src/pages/LandingPage.tsx` | Full band composition with its own `.lp` chrome |
| `src/pages/AuthPlaceholderPage.tsx` | `/auth` + `/auth/callback` placeholder (collects nothing) |
| `src/components/BenchMark.tsx` | Extracted from `App.tsx` (avoids circular import) |
| `src/app/App.tsx` | Route split: `/` and `/auth*` bare; `<Shell>` layout route holds `/workbench` + app routes; wordmark, Workbench nav and 404 now target `/workbench` |
| `src/index.css` (Phase 15 block) | `.lp-*` component layer — no `@keyframes`, no `animation:`; breakpoints 1024/900/820/640/390/320; reduced-motion |

### 12.2 Decisions taken during implementation

1. **`ScenarioPage` became `lazy()`** (same pattern as `VmLabPage`). It was
   the only static importer of `SimTerminal` → `@xterm/xterm`, so the entry
   bundle shipped xterm to first paint of `/`. After the change the entry
   chunk dropped **2065 kB → 1544 kB** and no xterm/v86/three module is
   requested on landing load (verified in dev network entries and by
   grepping `dist/assets/index-*.js`). The route keeps a Suspense fallback.
2. **Landing header is its own steel rail** (`.lp-head`, sticky) — wordmark
   styles are steel-context, and the front door reads as the same product
   without mounting the app Shell.
3. **Observe-phase stage hint** ("Nothing run yet — evidence appears here…")
   fills the deliberately stable `min-height` stage box before any probe has
   run; the log stays hidden until Trace (R5).
4. **The demo keeps its phase when switching discipline** so the miniature
   reads as one case progressing, not three unrelated animations.
5. **Facts/guided counts are computed** from `getScenarios()` /
   `kbArticles` at render time — no hard-coded numbers anywhere.

### 12.3 Gates (final run)

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm test` — **468/468 tests, 41 files** (19 new Phase 15 tests:
  `LandingPage.test.tsx`, `landing/LabPreview.test.tsx`,
  `landing/landingInvariants.test.ts`, `app/App.test.tsx`)
- `npm run build` — pass; entry `index-*.js` 1544 kB (was 2065 kB);
  `libv86`, `SelectionMark` (three) and stage chunks remain separate

### 12.4 Visual validation (screenshots at 1440 / 1024 / 390 / 320)

Self-critique findings and fixes:

1. The Observe stage looked hollow (stable min-height + hidden empty log) →
   added the bottom-anchored observe hint.
2. Discipline counts dropped to a third line at ≤640 (sparse auto-placement)
   → pinned `.lp-disc-count` to row 1 / column 2 at ≤640.
3. Verified otherwise: header/nav/CTA at all widths (quiet button hides
   ≤390; hero CTAs stack full-width), method rows reflow to num+text at
   ≤640, guide-card ticks hide ≤640, facts grid steps 6→5→2→1 columns,
   footer stacks, the SVG topology reflows inside the stage, and the
   terminal transcript stays legible on both paper and steel bands.
4. Keyboard: the first Tab reaches "Skip to content"; header nav links
   follow. Focus rings come from the base layer (`:focus-visible` accent,
   signal-hi on steel).
5. Live interaction check: Trace advances the strip to "In progress" with
   the chain fault + probe log rendering; `/auth` verified by DOM probe
   (h1 "Sign in", no `.steel-rail` present).
6. No `cloud` anywhere in landing copy, rows, styles or tests — the
   register renders exactly the 8 scenario-bearing disciplines.

### 12.5 Honest limitations

- `guidedCount` is 100 of 100 scenarios, so the note renders
  "100 of 100 cases". That is computed from `modeSupport`, not marketing.
- Screenshots live outside the repo (`C:\Temps\opencode\shots\`); nothing
  image-related is committed.
- `/auth` is a placeholder by design; no Supabase code exists yet (15C).


---

## 13. 15B.1 motion record (executed)

Landing motion + interactive lab polish inside the 15B architecture. No
engine, route, content or design-system changes; no animation library.

### 13.1 Files delivered

- `src/pages/landing/motionHooks.ts` - `usePrefersReducedMotion`,
  `useInView(ref, {once})`, `useReveal(ref)`. Refs are passed in, never
  returned; both observers fail safe (content visible, automation off)
  when IntersectionObserver is unavailable.
- `src/pages/landing/motion.tsx` - `CountUp`: rAF count-up that settles on
  the exact catalog value; static without observer/reduced motion/rAF.
- `src/pages/landing/BootTranscript.tsx` - presentation-only VM boot demo
  grounded in `BOOT_STAGES` markers + `VM_PROFILE` kernel (SeaBIOS ->
  Booting from DVD/CD -> ISOLINUX -> Linux version 2.6.34.14 ->
  VFS: Mounted root -> /root%), line by line (~780ms), holds ~2.8s, loops;
  stage chips activate with `aria-current="step"`; IO-gated.
- `src/pages/landing/landingData.ts` - `PHASE_DURATION_MS` (3000 each,
  inside the 2.5-3.5s band), `LOOP_PAUSE_MS` (1400), `MANUAL_HOLD_MS`
  (10000), `nextDemoPhase()`, `PHASE_STATUS` chip words, Linux chain +
  per-phase states.
- `src/pages/landing/LabPreview.tsx` - autonomous observe->trace->verify
  cycle (gated on observer + viewport + motion + not paused), hover/focus
  pause, 10s manual hold after a phase pick, `.lp-live` status chip, domain
  switch = clean reset to observe + `key={domain}` channel swap, staggered
  chain state flips (`transition-delay`), per-phase log remount.
- `src/pages/LandingPage.tsx` - six once-per-band scroll reveals, four
  count-ups, BootTranscript in the VM band (static uname transcript and the
  inaccurate iPXE chip removed).
- `src/index.css` (Phase 15 block) - keyframes `lp-blip`, `lp-channel`,
  `lp-line-in`, `lp-march`, `lp-edge-march`, `lp-caret`; reveal, live chip,
  boot chip states, 1px press states, tabular facts; marching effects
  desktop-only (>=641px), chain connectors lead each link so a wrapped row
  reads as a continuation; mobile touch targets raised to 40px (<=640px);
  reduced-motion guard neutralises every animation and forces reveals open.

### 13.2 Motion + a11y contract

- Informational/mechanical only: no bounce, parallax, particles or
  continuous background motion; the one activity cue is the status blip.
- Phase state is always carried by text ("collecting/tracing/verifying",
  step words, glyph marks), never colour or motion alone.
- `prefers-reduced-motion: reduce` -> no auto-cycle, no typing, no blips,
  full transcript and full count values immediately; verified live via CDP
  media emulation (phase stayed `observe` 6s, caret `animation: none`,
  reveals forced to `opacity: 1` without JS).
- Keyboard: first Tab is "Skip to content"; preview steps/domains are
  real buttons with `aria-pressed`; focus pause engages on card entry.

### 13.3 Verification (final run)

- `npm run typecheck` ok, `npm run lint` ok (0 errors 0 warnings),
  `npm test -- --run` 478/478 in 42 files, `npm run build` ok.
- Entry bundle: `dist/assets/index-*.js` 1,551.23 kB (gzip 384.27 kB);
  xterm/v86/three remain in lazy chunks, no wasm/xterm/v86 requests on `/`.
- Live checks (dev server, agent-browser): auto-cycle observed
  trace->verify on dwell timers; hover held the phase; manual Trace stayed
  past 3s (hold); domain switch reset to observe with new symptom; boot
  transcript typed all 6 lines then looped; count-ups settled 100/8/16/100
  on scroll; overflow 0 at 1440/1024/390/320; routes `/`, `/auth`,
  `/workbench`, `/lab/:id`, 404 intact.

## 14. 15B.2 guide precision + utility rail record (executed)

Live 3D guide tracking, instrument reticle + interaction cues, mojibake
regression test, and one right utility rail with Guide/Customer mutual
exclusion. No engine, scoring, content, route or VM changes.

### 14.1 Files delivered

- `src/test/textEncoding.test.ts` - scans `src/**` + `index.html`
  (.ts/.tsx/.css/.html) for mojibake byte patterns (corruption samples
  written as escapes so the test file itself stays clean) and U+FFFD;
  caught and fixed a 9th instance (`equipment/svg/AccessPointSvg.tsx:43`).
- `src/features/guide/logic.ts` - `guideStepCue(step, scenario)` derives
  CLICK / TYPE / INSPECT / OBSERVE from authored data only: `actionId` ->
  `actionDef.kind` (ui->CLICK, terminal->TYPE, inspect->INSPECT),
  `commandId` -> TYPE, `completeWhen` -> the kind of the action whose
  nested patch touches the condition path; else OBSERVE. TOGGLE/CONNECT/
  VERIFY are not derivable without authored fields (limitation).
- `src/features/guide/GuideTargetLayer.tsx` - root-cause fix + reticle.
  Signature = inline `transform` chain of marker + parent + grandparent
  (drei `<Html>` writes the projection to its positioned root, the
  marker's grandparent); rAF loop compares it and only on change
  re-measures and writes ring/cue/leader straight to the DOM. Idle cost =
  one querySelector + three style reads per frame; no React state, no
  layout reads while the camera is still. Reticle: four corner brackets +
  centre dot + cue chip; leader svg always rendered.
- `src/features/guide/GuideOverlay.tsx` - cue chip ("INSPECT"/"CLICK"...)
  beside the target text plus a hint line ("Click this in the lab" /
  "Type this in the terminal" / "Inspect this").
- `src/pages/ScenarioPage.tsx` - ONE `aside.sim-tool` utility rail:
  guide card (`.sim-rail-guide`) stacked above the optional tool drawer
  (`.sim-rail-tool`); Guide XOR Customer enforced in both directions
  (`setGuide` closes the customer dock, `toggleDock("customer")` closes
  the guide); other drawers stack with the guide (printer Actions flow
  preserved); rail reserved via `sim-main--tool` grid column, bottom
  sheet below 960px. Guide card removed from the stage.
- `src/index.css` - reticle/cue/rail rules; obsolete in-stage guide
  overlay and all `.sim-stage.is-guide` rules deleted.
- Tests: `targetContract.test.tsx` (every guided id is in the scenario's
  renderable vocabulary; pc-no-power step 1 three-way equality - card
  text == ring target id == `[data-hotspot-id="wall"]` aria-label; static
  3D wiring: `Interactive id="wall"`, `data-guide-anchor-3d`,
  `guideTargetId` thread, `frameloop="demand"`), live-tracking test in
  `GuideTargetLayer.test.tsx` (grandparent-transform signature, ring +
  cue + leader follow, no measurement while signature unchanged), and a
  "right utility rail" describe in `workspaceLayout.test.tsx` (exclusion
  both ways, guide+Actions stacking, single aside).

### 14.2 Root cause (3D guide anchor)

- `useGuideAnchor` measured the marker rect once per target + resize /
  scroll / body mutation - never on camera movement. drei re-projects the
  `<Html>` marker every rendered frame, so the ring/leader/stale-rect
  lagged behind ("arrow stays behind", wrong position during preset
  focus or after the stage resized when the guide opened).
- Fix is measurement-driven, not render-driven: signature-gated rAF
  (drei invalidates on OrbitControls `change`, so frames exist exactly
  while the camera moves) + direct DOM writes.

### 14.3 Verification (final run)

- Gates: `npm run typecheck` ok, `npm run lint` ok,
  `npm test -- --run` 492/492 in 44 files, `npm run build` ok.
  (Intermittent full-suite failures at ~300s wall time were load-induced
  worker timeouts - every affected file passes in isolation and in the
  clean 176s run.)
- Live (dev server + agent-browser, `/lab/pc-no-power`): step 1 ring
  centre = wall-outlet hotspot centre at 0px in 2D and on the 3D marker;
  steps 2-4 advance with targets/cues (INSPECT -> CLICK at the press
  step); camera orbit, wheel zoom and the step-2 preset all leave the
  ring at dist 0 (preset was 35px off before the signature fix); guide
  and Customer never coexist (one `aside.sim-tool` each way, no stage
  overlap); guide + Actions stack in one rail; 420x780 -> 38vh bottom
  sheet, no horizontal overflow, dock not covered; 0 mojibake matches in
  2,046 chars of live text; 2D fallback resolves by hotspot label.

### 14.4 Honest limitations

- Cue vocabulary is derived (CLICK/TYPE/INSPECT/OBSERVE); TOGGLE, CONNECT
  and VERIFY would need an authored cue field on the step schema - out of
  scope for 15B.2 (schema untouched).
- The live-tracking rAF runs whenever the 3D guide target is mounted
  (signature compare only while idle); it stops when the guide closes or
  the target unresolves.
- Full-suite runs under heavy machine load can still time out worker
  startup; not reproducible in isolation.

---

## 15. 15B.3 guide completion + customer rail record (executed)

One semantic source of truth for the guide target across every surface,
atomic step transitions with per-step completion triggers, an authored
cue vocabulary, and the customer rail layout/height fix. No engine,
scoring, route, auth, Supabase, Git or VM changes.

### 15.1 Files delivered

- `src/content/scenarios` schema - `GUIDE_CUES` (OBSERVE / INSPECT /
  CLICK / TOGGLE / CONNECT / TYPE / VERIFY) and per-step optional `cue`
  and `doneWhen` fields. All four pc-no-power steps authored with cue +
  doneWhen; every guided step in every scenario passes the invariants
  (cue is enum, label present when doneWhen is action-derived).
- `src/features/guide/logic.ts` - `guideStepCue(step, scenario)` honours
  the authored `cue` first, then falls back to the 15B.2 derivation;
  `guideStepDoneWhen(step, scenario)` returns the authored string, else
  derives it from the completion shape (action label / command ran /
  state path equals value).
- `src/features/guide/GuideOverlay.tsx` - step card rewritten to the
  TARGET / DO THIS / WHY / LOOK FOR / DONE WHEN contract (h3 sections),
  `guide-status` shows WAITING FOR ACTION with the step's detail, a
  transient `guide-done` chip (1800ms, OBSERVED for OBSERVE/INSPECT/
  VERIFY, else COMPLETED), CUE_HINTS hint line, and exactly one
  `role="status"` node (the sr-only announcement) so status queries can
  be scoped with `within(guideOverlay)`.
- `src/features/guide/GuideTargetLayer.tsx` - ring variant class
  `guide-ring--{cue}` + glyph (CLICK = pointer) + `guide-ring-label`;
  ring rect = marker rect minus the 6px `RING_PAD`.
- `src/features/environments/hardware3d/parts.tsx` - root-cause marker
  fix: the `<Interactive>` group sits at the origin, so the marker was
  projected at world (0,0,0) while the ring followed the hotspot. The
  guide marker is now placed at the bbox centre of the target
  (`setFromObject` -> `worldToLocal`, equality-guarded, deps
  `[guided]`), which also resolved the exhaustive-deps warning.
- `src/pages/ScenarioPage.tsx` - `guideTargetId` -> resolver ->
  `guideTargetLabel` / `guideFocus` + `actionId` so the card, the ring
  and the inspector share one target; derived selection
  (`activeSelected = guideSelected ?? selected`) removes the
  guide/inspector divergence.
- `src/features/environments/benchHotspot.ts` - `preferredActionId` in
  `buildBenchHotspot`; `hotspotAria(guideLabel, id, fallback)` wired on
  all 8 hotspots so the accessible name states the guide target when one
  is active (static labels were impossible to satisfy before).
- `src/features/environments/SupportLab.tsx` - rail-safe structure:
  three `.rail-input-row` grids (input `min-w-0 w-full`, button natural
  width) for ASK CUSTOMER / STATE DIAGNOSIS / ASK MENTOR (the mentor row
  renders only when `onExplainConcept` is passed), log row carries
  `min-w-0 min-h-0 max-h-64 grow overflow-y-auto`, eval + form rows
  `shrink-0`.
- `src/index.css` - desktop rail clamp `clamp(21.25rem, 26vw, 26.25rem)`,
  mobile (<=959px) `.sim-tool { max-height: 72vh }` + `.sim-main--tool {
  overflow-y: auto }`, stage `min-height: 42vh`, `.sim-rail-tool .panel`
  flex-column/hidden-overflow + `> * { flex: none }`, `.rail-input-row`
  grid, guide-done chip / cue glyphs / ring label variants, and one
  unlayered override `.sim-rail-tool .panel [data-testid=
  "conversation-log"] { max-height: none }`.
- Tests (11 regression additions): `supportExpansion.test.tsx` (customer
  rail structure: 3 rows inside the labelled section, log grow/scroll,
  form shrink-0), `responsiveLayout.test.ts` (clamp, 72vh, rail overflow,
  panel rules, row grid - raw-CSS contract greps), `GuideOverlay.test`
  (TARGET/DO THIS/WHY/LOOK FOR/DONE WHEN, WAITING FOR ACTION, transient
  OBSERVED with fake timers, 7 cue hints, GUIDE_CUES order),
  `GuideTargetLayer.test.tsx` (atomic swap: ring/glyph/label move
  together, cue variants), `targetContract.test.tsx` (pc-no-power all
  four steps: card text == ring target == hotspot aria-label ==
  inspector action, click advances, completion + Verify), `logic.test.ts`
  (cue precedence, enum rejection, label + doneWhen invariants across
  every scenario).

### 15.2 Single source of truth (guide target)

One pipeline feeds every surface: scenario `guideTargetId` -> resolver
-> `guideTargetLabel` (card) + `guideFocus`/`actionId` (inspector) +
bbox-centred 3D marker (ring, exactly -6px on all sides) + preferred
action (inspector primary button) + `hotspotAria` (hotspot accessible
name) + 2D fallback (hotspot label). Selection during guided mode is
derived, never forked. Step transitions are atomic (target, card, ring
and inspector all swap in one update - verified by the atomic-swap test
and the four-step e2e contract).

### 15.3 Cues + completion triggers

The cue field resolves the 14.4 limitation: authored `cue` wins,
otherwise the derivation runs (pc-no-power step 1 uses INSPECT, step 4
CLICK). Completion per step: explicit `doneWhen` text, action applied,
command run, or `stateEquals` read - each surfaces as WAITING FOR
ACTION -> transient OBSERVED/COMPLETED chip -> next step, ending in
`Walkthrough complete` with Verify enabled.

### 15.4 Customer rail (root cause + fix)

- Layout: rail width clamp + panel flex-column (header fixed, log grows,
  eval/form pinned) + `.rail-input-row` grid keeps inputs shrinking and
  buttons inside the panel; below 960px the tool becomes a 72vh
  bottom sheet inside a scrollable `.sim-main--tool`, stage keeps
  `min-height: 42vh`, guide XOR Customer still holds both ways.
- Root cause found live: the panel rules sit in `@layer components`,
  Tailwind's `.max-h-64` sits in `@layer utilities`, and utilities beat
  components regardless of specificity - so the rail log computed
  `max-height: 256px` and the pinned form floated mid-rail. Fixed with
  one unlayered override (unlayered beats every layer); the stage keeps
  its 256px content cap because the selector requires `.sim-rail-tool`.

### 15.5 Verification (final run)

- Gates: `npx tsc --noEmit` ok, `npm run lint` ok (0 problems),
  `npm test` 508/508 in 44 files (116.5s), `npm run build` ok.
- Live walkthrough (dev server :5174 + agent-browser): step 1 ring on
  the power strip at exactly marker-6px; preset clicks move the ring
  (Full PC <-> Cables); steps 1-4 advance with counts, transient
  chips, waiting statuses and camera auto-framing; step 4 CLICK
  reticle with pointer glyph; completion -> Verify -> "Verified" +
  50 XP; Restart works in place; orbit (mouse drag) and wheel zoom
  both tracked ring-to-marker; 2D mode ring on the STRIP hotspot with
  matching aria-label; support scenario stage: ring lands on the
  topbar ticket chip (cross-surface target) beside the stage customer
  panel; pc-no-power rail: Guide/Customer exclusion verified both
  directions (panel swap + tool aria), rail customer fills the panel
  (3 rows, log `max-height: none`, actions pinned), guide + Actions
  stack in one rail (7 buttons inside bounds); 800x700: tool max-height
  exactly 72vh (504px), in-flow sheet, `main` overflow-y auto, no
  horizontal document overflow. Evidence: `C:\Temps\opencode\shots\
  15b3-*.png` (22 files).

### 15.6 Honest limitations

- The vite schtask instance on :5173 died (stuck Queued after a forced
  end); the walkthrough used a manual `npm run dev` on :5174. Restore
  with `schtasks /run /tn "itlab-vite"` when convenient.
- Screenshot reads sometimes return stale bytes for a known path -
  state was confirmed via `eval` (source of truth) and by copying the
  file to a fresh name before re-reading.
- Full-suite runs under heavy machine load can still time out worker
  startup (this run: clean 116s with the browser closed).
- jsdom lacks WebGL; 3D marker math is covered by the DOM-signature
  tests, and L3F/L11 plus the target-contract e2e pass unchanged.
