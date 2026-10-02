# Phase 12 (v2) — Design Spec: "Bench Instrument"

Status: SUPERSEDED by docs/ui/phase12-v3-design-spec.md (direction B, "Steel-Framed Bench"). Kept for history only; do not implement from this file.
Original: Gate 3. Max ~2 pages. Direction C from
`phase12-directions.md`. Light lab bench + dark instrument wells; the dark
ScenarioPage is the continuity target and becomes the instrument well.

---

## 1. Colour tokens (role → value, with computed WCAG contrast)

### Light bench theme

| Role | Token | Value | Contrast |
|---|---|---|---|
| Canvas (page bg) | `--bench` | `#F4F4F1` | — |
| Surface (work order, panels) | `--surface` | `#FFFFFF` | — |
| Text | `--ink` | `#1B1E22` | 15.2:1 on bench · 16.7:1 on surface |
| Text secondary | `--muted` | `#5A6068` | 5.8:1 on bench · 6.4:1 on surface |
| Text tertiary | `--faint` | `#686F77` | 4.6:1 on bench |
| Border (hairline) | `--hairline` | `#D9DAD6` | 1.7:1 (structure, not a boundary) |
| Border strong | `--border-strong` | `#B8BAB6` | 1.8:1 (structure) |
| **Accent (interactive/primary/active)** | `--accent` | `#0F766E` | **5.0:1** on bench · 5.5:1 on surface |
| Accent hover/active | `--accent-strong` | `#0D6B63` | 5.8:1 on bench |
| Text on accent | `--on-accent` | `#FFFFFF` | 5.5:1 on accent |
| Focus ring | `--accent` | `#0F766E` | 5.0:1 on bench · 3.9:1 on hairline (≥3:1 both) |

### Dark instrument-well theme

| Role | Token | Value | Contrast |
|---|---|---|---|
| Well bg (recessed) | `--well` | `#10151C` | — |
| Well raised | `--well-raised` | `#161D26` | — |
| Well border | `--well-border` | `#2A323D` | 1.4:1 (defines well edge) |
| Well text | `--well-text` | `#E8EAED` | 15.2:1 on well |
| Well muted | `--well-muted` | `#9AA1A9` | 7.0:1 on well |
| Well accent (links in well) | `--well-accent` | `#4FB3A9` | 7.3:1 on well |

### State colours (state marks only — never large fills)

| State | Token | Value | Contrast on bench |
|---|---|---|---|
| healthy | `--healthy` | `#15803D` | 4.6:1 |
| warning | `--warning` | `#B45309` | 4.6:1 |
| fault | `--fault` | `#B91C1C` | 5.9:1 |
| info | `--info` | `#1D4ED8` | 6.1:1 |
| verified | = `--healthy` + ✓ glyph | `#15803D` | 4.6:1 |
| active | = `--accent` | `#0F766E` | 5.0:1 |

**One accent hue** (teal). State colours appear only on state marks (LEDs,
badges, stamps). All text/background pairs meet WCAG AA (≥4.5:1); all focus
and UI-component boundaries ≥3:1.

## 2. State encoding (never colour alone)

Each state = **shape + glyph + text + colour**:

| State | Shape | Glyph | Text | Colour |
|---|---|---|---|---|
| healthy | filled square LED | — | "Healthy" | green |
| warning | filled triangle | ! | "In progress" | amber |
| fault | filled square | ✗ | "Fault" | red |
| verified | circle + ✓ | ✓ | "Verified" | green |
| active | filled circle | — | "Active" | teal |
| info | filled circle | i | "Info" | blue |

Shape and glyph distinguish states in grayscale; text is always present.

## 3. Typography

- **Families (2):** Fira Sans (display + text), Fira Code (mono). Self-hosted
  OFL in `public/fonts/`; no CDN.
- **Scale:** display 28/600/1.2 · title 18/600/1.3 · body 15/400/1.6 ·
  label 13/500/1.4 · mono 12/400/1.4.
- **Reading measure:** 60–70ch for article body.
- **Mono is allowed ONLY for:** ticket/case IDs, IPs, ports, commands, paths,
  readings, counts, minutes, XP. **Never** navigation or ordinary labels.
- **Uppercase:** ≤3 places (see §7), each a section label, never body text.

## 4. Shape system

- **Radius (2 tokens):** `--r-sm: 2px` (controls, wells, inputs, LEDs) ·
  `--r-lg: 4px` (work-order surface, large wells). No other radii.
- **Border:** 1px `--hairline` for structure on the bench; 1px `--well-border`
  inside wells. A border is used only to define a surface edge or separate
  rows.
- **Elevation:** none on the bench (flat). Wells are inset by light/dark
  contrast, not shadow. **Shadows only on overlays** (dropdowns, the sim
  feedback card). No glows, no coloured shadows.

## 5. Surfaces (4 types, with rules)

1. **Bench** (`--bench`) — page background. Default; holds text and controls.
2. **Work order** (`--surface`, white, 1px hairline, `--r-lg`) — a distinct
   document/artifact (the active case file, a content panel). Used when a
   region is a self-contained document, not a page section.
3. **Instrument well** (`--well`, dark, 1px `--well-border`, `--r-sm`) — a
   recessed instrument/screen. Used for the simulation stage and every
   diagnostic readout. Light text. This is the continuity surface.
4. **Ruled list** (hairline-separated rows, no box) — an index/log. Used for
   Labs rows, KB list, Progress log. A row is a link; the whole row is
   keyboard-reachable.

A bordered rectangle must have a stated semantic reason (a document, an
instrument, or a grouped artifact). Otherwise use a ruled list or the bare
bench.

## 6. Controls (5 roles)

| Role | Shape | Fill / border | Text | Height |
|---|---|---|---|---|
| Primary | `--r-sm` rect | solid `--accent` | `--on-accent` 600 | ≥40px |
| Secondary | `--r-sm` rect | `--surface` / 1px `--hairline` | `--ink` 500 | ≥40px |
| Tool/diagnostic | `--r-sm` rect | `--well-raised` / 1px `--well-border` | `--well-text` | ≥32px (well) |
| Destructive | `--r-sm` rect | `--surface` / 1px `--fault` | `--fault` 500 | ≥40px |
| Nav link | text | none | `--muted`→`--accent` on hover + underline | ≥24px |

- **Hover:** colour, underline, or border change only. **No** transform, lift,
  scale, or pulse.
- **Active/pressed:** `--accent-strong` (primary) or accent border (secondary).
- **Focus:** 2px `--accent` ring, 2px offset, never obscured.
- **Disabled:** 45% opacity, `cursor: not-allowed`, no pointer.
- **One solid accent-filled element per viewport** (the primary control);
  state marks excepted.

## 7. Icon language

- lucide SVG, 24×24 viewBox, stroke 1.5–2, `currentColor`, `aria-hidden`.
- **Allowed:** beside a control label, inside a state mark, in a well toolbar.
- **Not allowed:** inside a colored container; beside every label; decorative.
- **Icon-in-colored-container: 0.** No icon is ever placed on a tinted fill.

## 8. Motion

- Allowed only to convey **selection, focus, opening, confirmation, state
  change**. ≤150ms. Colour/opacity only — no transform.
- **None** under `prefers-reduced-motion`.

## 9. Background

- Flat `--bench` colour. No texture or pattern. The only visual texture is
  the **data-driven equipment SVG** inside the instrument well (see §4).
- **Nothing sits behind body text** — text is on flat bench or flat surface.

## 10. Page skeletons

- **Home:** header → active case as a **work order** (case ID mono, title,
  symptom, equipment SVG in a mini instrument well, objectives count, state
  mark, one primary control) → **technical index** (disciplines as a ruled
  list with real counts + subtopic lines, varied hierarchy) → recent sessions
  (ruled list). No empty hero band.
- **Labs:** header → filter rail (domain chips + search + level) → **ruled
  case index** (rows: state mark, case ID, title, discipline marker,
  environment, difficulty, duration). Whole row is a link. ≤640px: rows become
  compact two-line records.
- **Knowledge:** header → track filter → search → **contents-style ruled
  article list**. Article: ~65ch measure, side notes linking related cases and
  glossary terms.
- **Progress:** header → one summary well (verified X of Y, XP) → per-
  discipline coverage as a **ruled table** → chronological session log. **≤1
  progress bar** on the route; **≤1 graphic form** (the summary well).
- **Settings:** plain utility form. Labelled sections: safety, content
  integrity, data (reset). Minimal, unadorned.
- **Guided/Practice/Challenge:** visual integration only — Guided reads as
  technician assistance, Practice as independent work, Challenge as assessment.
  No logic change.

## 11. Empty states (designed, not blank)

- **Zero progress:** summary well reads "0 of N verified"; coverage table
  shows all-empty marks; a line points to the first recommended case.
- **Zero results:** "No labs match these filters" + a clear-filters control.
- **First launch:** the active case is the first recommended case (foundational
  difficulty, no prerequisites); the index lists every discipline with real
  counts.

## 12. Copy voice

Plain technician language. Sentence case. No marketing, no motivational filler,
no "unlock / supercharge / journey". State what is true: counts, minutes,
state.
