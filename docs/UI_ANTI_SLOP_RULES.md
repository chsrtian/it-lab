# UI Anti-Slop Rules — permanent NO/YES checklist

Status: Phase 9H. Binding for all UI work in this repo. Every rule was
triggered by a real audit finding (Phase 9H) or an accepted anti-pattern.
Run this checklist before claiming any UI task done. Grammar context:
`docs/DOMAIN_GRAMMAR.md`.

## Data & evidence

| NO | YES |
|---|---|
| `JSON.stringify` of world values in learner UI | `formatValue()` → readable `key: value` lines |
| `Object.entries(run.world)` catch-all dumps | whitelisted keys → typed rows with gated meaning |
| Empty placeholder for an absent world key ("No evidence collected yet.") | render the section only when it has rows (R5) |
| Tabs/views with no data source ("no data", "empty" permanently) | conditional tab list — tab exists only when its world key exists and is non-empty |
| Showing verdicts/interpretations at t0 because the key exists | gate interpretations behind `isDiagnostic` applied (tier 2 evidence) |
| A fix action whose world patch is invisible in the lab | render the patched key (e.g. `world.disks` in Storage) so fixes have consequences |
| Raw World Inspector for learners | developer-only Diagnostics toggle |

## Action surfaces

| NO | YES |
|---|---|
| Permanent ungated in-lab action rails duplicating the dock | "Checks" strip = `scenario.actions.filter(a => a.isDiagnostic)` only |
| Two full action lists (lab rail + dock) | one canonical list: dock Actions drawer (R4) |
| Promoting wrong-path traps as contextual CTAs | contextual buttons = `availableActions` filtered `isFix \|\| isDiagnostic` |
| Broken contextual buttons (matchHints/inspectTarget matching nothing) | wire `inspectTarget` (or valid matchHints) to the real world object name |
| Disabled-but-visible "done" buttons as the only state | `disabled` + visible "done" text, or omit applied checks (DB pattern) |

## Labels & chrome

| NO | YES |
|---|---|
| Implementation metadata in the UI (`environment.kind`, "shell available", "panel only") | domain nouns only |
| Instruction copy inside panels ("click a path", "click to inspect") | affordance + `aria-pressed`; help belongs in KB links |
| Meta badges (ticket id, kind) crowding panel headers | header = surface name; context lives in the incident banner |
| Emoji as icons | lucide SVG; decorative ones `aria-hidden` |
| Color-only status | color + text (or icon + text) |
| Decorative metrics/progress that run.state doesn't own | only engine-derived numbers |

## Layout & density

| NO | YES |
|---|---|
| Card grids for environments (tile walls of equal cards) | domain-native stage (bench, topology, ladder, console, board, chat) |
| Identical layouts forced on different domains | shared grammar (R1–R10) + per-domain stage shape |
| Modal dialogs for routine inspection | contextual inline surface (inspector/detail/CTA) |
| Permanent rails/side columns competing with the stage | workspace: topbar → stage → dock drawers on request |
| Overlapping dismissible overlays stacking up | one contextual overlay at a time; z-order documented |

## Interaction & accessibility

| NO | YES |
|---|---|
| `<div>` doing a button's job | native `<button>` with `aria-pressed`/`aria-label` |
| Tabs without state semantics | `aria-pressed` (or role=tab + aria-selected if pattern is upgraded) |
| Tool strips as unlabelled button piles | `role="status" aria-label="Diagnostic checks"` (consistent with probes/checks strips) |
| Sub-32px touch targets on mobile | tiers: 40px (sim/dock) / 36px (`.lab-tab`, `.lab-row`) / 32px (`.chip`) |
| Removing focus outlines | global `:focus-visible` accent ring |
| Tap-only affordances on 3D/pointer-first surfaces | keyboard-equivalent path (legend chips, SVG, buttons) |

## Motion & performance

| NO | YES |
|---|---|
| Decorative loops/shimmer/bounce in labs | state transitions 150–500ms, color/opacity/transform only |
| Ignoring `prefers-reduced-motion` | global reduction block; R3F falls back to 2D |
| Per-frame values in React state inside R3F | refs + `useFrame(delta)`; `frameloop="demand"`, `dpr=[1,2]` |
| Three.js in the entry bundle | lazy `HardwareScene` chunk ≤1MB/≤300kB gzip |
| `transition: all`, permanent `will-change` | explicit properties, short-lived `will-change` |

## Process & dependencies

| NO | YES |
|---|---|
| New dependency to solve <~100 lines (tabs, formatting, lists) | hand-rolled in project patterns; check existing deps first |
| Adopting a design framework / mass restyling during a fix phase | minimal, violation-targeted edits; untouched labs stay untouched |
| Editing engine/scenario mechanics for a UI reason | propose engine phase first; UI works with `applyAction` as-is |
| Weakening tests to make gates pass | fix the code; tests are the record of engine/content contracts |
| Claiming "reviewed" without running gates | tsc + lint + test + build, results reported verbatim |
