# Phase 12 (v2) — Three Directions

Status: Gate 2. Three structurally distinct directions. Each differs from the
others in ≥4 of: lightness/theme, layout skeleton, surface model, type
pairing, control-shape language, signature element. Scores are 1–5. The choice
is made here, not deferred.

---

## Direction A — "Service Log"

**Concept.** The product is a technician's *service logbook*: a bound, ruled
book where every case is a chronological entry with a rubber state stamp. You
open the book to today's page — the active case is the current entry, written
as a work order; the disciplines are the book's tabbed index; Progress is the
book's own running log. The physical metaphor is a paper logbook with hairline
rules, a red margin line, and ink stamps. Light, quiet, archival.

**Home first viewport (1440×900):**

```
┌ IT LAB · service log ─────────────── 12 verified · 340 XP ┐  56px header
├──────────────────────────────────────────────────────────┤
│  │ TODAY'S WORK ORDER                    12 min · bench  │
│  │ ┌──────────────────────────────────────────────────┐ │
│  │ │ HD-1001   Desktop PC does not power on          │ │
│  │ │ "I press the power button and nothing happens…" │ │
│  │ │ ○ Separate no-POST from no-power                 │ │
│  │ │ ○ Check PSU, cabling, front-panel               │ │
│  │ │                              [ Enter lab → ]     │ │
│  │ └──────────────────────────────────────────────────┘ │
│  │ stamp: ┌────────┐                                    │
│  │        │ OPEN   │                                    │
│  │        └────────┘                                    │
├──────────────────────────────────────────────────────────┤
│  DISCIPLINE INDEX          │  RECENT ENTRIES             │
│  ───────────────────────── │  ─────────────────────────  │
│  Hardware      5/8  ▬▬▬▬  │  HD-1001 … power on   OPEN  │
│  Networking    3/6  ▬▬▬   │  HD-1003 … wont boot  VERIF. │
│  Windows       2/4  ▬▬    │  HD-1004 … app crash  VERIF. │
│  Linux         3/4  ▬▬▬   │                             │
│  …                         │                             │
└──────────────────────────────────────────────────────────┘
```

- **Palette roles:** paper `#F4F4F1` canvas, ink `#1B1E22` text, muted `#5A6068`,
  hairline `#D9DAD6` rules, stamp-red `#B91C1C` (fault), stamp-green `#15803D`
  (verified), tab-teal `#0F766E` (interactive). No warm cream, no terracotta.
- **Type pairing:** Fira Sans (entries, headings) + Fira Code (ticket IDs,
  counts, minutes). Sentence case; no uppercase chrome.
- **Control shape:** 2px-radius rectangular buttons; state shown as a rubber
  stamp (rotated bordered box with word), not a pill.
- **Signature element:** the **rubber state stamp** — a bordered, slightly
  rotated box carrying the state word (OPEN / IN PROGRESS / VERIFIED), used on
  Home, Labs rows, and Progress entries. Recognisable in grayscale by shape.
- **Most likely slop failure:** drifting into the banned *warm-paper + serif +
  terracotta* "anti-AI" default. Avoided by: cool-neutral paper (not warm
  cream), Fira Sans (not serif), teal accent (not terracotta), and the stamp
  as a physical object (not a coloured pill).

**Scores:** product identity 3 · learnability 4 · hierarchy 3 ·
distinctiveness 3 · technical credibility 3 · scales 5 · continuity 3 ·
grayscale 3.

---

## Direction B — "Rack Elevation"

**Concept.** The product is a *rack elevation diagram* from a service manual:
every case is a device mounted in a rack, drawn as a 1U block with a port
strip and status LEDs. You walk to the rack, find the device with the lit
fault LED, and pull it out for service. The physical metaphor is a technical
manual's rack elevation drawing — precise, unit-based, diagrammatic. Light,
drafting-table aesthetic.

**Home first viewport (1440×900):**

```
┌ IT LAB · rack elevation ─────────── 12 verified · 340 XP ┐
├──────────────────────────────────────────────────────────┤
│  RACK A · UNIT 14                              [pull out] │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ●●●●  HD-1001  Desktop PC does not power on        │  │
│  │ ░░░░  "I press the power button and nothing…"     │  │
│  │       ○ no-POST vs no-power  ○ PSU/cabling        │  │
│  │       ┌────┐ ┌────┐ ┌────┐ ┌────┐  [ Enter lab → ]│  │
│  │       │PWR │ │SATA│ │FRNT│ │PWR │                 │  │
│  │       └────┘ └────┘ └────┘ └────┘                 │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  RACK INDEX                │  PORT STATUS                 │
│  ─────────────────────────  │  ─────────────────────────  │
│  U01 ●●●●  Hardware   5/8  │  HD-1001  PWR ●  SATA ●     │
│  U02 ●●●   Networking  3/6  │  HD-1003  PWR ●  SATA ●     │
│  U03 ●●    Windows     2/4  │  HD-1004  PWR ●  GPU  ●     │
│  …                          │                             │
└──────────────────────────────────────────────────────────┘
```

- **Palette roles:** drafting-paper `#F2F3F0` canvas, ink `#1B1E22`, muted
  `#5A6068`, hairline `#D5D7D2`, signal-orange `#C2410C` (interactive/primary),
  LED-green `#15803D`, LED-amber `#B45309`, LED-red `#B91C1C` (state only).
- **Type pairing:** Fira Sans + Fira Code. Unit labels in mono.
- **Control shape:** near-square 1px-radius buttons; port-like square toggles;
  state as square LED blocks.
- **Signature element:** the **rack elevation** — each case drawn as a 1U
  device block with a port strip (square ports) and a row of square status
  LEDs, derived from scenario metadata. Recognisable in grayscale by the
  unit-block grid.
- **Most likely slop failure:** reading as *fake HUD/telemetry* (the second-
  order check). Avoided by: ports/LEDs are labelled documentation of real
  scenario structure (component names from `environment.components`), not
  live numbers; no coordinates, no hex, no scrolling readouts.

**Scores:** product identity 4 · learnability 3 · hierarchy 4 ·
distinctiveness 5 · technical credibility 4 · scales 3 · continuity 3 ·
grayscale 4.

---

## Direction C — "Bench Instrument"  ★ CHOSEN

**Concept.** The product is a *lab bench*: a light, quiet work surface with
**dark recessed instrument wells** set into it. The shell is the bench (light);
each instrument — the simulation stage, a readout, a diagnostic panel — is a
dark well with light text, exactly like an oscilloscope screen or multimeter
display set into the bench. You walk to the bench, see the active case laid
out as a work order, and open the instrument to work it. The physical metaphor
is a real electronics/diagnosis bench: light bench top, dark instruments.
This gives seamless continuity with the dark ScenarioPage (the sim *is* the
instrument well) and directly answers the "dark dashboard" rejection by making
the shell light.

**Home first viewport (1440×900):**

```
┌ IT LAB · bench ──────────────────── 12 verified · 340 XP ┐  56px header
├──────────────────────────────────────────────────────────┤
│  ACTIVE CASE                                12 min · bench│
│  ┌─ work order ────────────────────────────────────────┐ │
│  │ HD-1001   Desktop PC does not power on            │ │
│  │ "I press the power button and nothing happens…"   │ │
│  │ ○ no-POST vs no-power  ○ PSU/cabling              │ │
│  │                                    [ Enter lab → ] │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ instrument well (dark) ────────────────────────────┐ │
│  │  [equipment SVG: PSU · board · front-panel]        │ │
│  │  PWR ●   SATA ○   FRNT ○        state: OPEN       │ │
│  └────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  TECHNICAL INDEX           │  RECENT SESSIONS           │
│  ─────────────────────────  │  ─────────────────────────  │
│  Hardware    5/8  ▬▬▬▬   │  HD-1001 … power on   OPEN  │
│  Networking  3/6  ▬▬▬    │  HD-1003 … wont boot  VERIF. │
│  Windows     2/4  ▬▬     │  HD-1004 … app crash  VERIF. │
│  …                         │                             │
└──────────────────────────────────────────────────────────┘
```

- **Palette roles:** bench `#F4F4F1` canvas, surface `#FFFFFF` (work order),
  ink `#1B1E22`, muted `#5A6068`, hairline `#D9DAD6`, instrument-well
  `#10151C` (dark), well-text `#E8EAED`, well-muted `#9AA1A9`, accent-teal
  `#0F766E` (interactive/primary/active), state-green `#15803D`,
  state-amber `#B45309`, state-red `#B91C1C`, state-blue `#1D4ED8` (state
  marks only).
- **Type pairing:** Fira Sans (bench text) + Fira Code (ticket IDs, counts,
  minutes, well readouts). Sentence case.
- **Control shape:** 2px-radius rectangular buttons on the bench; inside wells,
  1px-radius instrument controls; state as a small square LED + word.
- **Signature element:** the **instrument well** — a dark, recessed panel
  (1px border, no shadow, visually inset by the light/dark contrast) that
  houses the simulation stage and every diagnostic readout. The same well
  shape recurs on Home (equipment preview), Labs (per-row mini-well), and
  Progress (score well). Recognisable in grayscale by the dark rectangle on
  light bench.
- **Most likely slop failure:** *graphite + amber* or *dark + mono + amber
  lines* (banned). Avoided by: the shell is light (not graphite), the accent
  is teal (not amber), amber appears only as a state colour on state marks,
  and mono is confined to technical values (never navigation or body text).

**Scores:** product identity 5 · learnability 5 · hierarchy 5 ·
distinctiveness 4 · technical credibility 5 · scales 5 · continuity 5 ·
grayscale 5.

---

## Decision and why the others lost

**Chosen: C — Bench Instrument.**

- **A (Service Log)** lost on product identity and continuity. A logbook is a
  *record* metaphor, not a *lab* metaphor — it fits Progress well but makes Home
  feel like paperwork, and its light-paper surface has no natural home for the
  dark sim stage (continuity 3). Its rubber stamp is charming but small.
- **B (Rack Elevation)** lost on learnability and scales. The rack metaphor is
  distinctive but requires explanation ("why is a PC case a rack unit?"), and
  it strains on non-equipment pages (a database case as a 1U device is a
  stretch). Its HUD risk is real.
- **C (Bench Instrument)** wins on the two criteria the brief weights most:
  *product identity* ("walked into a lab" — a bench with instruments is
  literally a lab) and *continuity with ScenarioPage* (the dark sim stage is
  already an instrument well; the shell now frames it instead of competing with
  it). It also scores top on grayscale survival (light/dark contrast, not
  colour) and scales (the well shape works for the stage, readouts, and score).

---

## Second-order slop check (mandatory, against the six banned patterns)

| Banned pattern | C's position |
|---|---|
| dark + monospace + uppercase + thin amber/cyan lines | Shell is **light**; mono confined to technical values; ≤3 uppercase; accent is **teal**, not amber/cyan. |
| warm-paper + serif + terracotta/amber accent | Paper is **cool-neutral** `#F4F4F1`; type is **Fira Sans**; accent is **teal**, not terracotta. |
| graphite + amber | Shell is **light** `#F4F4F1`, not graphite; amber is a **state colour only**, not the accent. |
| blueprint-cyan grid | No grid pattern; accent is teal; no cyan. |
| brutalist thick black borders | Borders are **1px hairlines**; no thick borders. |
| fake HUD/telemetry | Wells show **real** scenario structure (component names, state words); no coordinates, hex, or invented numbers. |

C passes all six. The choice is committed.
