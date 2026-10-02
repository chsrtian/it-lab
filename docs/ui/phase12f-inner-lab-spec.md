# Phase 12F — "Field Console" inner-lab redesign

Status: implementation binding. Outer shell (Phase 12 v3, `phase12-v3-design-spec.md`) is
frozen and is *input*, not a target: the inner lab must now read as the same product.

Governing inputs: the Phase 12F brief, `docs/PHASE_12_DESIGN_SYSTEM.md`,
`docs/UI_ANTI_SLOP_RULES.md` §33–36, `docs/DOMAIN_GRAMMAR.md`,
`docs/ENVIRONMENT_ARCHITECTURE.md`, `docs/UI_DESIGN_REVIEW.md`.

Hard limits (unchanged): engine, world derivation, evaluation, scoring, hints, evidence
gates, guided-step schema, target resolution, Phase 11 equipment logic — untouched.
UI / render / layout / styling only. No external browser; all claims are static reasoning.

---

## 1. One material: graphite inside and out

The lab palette (`--color-lab-*`) was a second, blue-navy material that the outer shell
never used. It is re-based onto the shell's graphite steel so chrome, rails, panels and
chips are one system:

| token | was | now |
| --- | --- | --- |
| `--color-lab-bg` | `#020617` | `#101216` |
| `--color-lab-surface` | `#0f172a` | `#17191d` (= `--color-steel`) |
| `--color-lab-panel` | `#1e293b` | `#212429` (= `--color-steel-raised`) |
| `--color-lab-border` | `#334155` | `#33373d` (= `--color-steel-line`) |
| `--color-lab-text` | `#f8fafc` | `#f1f2ee` |
| `--color-lab-muted` | `#94a3b8` | `#a9aeb5` (≥ 5.5:1 on surface) |
| `--color-lab-faint` | `#64748b` | `#878e97` (≥ 4.5:1 on surface — was 3.4:1) |
| `--color-lab-accent` | `#38bdf8` | `#e2560f` (= `--color-signal-hi`) |
| `--color-lab-cta` / `-text` | `#22c55e` / `#052e16` | `#e2560f` / `#ffffff` |

One accent hue, exactly as the shell law states: *signal orange = interactive, focused,
armed, commitment*. Semantic state colours (ok / warn / crit / info) keep their hues and
keep carrying a word or glyph — they are state, never interaction.

The environment **stage** keeps a dark surround (it is a workbench under a lamp), but no
longer every lab the same navy:

* hardware stage (`.hw-stage-wrap`, `.hw3d-stage`) → graphite `#131619` with a top-lit
  wash — the bench under a work lamp.
* network / database / equipment SVG stages and the terminal keep the instrument navy
  (`--color-lab-instrument`): they are drawn for it, and two families is a real
  difference where one was not.
* Windows / Linux / security / support are panel environments → graphite via the panel
  token automatically.

Dark does not mean invisible: every surface stays ≥ 4.5:1 for its text size.

## 2. Scenario entry = incident briefing (paper, not a dark card)

Bug first: `.scenario-brief-sheet` sat on `--color-lab-surface` while
`.scenario-brief-title` inherited `text-ink` → dark ink on dark navy, i.e. the reported
"Desktop PC does not power on" title was nearly invisible. Contrast is treated as a bug.

The entry page leaves the dark workspace entirely: it is wrapped in the `.shell` scope
(so shell buttons/typography apply) and laid out on `.page > .inset` like Home and
Catalog. The sheet becomes a **paper case document**:

* **Left — the case.** `CASE <ticket.id> · discipline · difficulty · minutes` as one mono
  metadata line (no badge-per-field). Title at `clamp(1.5rem, 3vw, 2rem)` — scenario
  titles are the one place the inner lab gets scale. Reported symptom as a labelled pull
  rule. Objectives as `□` checklist rows in sentence case. Requestor as ruled rows.
* **Right — field conditions + entry.** Ruled key/value rows (environment, difficulty,
  time, requestor, priority, channel), prerequisites note, mode selection as three
  selectable rows with one-line descriptions (guided / practice / challenge, disabled
  when unsupported), then the single primary action **ENTER THE WORKSTATION**.
* Secondary/tertiary content never competes with that action.

## 3. Workspace composition: case header → signal path → environment

```
┌ console header:  CASE … MODE … │ TOOLS …  VERIFY … ┐
├ signal path band:  SOURCE ── PSU ── BOARD ── START ── POST
├ environment (dominant, uninterrupted)
└ tool dock:  TOOLS │ drawers open on request
```

**Signal path.** `Chain` / `ChainStep` / `ChainArrow` are restyled from a row of rounded
chips into a full-width console band (`.env-path` → `.sig-*`) lifted out of the
environment's `Panel` so it stacks directly under the case header. It is a path, not a
card row: label, node → node connectors that carry state, node = mark + label + reading.

State vocabulary, always mark **and** word (shape-coded per shell law):

| state | mark | meaning |
| --- | --- | --- |
| unknown / not checked | `□` | reading not taken |
| observed | `●` | reading taken, healthy |
| verified | `✓` | learner acted on this stage *and* it reads healthy |
| warn | `▲` | reading taken, degrading |
| fault | `✕` | stage not passing |

"Verified" is derived only from real run facts (`appliedActions` contains that
component's related action) — never invented. Steps whose component is not in the
scenario stay hidden (unchanged behaviour, unchanged test).

The band keeps its click-to-select wiring (selection stays inside the lab, so no state
plumbing changes), and remains `data-chain-step` addressable.

**Where there is no signal chain** (networking topology, windows, linux, security,
support, database) the workspace renders a *case path* derived only from run facts:
`SYMPTOM → EVIDENCE → REMEDIATION → VERIFICATION` (`reported / gathering / attempted /
ready / verified`, otherwise `not started`). A domain that has a real path shows its own
path; a domain that does not gets an honest progress path. Nothing is fabricated, so no
"fake telemetry", and every workspace still reads header → path → environment.

## 4. Console header

Zones instead of one mixed row, each with a 10px mono group tag shown at ≥1280px:

* **CASE** — exit, case id (mono), scenario title (14/600, contrast-checked), ticket
  chip, mode/status badge.
* **MODE** — current objective (≥1280 only, unchanged behaviour).
* **TOOLS** — dev, guide, hint, tools (secondary).
* **VERIFY** — verify (the one primary), restart (utility with fault-coloured hover).

Button hierarchy is literal: primary = enter/verify, secondary = guide/tools/hints,
utility = exit/2D-3D/restart/close, destructive = restart/exit hover. Active/armed chips
stop being inline sky classes and become one shared `.chip-on` component class (removes
five duplicate conditionals).

## 5. Environment readability (2D and 3D say the same thing)

3D is fixed by lighting and materials, not by turning everything up:

* key light raised and lifted, cool fill kept, warm hemisphere added for material
  separation, low back rim so silhouettes read against the stage, `toneMappingExposure`
  nudged — no flat global brightness.
* the darkest albedos (work surface, chassis walls, PSU, GPU, cables, trim, PCB) lifted
  one step so metal separates from plastic and both separate from the background.
* **selection** = accent corner brackets laid on the bench around the part's footprint
  (`SelectionMark`) plus the existing restrained emissive — no global glow, no bloom.
  A guide target uses the same brackets with a slow breathe (disabled under
  `prefers-reduced-motion`). 2D keeps its existing selected outline so both views mark
  selection identically.
* the stage wash reads as a lit bench; equipment stays immediately identifiable.

## 6. Guided mode = instructor console, environment stays the hero

* ≥1024px: the guide card stops floating over the stage and becomes a right rail column
  inside `.sim-stage` — it can never cover the legend, inspector or camera controls, and
  the environment shrinks rather than being occluded.
* <1024px: it docks top-right; the component legend hides while the guide is open (the
  guide already names the target and the target ring marks it), the action-review card
  moves to the opposite corner, and the camera toolbar is width-limited so nothing
  stacks.
* Content: step ticks, count, target as a mono readout with accent rule, then
  *What to do / Why / Look for*, then waiting-status + Learn. Same DOM ids, same
  `data-testid`s, same `animation: sim-rise` / reduced-motion `animation: none` contract.
* The target ring + leader line and the 3D anchor are unchanged (schema untouched).

## 7. Terminal, dock, inspector, debrief

* Terminal stays conditional (`showTerminal` + `showTerminal !== false`) and opens only
  from the dock — no permanent dead rectangle.
* Dock bar gets a `TOOLS` group tag, keeps one-drawer-at-a-time, and the mode/action
  readout stays right-aligned.
* Inspector/legend behaviour untouched (bottom corners of the stage, contextual).
* Teaching debrief leaves the dark emerald card: it becomes a paper section with shell
  section heads, sentence-case mono step numbers, state colours from the shell tokens,
  mono only for values, and shell-styled actions (wrapped in the `.shell` scope).

## 8. Responsive contract

| width | behaviour |
| --- | --- |
| ≥1280 | objective visible, group tags visible |
| 1024 | workspace = viewport height; guide becomes a right rail |
| 820–1023 | header wraps into zones; path scrolls horizontally; guide docks top-right |
| 640 | 40px targets, title full-width, chips touch-sized (existing rules) |
| 390 | header wraps, path scrolls, environment ≥55vh, primary action always reachable |

## 9. Explicitly out of scope

Engine/scoring/guided schema, Phase 11 equipment logic, the outer shell pages, the
undefined `--radius-lab` latent bug (left undefined on purpose), global animation
floods, decorative circuitry, fake telemetry, gradients-as-decoration, glassmorphism.
