# Phase 12 (v3) — Design Specification: "Steel-Framed Bench"

Status: **binding**. Supersedes `phase12-design-spec.md` (v2) and the dark shell in
`docs/PHASE_12_DESIGN_SYSTEM.md`. Direction and comparison in
`phase12-v3-directions.md`. This document is the single source of truth for the
shell's surfaces, type, controls, page structures and the rules that stop it
regressing into an AI-generated SaaS dashboard.

## 1. Product read

A **technician's workbench viewed from above**, not a dashboard. Two graphite
steel rails (header, footer) clamp a cool mineral bench floor. Work is done on
**paper documents** laid on that floor. Every instrument — the equipment
preview, a readout, the simulation — is a **dark well set into the surface**.
The same graphite leads into the simulation workspace, so opening a lab is a
change of focus, not a change of product.

Audience: learners. Tone: professional, human, physical, precise. Never cyberpunk,
never command-centre cosplay, never a marketing hero.

## 2. Surfaces (the only four)

| Surface | Value | Use |
|---|---|---|
| **Bench floor** | `#E4E5E0` (top-lit wash `#ECECE7 → #E4E5E0` over the first 420px) | page background, gutters |
| **Paper** | `#FBFBF8` | documents, lists, forms, sheets |
| **Graphite / steel** | `#17191D`, raised `#212429`, line `#33373D` | header rail, footer rail, job strip, instrument wells, the one status band |
| **Hairline** | `#C9CAC4` (on steel `#33373D`) | every division. 1px, always |

No cards, no shadows on content, no rounded boxes. Depth comes from **material
change** (paper vs steel vs floor) and hairlines only.

### Palette tokens

```
--color-bench: #E4E5E0      --color-ink: #16181C      --color-hairline: #C9CAC4
--color-surface: #FBFBF8    --color-muted: #54585E    --color-border-strong: #B4B5AF
                             --color-faint: #6C7178
--color-steel: #17191D      --color-steel-raised: #212429   --color-steel-line: #33373D
--color-steel-text: #E9EAEC --color-steel-muted: #9BA1A9
--color-accent (signal): #C2400A   --color-accent-strong: #A8350A   --color-on-accent: #FFF
--color-signal-hi: #E2560F  (signal on graphite)
--color-healthy: #15703D / #4ADE80 on graphite
--color-warning: #9A5B00 / #FBBF24 on graphite
--color-fault:   #B3261E  / #F87171 on graphite
--color-open:    #3D4348  / #B6BCC4 on graphite
```

**One accent hue.** Signal orange means *interactive / focused / armed /
commitment / in-progress*. It is never decoration, never a border that is always
on, never a second brand colour.

**There is no per-domain palette.** The eight disciplines are distinguished by
their lucide glyph and their name — never by eight hues.

### Typography

Self-hosted OFL only: **Fira Sans** (400/500/600/700 + italic) for everything,
**Fira Code** for values. Two families, ≤3.

| class | spec |
|---|---|
| `.t-case` | `clamp(1.625rem, 1.2rem + 1.6vw, 2.375rem)` / 700 / 1.1 / -0.025em — the active case title only |
| `.t-display` | `clamp(1.5rem, 1.3rem + 0.8vw, 1.75rem)` / 700 / 1.15 / -0.02em — page h1 |
| `.t-title` | `1.0625rem` / 600 / 1.3 |
| `.t-body` | `0.9375rem` / 1.65 |
| `.t-mono` | Fira Code `0.75rem` / 500 / `tabular-nums` — ids, counts, minutes, XP, dates, component ids |

**Zero `text-transform: uppercase` anywhere.** The section device is `.sec-head`
(title baseline-aligned with a hairline rule that runs to the edge and an
optional right-aligned link), never an uppercase micro-label.

**Mono is for values only** — ticket ids, counts, minutes, XP, timestamps,
component identifiers. Never navigation, never labels, never headings.

### Layout

* `.inset` — `width:100%; max-width:76rem; margin-inline:auto; padding-inline: clamp(1rem, .6rem + 1.6vw, 2.25rem)`.
  All normal content lives inside it.
* `.band` — full-bleed edge-to-edge strip with `border-block: 1px hairline`;
  modifiers `band--paper` (document strip) and `band--steel` (status strip).
  Only two bands per page maximum.
* `.page` — flex column, gap `clamp(1.5rem, 1rem + 1.5vw, 2.5rem)`, page padding-block.
* Radius: **2px** everywhere, rails 0. Shadows: overlays only.

## 3. Signature elements

1. **Graphite job strip** — a `#17191D` bar across the top of the case sheet
   carrying the ticket id (mono), the state mark, and environment · minutes ·
   level. Every case object in the product wears one.
2. **Instrument well** — graphite panel beside or inside a document holding the
   equipment SVG, the environment label, and the component manifest (real
   `environment.components`, prettified, mono).
3. **Coverage tally** — one 9px square per case, hollow = open, signal = in
   progress, healthy = verified. Replaces every progress bar in the product.
4. **Unequal station wall** — the largest discipline gets a full-width bay, the
   rest fill a wrapping strip of bays divided by hairlines. Not a card grid.

## 4. Control language

All controls ≥40px (chips ≥32px), radius 2px, colour-only hover, 120ms,
no transforms, no lift, no glow. Shell-scoped under `.shell` so the simulation
keeps its own controls untouched.

| role | look |
|---|---|
| `.btn-primary` (commit) | signal fill `#C2400A`, white text, hover `#A8350A` |
| `.btn-secondary` | paper + `#B4B5AF` border, ink text, hover signal border+text |
| `.btn-quiet` | no chrome, muted text, hover ink + underline |
| `.btn-tool` | graphite raised, for use inside wells, hover signal-hi border |
| `.btn-danger` | paper + fault border + fault text, hover fault fill/white |
| `.chip` | paper + hairline; `aria-pressed` adds signal text **and** a 2px inset signal ring (never colour alone) |
| `.input` | paper + `#B4B5AF` border, hover/focus signal |
| `.link` | ink + underline (2px offset), hover signal. Prose and margin links. Inline accent-coloured links are banned. |

**State marks** are shape-coded so they survive greyscale:

| state | mark |
|---|---|
| verified / healthy | `✓` |
| in progress / active | `●` |
| open / neutral | `□` |
| warning | `▲` |
| fault / prerequisite unmet | `✕` |

Every mark carries a text label; colour is never the only channel. On graphite,
marks switch to the `-dark` colour tokens.

## 5. Page structures

All pages: `.page-head` (h1 `.t-display` + right-aligned `.page-note` of real
counts) → sections. No page has more than one band of each kind.

### Home (`/`) — h1 "Workbench"
1. `.page-head` — `61 incidents · 8 disciplines · 18 reference articles`.
2. **Case band** (`.inset`, not a band): grid `1fr / clamp(18rem, 24vw, 23rem)`.
   Left `.case-sheet` (paper): job strip → `.t-case` title → real
   `ticket.symptomPlainLanguage` → `learningObjectives` as a numbered list →
   actions (`.btn-primary` "Enter lab"/"Resume diagnosis", `.btn-quiet` links) →
   real meta (objectives · modes · steps taken). Right `.case-well` (graphite):
   `EquipmentPreview` SVG (or discipline glyph when there is no device family),
   environment label, prettified component manifest, tool list.
3. **`.band--paper`** — `.sec-head` "Disciplines on the bench" + link "All labs".
   `.station-wall`: largest discipline = full-width featured bay, remaining 7 =
   wrapping strip `flex: 1 1 10rem; max-width: 22rem`. Each bay: glyph, track
   title, tagline, `verified/total`, coverage tally.
4. **`.band--steel`** — `.sec-head` "Bench log" + link "Full record".
   Left: recent sessions as hairline rows on graphite. Right: label/value
   readouts (verified, in progress, open, XP, articles) — every number real.

### Labs (`/labs`) — h1 "Labs"
Filter row (search + level select + discipline chips + clear) then a
**discipline-grouped register**: `.sec-head` per discipline (glyph + title +
count + tally) over `.case-row` hairline rows
(status · ticket id · title+symptom · discipline · level · environment · minutes).
Group headers are `position: sticky` under the header rail. Below 640px rows
collapse to the existing three-line record.

### Knowledge (`/kb`) — h1 "Knowledge"
Search + track chips, then articles **grouped by track** with `.sec-head` per
track and hairline rows (index number, title, summary, term count).

### Article (`/kb/:id`) — h1 = article title
Back link → `.article-sheet` (paper): header (title + track + summary on a
rule) → `.article-body` at 65ch → right margin column (`.sec-head` sections:
Practice these labs, Glossary, References) separated by a hairline.

### Progress (`/progress`) — h1 "Training record"
1. `.page-head`.
2. **`.slab`** (graphite, inset): big mono `12 / 61` + state mark, and
   label/value readouts (in progress, XP, recorded sessions, last session).
   **No progress bar.**
3. `.sec-head` "Coverage by discipline" — ruled rows: glyph, track title
   (link), `hit/total` mono, first three real `skills`.
4. `.sec-head` "Session history" — ruled rows: timestamp, state mark, title,
   discipline, `mode · actions · hints`. Designed zero-progress empty state with
   a `.btn-primary`.

### Settings (`/settings`) — h1 "Bench settings"
Plain `.sec-head` sections: Safety, Content integrity, Data. `.btn-danger` for
reset. No chrome.

### 404
`.empty-state` with `.btn-quiet` return link.

## 6. Data and label rules

Every number shown is derived from engine/content state — counts, coverage,
minutes, steps, XP, component lists, timestamps. Nothing is decorative. Labels
are sentence case, concrete, domain vocabulary. No "Dashboard", "Analytics",
"Workspace", "Command centre".

## 7. Responsive

Breakpoints: 1440 / 1200 / 1024 / 820 / 640 / 390 / 320.
Case band stacks below `lg` (sheet first, well second). Station wall wraps via
flex; the featured bay stays full width. `.sec-head` wraps the rule away rather
than overflowing. Header rail wraps the nav onto a second row below 640px, five
equal targets, no horizontal scroll at 320px. All tap targets ≥40px.

## 8. Accessibility

AA contrast verified for every token pair above. Focus: 2px signal outline,
2px offset; signal-hi on graphite. Skip link present. `aria-current` on nav,
`aria-pressed` on chips, `role="img"` + label on every tally, `role="status"`
on reset confirmation. Reading order matches DOM order; no CSS-column masonry.

## 9. Out of bounds

Simulation engine, `RunState`, action evaluation, scoring, world derivation,
scenario logic, evidence gates, Phase 11 equipment architecture, Phase 12
Guided Troubleshooting, 2D/3D sim rendering, `ScenarioPage`, guide, labs,
terminal, network topology. Their dark surfaces keep `--color-lab-*`,
`.sim-workspace`, `.btn-*` and `.chip` global definitions unchanged. No new
dependencies, no image libraries, no remote assets.

## 10. Definition of done

`npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build`
all pass; the self-critique in §33–§36 of `UI_ANTI_SLOP_RULES.md` is run and its
findings fixed; greyscale + blurred-legibility check passes (frame → paper sheet
with dark strip → dark well → unequal station wall with square tallies → dark
band remains identifiable).
