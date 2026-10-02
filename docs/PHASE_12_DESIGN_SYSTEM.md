# Phase 12 — Product shell design system ("Steel-Framed Bench")

Status: implemented (v3). Supersedes `docs/ui/phase12-design-spec.md` (v2
"Bench Instrument") and the dark shell previously documented here. Binding spec:
`docs/ui/phase12-v3-design-spec.md`; directions and rationale:
`docs/ui/phase12-v3-directions.md`. Obeys `docs/UI_ANTI_SLOP_RULES.md` +
`docs/DOMAIN_GRAMMAR.md` R1–R10.

## Identity

**IT LAB = a steel-framed technician workbench.** Two graphite rails clamp a pale
bench floor; the cases are paper work orders lying on it; the instrument wells,
job strips and readout shelves are the same graphite steel as the rails. The
product's job is to work an incident from symptom to verified fix, so the shell
reads as material and measurement — dense, quiet, technical — never as a SaaS
dashboard.

Deliberate rejections: hero/glow/gradient blobs, KPI card trio, eyebrow pills,
emoji, card grids, per-discipline colour, progress bars, uppercase micro-labels,
shadows on content, a second accent hue.

The primary action colour is **signal orange** (`--color-accent`), the colour of
an armed control. It never appears as decoration — orange means interactive,
focused, armed, or committed.

## Colour roles (four surfaces, one accent)

| Surface / role | Token | Value | Used for |
|---|---|---|---|
| Bench floor | `--color-bench` / `-lit` | `#e4e5e0` / `#ecece7` | page background, lit from the top 420px |
| Paper | `--color-surface` / `-2` | `#fbfbf8` / `#f3f3ef` | work order, article sheet, inputs, hover |
| Graphite steel | `--color-steel` / `-raised` | `#17191d` / `#212429` | rails, job strip, wells, slab, steel bands |
| Graphite line | `--color-steel-line` | `#33373d` | 1px division on steel |
| Hairline | `--color-hairline` | `#c9cac4` | 1px division on light surfaces (structure only) |
| Ink / muted / faint | `--color-ink` / `-muted` / `-faint` | `#16181c` / `#54585e` / `#5f646b` | 3-step hierarchy, all ≥4.5:1 on bench and paper |
| Interactive | `--color-accent` / `-strong` | `#c2400a` / `#a8350a` | buttons, focus, selected nav, active marks |
| On graphite | `--color-signal-hi` | `#e2560f` | the same accent at AA on steel |
| Verified | `--color-healthy` / `-dark` | `#15703d` / `#4ade80` | ✓, tally verified cells |
| Warning | `--color-warning` / `-dark` | `#8f5400` / `#fbbf24` | ▲ |
| Fault | `--color-fault` / `-dark` | `#b3261e` / `#f87171` | ✕ |
| Open / info | `--color-open` / `-dark` | `#3d4348` / `#b6bcc4` | □ |
| Control boundary | `--color-border-strong` | `#7e817a` | input/button/tally boundary (≥3:1) |

Rules: colour never travels alone — every state is a **shape mark plus text**
(`✓ ● □ ▲ ✕`), with a graphite variant on steel. There is **no per-domain
palette**; disciplines are told apart by their glyph and their name.

## Typography

- **Fira Sans** (UI) — prose, titles, controls.
- **Fira Code** (mono) — values only: counts, minutes, ids, XP, readouts.
  Tabular numerals. Never paragraphs.

Scale utilities: `.t-case` (clamp 26→38, 700) · `.t-display` (24→28, 700) ·
`.t-title` (17, 600) · `.t-lead` (17) · `.t-body` (15/1.65) · `.t-mono` (12).
The uppercase micro-label of v2 is gone — no uppercase anywhere.

## Radius / borders / surfaces

- **2px everywhere** (`--radius-sm` = `--radius-lg` = 2px). No shadows on content.
- 1px `hairline` for structure on light, 1px `steel-line` on graphite.
- A selected/active surface is marked by a 2px signal rule (nav) or by the
  graphite job strip — never by an extra coloured box.

## Structure primitives (`src/index.css`, `@layer components`)

- Layout: `.inset` (76rem column) · `.page` (page rhythm) · `.band` /
  `.band--paper` / `.band--steel` (full-bleed material).
- `.steel-rail` (+ `--top` / `--bottom`) · `.rail-inner` · `.wordmark` ·
  `.rail-nav` / `.rail-nav-link` · `.rail-readout` · `.skip-link`.
- Case object: `.case-band` · `.case-sheet` · `.case-strip` (job strip) ·
  `.case-body` · `.case-actions` / `.case-meta` · `.obj-list` / `.obj-num`.
- Instrument: `.well` / `.well-stage` / `.well-cap` / `.well-parts` · `.slab` /
  `.slab-num` · `.readout` / `.readout-row` / `.readout-key` / `.readout-val`.
- Station wall: `.station-wall` · `.station` (+ `--featured`) · `.station-top` /
  `.station-name` / `.station-count` / `.station-tag`.
- Lists & heads: `.sec-head` / `.sec-title` / `.sec-note` / `.sec-rule` /
  `.sec-link` (replaces every micro-label) · `.group-head` (sticky) ·
  `.ruled-list` / `.ruled-row` / `.row-sub` · `.empty-state`.
- Status: `.state-mark` + `--verified|active|open|warning|fault` · `.tally` /
  `.tally-cell[data-s]`.
- Controls, scoped by `.shell` so the simulation keeps its own: `.btn-primary` |
  `.btn-secondary` | `.btn-quiet` | `.btn-danger` | `.input` | `.chip`.
- Register row: `.case-row` (6-column grid; 3-line record ≤760px).

`main` carries the `shell` class only outside `/lab/`, so every scoped rule above
stops at the simulation workspace.

## Navigation

Two graphite rails clamp the product: a 56px sticky top rail (mark ·
`WORKBENCH · LABS · KNOWLEDGE · PROGRESS · SETTINGS` · verified/XP readout) and a
44px bottom rail carrying the safety line. Active section = white label, lifted
background, 2px signal rule, `aria-current="page"`. The workspace route keeps the
same header so ScenarioPage geometry is unchanged.

## Layout pattern

Each page is a pale column with full-bleed material bands:

1. `.page-head` — title + one factual count line.
2. Case band — the paper work order beside its instrument well (Home only).
3. `.band--paper` — station wall / register (hairline divisions, not cards).
4. `.band--steel` — readout shelf (Home bench log, Progress slab).

There is no `max-width` on `main`; the column is `.inset` inside each band, so
bands run edge to edge and content stays on the 76rem measure.

## Motion

120ms `background-color` / `border-color` / `color` only. No transform hover, no
pulse, no glow, no `transition: all`. Global `prefers-reduced-motion` retained.

## Accessibility

Skip link; semantic `header`/`nav`/`main`/`h1`/`h2`/`ul`; `aria-current` on nav;
`aria-pressed` on filter chips; `aria-label` on every coverage tally; focus ring
is the global accent (signal-hi on graphite); status is shape + text, never
colour alone; touch targets ≥34px (chips) and ≥42px (buttons); all text ≥4.5:1
and control boundaries ≥3:1.

## Phase 12 Guided Troubleshooting compatibility

The guide button/overlay/arrows mount inside the existing `sim-topbar`/`sim-stage`
host classes and reuse `.sim-*`/`.chip`/`.btn-*`. The shell change is limited to
the 56px header (height unchanged) and the non-workspace content column, so
guided-troubleshooting logic and the equipment labs are untouched.
