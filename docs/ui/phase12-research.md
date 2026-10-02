# Phase 12 (v2) — Research & Baseline

Status: Gate 1. Input to `phase12-directions.md`. All figures measured from
source, not estimated. Priority order obeyed: do-not-touch (§1) > accessibility
> brief > skills > conventions.

---

## 1. Concrete rules extracted (with sources)

### From `docs/UI_ANTI_SLOP_RULES.md` (project, binding)

1. **Colour never travels alone** — every status pair has text or icon+text
   (`UI_ANTI_SLOP_RULES.md` "Color-only status" row). Drives the six-state
   encoding rule.
2. **No card grids for environments / no tile walls of equal cards** —
   "Card grids for environments (tile walls of equal cards)" is a NO
   (`UI_ANTI_SLOP_RULES.md` "Layout & density"). The old Home station-grid is
   exactly this; the new index must vary.
3. **Section = rule + label, not always a bordered card** — "Permanent rails/
   side columns competing with the stage" is a NO; the fix pattern is a top
   rule + label (`UI_ANTI_SLOP_RULES.md` "Layout & density"; also
   `PHASE_12_DESIGN_SYSTEM.md` "bench-section").
4. **A bordered rectangle needs a semantic reason** — "Modal dialogs for
   routine inspection" → contextual inline surface; surfaces that need a
   boundary opt in (`UI_ANTI_SLOP_RULES.md` "Layout & density").
5. **Hover = colour/underline/border change only; no transform/lift/scale/
   pulse** — "Decorative loops/shimmer/bounce" NO; "state transitions
   150–500ms, color/opacity/transform only" YES, but the brief's budget is
   stricter (no transform at all) — brief wins (`UI_ANTI_SLOP_RULES.md`
   "Motion & performance" + brief §5).
6. **Global `:focus-visible` accent ring, never removed** — "Removing focus
   outlines" is a NO (`UI_ANTI_SLOP_RULES.md` "Interaction & accessibility").
7. **Touch targets ≥ 24px (tiers 40/36/32); primary controls ≥ 40px tall** —
   "Sub-32px touch targets on mobile" NO (`UI_ANTI_SLOP_RULES.md`
   "Interaction & accessibility"); brief §5 sets the floor.
8. **No emoji icons; lucide SVG, decorative ones `aria-hidden`** — "Emoji as
   icons" NO (`UI_ANTI_SLOP_RULES.md` "Labels & chrome").
9. **No new dependency to solve <~100 lines; check existing deps first** —
   "New dependency…" NO (`UI_ANTI_SLOP_RULES.md` "Process & dependencies").
   Confirms zero-new-dependency budget.
10. **Claiming "reviewed" without running gates is a violation** — tsc + lint +
    test + build, results reported verbatim (`UI_ANTI_SLOP_RULES.md` "Process
    & dependencies"). Drives §7 validation honesty.

### From `docs/DOMAIN_GRAMMAR.md` (project, binding)

11. **R1 — one product language, many domain languages.** Shared chrome, type
    scale, spacing, focus, icons; distinction from structure and content, never
    per-domain recolouring (`DOMAIN_GRAMMAR.md` Part A R1). The shell must not
    re-skin per page.
12. **R2 — simulation-first; labs never invent status/metrics/progress
    numbers** (`DOMAIN_GRAMMAR.md` Part A R2). Every number on Home/Labs/
    Progress must be engine/content-derived (counts, minutes, verified X of Y).
13. **R5 — progressive disclosure: no surface without a data source**; an
    empty placeholder for an absent key is a violation (`DOMAIN_GRAMMAR.md`
    Part A R5). Empty states must be designed, not blank.

### From `.opencode/skills/ui-ux-pro-max/SKILL.md` (installed skill)

14. **Line length 65–75 characters per line** for body text (skill "line-length"
    rule). Drives the ~60–70ch reading measure for articles.
15. **Line-height 1.5–1.75 for body text** (skill "line-height" rule).
16. **Hover states: colour/opacity transitions, never scale transforms that
    shift layout** (skill "Stable hover states" row). Confirms brief budget.
17. **Light-mode text: near-black `#0F172A` for text, `#475569` minimum for
    muted** (skill "Light/Dark Mode Contrast" rows). Adopted as the light-palette
    contrast floor (brief priority over skill, but they agree).
18. **Transitions 150–300ms for micro-interactions** (skill "Smooth
    transitions" row). Brief caps at ≤150ms — brief wins.
19. **No emoji icons; consistent icon set (lucide)** (skill "Icons & Visual
    Elements" rows). Confirms project rule 8.

### From `.agents/skills/frontend-design/SKILL.md` (installed skill)

20. **One primary intent per screen; hierarchy not volume** (skill "Plan the
    Direction"). Drives "no empty hero band" and "eight identical boxes fail".
21. **Cards only for meaningful grouping; restrained colour** (skill operating
    rules). Confirms the ≤8-bordered-container budget direction.

### Conflicts between skill advice and this brief (and resolution)

| Skill advice | Brief rule | Resolution |
|---|---|---|
| Touch targets 44×44px (ui-ux-pro-max) | ≥24×24px, primary ≥40px tall (§5) | Brief wins; 24px floor, 40px primary. |
| Transitions 150–300ms (skill) | ≤150ms (§5) | Brief wins; 150ms cap. |
| "Glass card light mode" / light-mode contrast tips (skill) | 0 gradients, shadows only on overlays (§5) | Brief wins; skill light-mode contrast *values* adopted, glass/gradient rejected. |
| Skill offers 96 palettes / 57 pairings | One accent hue, six state colours, budgets (§5) | Brief wins; skill palette search deliberately NOT adopted verbatim (would land in dashboard look). |
| frontend-design "prefer raster over SVG" (skill) | SVG-only illustrations, zero new assets (§4) | Brief wins; equipment illustrations are SVG by mandate. |

---

## 2. ScenarioPage extraction (continuity target)

Read from `src/pages/ScenarioPage.tsx`, `src/index.css` (`.sim-*` block),
`src/features/environments/equipment/svg/palette.ts`, `shared.tsx`.

**Theme: DARK.** The entire simulation workspace is dark; this is the
continuity target the shell hands off to.

| Attribute | Value | Source |
|---|---|---|
| Canvas / stage bg | `#020617` (`--color-lab-bg`) | index.css:8 |
| Work surface | `#0f172a` (`--color-lab-surface`) | index.css:9 |
| Raised panel | `#1e293b` (`--color-lab-panel`) | index.css:10 |
| Inset instrument well | `#0b1220` (`--color-lab-instrument`) | index.css:42 |
| Structure border | `#334155` / `#475569` | index.css:11–12 |
| Text | `#f8fafc` / `#94a3b8` / `#64748b` | index.css:15–17 |
| Accent (focus/active) | `#38bdf8` (sky) | index.css:20 |
| State hues | ok `#22c55e`, warn `#fbbf24`, crit `#f87171`, info `#60a5fa` | index.css:24–31 |
| Equipment SVG palette | bg `#070c16`, body `#111827`, plate `#1e293b`, edge `#475569`, text `#94a3b8` | svg/palette.ts |
| Radius | 2px (instr) / 4px (lab) / 6px (lab-lg) | index.css:49–51 |
| Border | 1px structural; 3px left rail for active/selected | index.css (`.rail-accent`, `.incident-banner`) |
| Type | Fira Sans (UI) + Fira Code (data); 9–13px sim chrome, 10px uppercase labels | index.css `.sim-*` |
| Density | High; compact 46px topbar, 44px dock, 30px buttons | index.css `.sim-topbar`, `.sim-dock-bar` |
| Control shapes | 6px rounded buttons; 2px chips; 1px borders | index.css `.sim-btn`, `.chip` |
| State shown as | colour + icon + text (`.status-*`), LED dots, tone-* words | StatusBadge.tsx, index.css |
| Signature visual | Equipment SVG on a 420×280 grid, flat fills, mono labels, LED facts, hotspot selection | svg/shared.tsx, RouterSvg.tsx |

**Continuity implication.** The sim is dark, dense, instrument-like, with a
sky accent and green/amber/red state hues. A light shell that frames the sim as
a recessed **dark instrument well** preserves every sim token unchanged while
giving the product a new, non-dashboard identity: *light lab bench, dark
instruments*. The handoff (light header → dark stage) reads as "opening the
instrument", not as a theme break.

---

## 3. Slop baseline (measured, not adjectives)

Method: regex counts over `src/pages/*.tsx` and the Phase-12 shell block of
`src/index.css`. "Boxed" = element carrying both a border and a background
(excludes bare 1px rules on inputs/table cells). Counts are at 1440px.

### Shell CSS (`src/index.css`, Phase-12 block lines 2518–2923)

| Metric | Before |
|---|---|
| Distinct hex colours | 15 (`#0c1322 #0d1526 #10192b #131e36 #141f36 #1f2d45 #22c55e #2a3b55 #384f73 #38bdf8 #3b5075 #475569 #f87171 #f8fafc #fbbf24`) |
| Distinct radius values | 11 (`0 1px 2px 3px 4px 6px 8px 10px 999px 9999px` + 3 var tokens) |
| Font families | 2 (sans, mono) — **but loaded via Google Fonts CDN hotlink** (`index.html:5–8`) |
| `text-transform: uppercase` | 11 places in shell CSS |
| `box-shadow` | 16 |
| Gradients | 1 (`.case-docket` linear-gradient) |
| Glows (coloured shadow) | 4 (`.led-dot-ok/warn/crit/accent` box-shadow glow) |

### Per route (1440px)

| Route | Bordered boxed containers | Progress bars | Accent hues present | Icon-in-coloured-box | Uppercase |
|---|---|---|---|---|---|
| Home (`HomePage.tsx`) | ~22 | 4 (readiness + 8 station bars) | sky, amber, slate (3+) | 11 (domain icons in `bgTint`) | 9 |
| Labs (`CatalogPage.tsx`) | ~1 | 0 | amber | 0 | 0 |
| Knowledge (`KbPage.tsx`) | ~2 | 0 | sky | 0 | 0 |
| Article (`KbArticlePage.tsx`) | ~0 | 0 | sky | 0 | 1 |
| Progress (`ProgressPage.tsx`) | ~7 | 3 (overall + coverage) | amber | 1 (domain icon) | 0 |
| Settings (`SettingsPage.tsx`) | ~0 | 0 | — | 0 | 0 |

**Worst offenders:** Home (22 boxed, 4 bars, 11 icon-in-tinted-box, 3 accent
families, 9 uppercase) and Progress (7 boxed, 3 bars). The shell CSS carries
11 radii, 11 uppercase, 16 shadows, 1 gradient, 4 glows, and a CDN font
hotlink. These are the "before" figures the redesign must beat.
