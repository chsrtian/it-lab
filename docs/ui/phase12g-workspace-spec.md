# Phase 12G — Lab catalog + diagnostic workspace: interaction architecture

Binding spec for the inner-UX revision. Governing inputs: the Phase 12G brief
(reserved-space tool model, discipline rail + incident ledger, true diagnostic
trace, readable locks, guide priority), `docs/ui/phase12-v3-design-spec.md`
(outer shell — untouched), `docs/ui/phase12f-inner-lab-spec.md` (entry/debrief
— retained), `docs/UI_ANTI_SLOP_RULES.md` §§1–36.

Engine constraint: no changes to RunState, world derivation, evaluation,
scoring, hints, evidence gates, action semantics, equipment logic, guided
schema, `guideProgress`, target resolution, or scenario content. UI
architecture only.

## 1. Workspace: reserved space, never overlay

The environment is the workbench. Opening a tool **re-lays-out** the
workspace; it never covers the stage.

```
┌──────────────────────────────────────────────────────────┐
│ CASE · MODE · GUIDE · TOOLS · VERIFY        (topbar)     │
├──────────────────────────────────────────────────────────┤
│ incident brief (contextual row, only when open)          │
├──────────────────────────────────┬───────────────────────┤
│ sim-stage (trace + environment)  │  sim-tool drawer      │
│  .sim-main grid cell             │  reserved column      │
│  guide rail (in-stage) retained  │  (desktop ≥960)       │
├──────────────────────────────────┴───────────────────────┤
│ compact tool rail (switcher)                             │
└──────────────────────────────────────────────────────────┘
```

- New `.sim-main` grid wraps stage + optional `<aside class="sim-tool">`.
  Drawer open ⇒ parent gains `sim-main--tool`.
- Desktop ≥960px: `grid-template-columns: minmax(0,1fr)
  clamp(18.5rem, 27vw, 23rem)` — sim ≈ 65–75%, drawer ≈ 25–35%.
- ≤959px: bottom sheet — `.sim-tool` gets `max-height: 38vh` with internal
  scroll; stage keeps `min-height: 42vh` while a tool is open. Simulation and
  tool are simultaneously visible at 390px.
- Drawer = title + close + scrollable body. No nested cards (sections keep
  `.sim-drawer-cols` two-column flow only when the sheet is full-width; the
  desktop side column is single-column).
- The stage, its trace band, feedback card, guide rail, and 3D/2D canvas keep
  their existing contracts — only their available box changes.
- Simulator stays mounted while any tool is open (single conditional aside).

## 2. Header priority + tool rail

Primary controls only: **CASE** (exit · title · ticket · status) · **MODE**
(objective, ≥1280) · **GUIDE** (GuideEntryButton, accent state when active) ·
**TOOLS** (toggles the drawer to Actions) · **VERIFY** (the one
btn-primary; Restart moves out).

Secondary utilities live in the bottom rail: Terminal · Customer · Actions ·
Evidence · Hints · Learn · Journal — then a spacer — Diagnostics toggle ·
Dev drawer · Restart. The old topbar Hint button is removed (the Hints drawer
already owns "Unlock next hint"). The rail's duplicated status sentence is
dropped. Rail buttons keep their labels, `aria-pressed`, badges, and guide
anchors (`terminal`).

## 3. Tool drawer semantics

- `dock` state, `drawerOpen` guard, and drawer bodies are unchanged — only
  their container moves (`.sim-dock-drawer` → `.sim-tool` head/body).
- Head: domain title (Actions, Evidence, …) + close control
  (`aria-label="Close tool panel"`).
- The drawer is a grid sibling of the stage (reserved space), never
  `position: fixed/absolute` over it.
- Terminal keeps the rail anchor and its body sizing rule (retargeted to
  `.sim-tool`).

## 4. Diagnostic trace (power path)

`.sig` band stays a single compact horizontal row (scrolls horizontally,
never wraps). De-carding:

- Nodes lose borders/backgrounds. Each node = tone marker on a continuous
  rail + short label + mono state text (shape + color + text).
- `::before` square marker per node sits on the rail line (`data-tone`
  colors it); `.sig-rail` draws one continuous hairline behind everything.
- `.sig-link` connectors stretch (`flex: 1 1 auto`) so the line spans the
  band — the eye reads one path, stops visible where tone changes.
- Active/action state = accent-filled marker + accent label (no card fill).
- DOM contract untouched: `data-chain-step` elements keep descendant text
  (hardware/equipment expansion tests), `title` attributes, `aria-pressed`.

## 5. Labs: discipline rail + incident ledger

- Compact header: `Labs` + mono `61 incidents`, one-line description, one
  toolbar (search · level · status · clear · showing count). No stats block,
  no intro paragraphs, no discipline chip cloud.
- `.catalog-grid`: sticky discipline rail (icon · label · count, `aria-
  pressed` filter, verified/in-progress foot) + ledger. ≤899px the rail
  collapses to a horizontal scroll strip.
- Ledger keeps discipline group heads (sticky, coverage tallies) + hairline
  rows: status · ticket · title/symptom · level · environment · minutes.
  Rows stay links (briefing explains the lock).

## 6. Locked rows teach, not grey out

- No `opacity` grey-out. Title = normal ink, symptom = muted (6:1+).
- Status = `▲ Locked` (shape + word, warning tone).
- Third line under the title: `Requires HD-1001 · Desktop PC does not power
  on` (mono ticket + plain title of the prerequisite).
- `aria-disabled` removed (it lied — rows navigate to the briefing);
  `data-locked="true"` carries the state for tests/assistive tooling.
- Entry briefing + workspace brief show the same friendly prerequisite
  (ticket id + title, never the scenario slug). Locks remain advisory —
  the engine gates nothing and no entry button is disabled (documented
  limitation; `printer-paper-jam` has a prerequisite yet is a guide-test
  target).

## 7. Environment header

Panel header hierarchy: environment name (title) → status badge → view
toggle (2D/3D) → tools (faint mono). The instruction subtitle
("3D workbench — drag to orbit…", "click a part to inspect") is removed —
affordances, not copy. No per-word badges.

## 8. Guide integration

Architecture (schema, anchors, rail, ring/leader) untouched. Visual
priority: guide zone button gets an accent-filled pressed state; `.guide-card`
keeps its accent tick language and in-flow rail (desktop) / top-right dock
(<1024). The tool drawer never overlays the guide target (separate column).

## 9. 3D visibility (professional, not toy)

Exposure 1.08 → 1.16; key 1.25 → 1.45; ambient 0.28 → 0.34; hemisphere
0.4 → 0.5. Darkest material families lifted a step for silhouette
separation (board PCB, cable sheaths, PSU shell, chassis interior). No new
lights beyond these, no bloom, no color shifts.

## 10. Responsive matrix

1440/1280: stage + right drawer (+ in-stage guide rail when active).
1024: same, drawer at clamp minimum; zone tags hidden <1280 as today.
960: narrowest side-drawer width (stage still ≥ 55vh row).
900/820/640: catalog rail collapses (≤899); workspace drawer becomes bottom
sheet (≤959): stage 42vh + sheet ≤38vh, both visible.
390: topbar wraps; rail scrolls; sheet never full-screen; no horizontal
page overflow.

## 11. Tests (additions)

- `workspaceLayout.test.tsx` — opening Actions: `sim-main--tool` appears;
  stage stays mounted; drawer is a sibling grid child (reserved space, not an
  overlay); close returns to closed state.
- Trace CSS contracts: continuous rail line, stretched connectors, no card
  border on `.sig-node`, horizontal scroll retained.
- `catalogPage.test.tsx` — locked row readable (title/symptom),
  `Requires <ticket> · <title>` present, `data-locked` + "Locked" word,
  row remains a link.
- Responsive CSS contracts: `sim-main--tool` media rules (side column ≥960,
  sheet ≤959 with `max-height`), catalog grid collapse ≤899.

## 12. Definition of done

All four gates green without weakening existing tests; the §5–§9 manual
checks in the brief answered honestly; self-critique against §§33–36 of the
anti-slop rules (no implementation metadata, no instruction copy, no meta-
badge crowding, no emoji, color+shape state); report with the 12 requested
sections.
