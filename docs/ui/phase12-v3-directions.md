# Phase 12 (v3) — Three Directions for the Visual Reinvention

Status: Gate 2 of the v3 reinvention. The v2 "Bench Instrument" spec
(`phase12-design-spec.md`) and the dark navy shell documented in
`docs/PHASE_12_DESIGN_SYSTEM.md` are both treated as **failure references**, not
as starting points. Three structurally different directions, each differing from
the others in ≥4 of: theme, layout skeleton, surface model, signature element,
control language, page-structure grammar. Scores 1–5. The choice is made here.

Constraints applied to all three: `docs/UI_ANTI_SLOP_RULES.md`,
`docs/DOMAIN_GRAMMAR.md` R1–R10, ScenarioPage continuity (it is the product's
strongest surface and must not be redesigned), Guided Troubleshooting logic
untouched, no new dependencies, self-hosted OFL fonts only, no emoji, no
colour-only status, no icon-in-coloured-container, WCAG AA.

---

## Direction A — "Field Manual"

**Concept.** The product is a **service manual**. Every page is a manual page:
a heading sitting on a full-width rule, a numbered index with hanging indents,
marginal annotations carrying related cases and glossary terms, a red-free cool
paper stock. Home is the manual's *contents page* with the current work order
pasted in. No dark surfaces at all.

- **Palette:** cool paper `#F0F0EC`, ink `#14161A`, hairline `#D2D3CE`,
  single accent deep signal `#C2400A`, state colours as marks only.
- **Type:** Fira Sans (headings, body) + Fira Code (ticket ids, counts). Display
  headings set large and tight; section rules instead of labels.
- **Structure:** manual page → numbered contents → marginal apparatus.
  Progress = a bound log. Labs = a numbered register. KB = native home.
- **Signature:** the **rule-and-heading** device and the **marginal apparatus**
  (right-hand column of cross-references on every page).
- **Scores:** identity 3 · learnability 4 · hierarchy 5 · distinctiveness 3 ·
  technical credibility 3 · scales 5 · continuity 2 · grayscale 4.

**Why it loses.** A manual is a *reference* object, not a *lab* object. It never
says "hardware", "bench", "equipment". Its continuity with the dark simulation
is the worst of the three (light paper → dark stage with no mediating element),
and "editorial paper + index numbers" is itself a well-worn non-AI reaction
style — it trades one recognisable template for another.

---

## Direction B — "Steel-Framed Bench" ★ CHOSEN

**Concept.** The product is a **workbench seen from above**. Two **graphite
steel rails** (header and footer) clamp a **mineral bench floor**. Work happens
on **paper documents** laid on that floor, and every instrument — the equipment
preview, a diagnostic readout, the simulation itself — is a **dark well set into
the surface**. The steel rails lead directly into the dark simulation workspace,
so the shell frames the sim instead of competing with it.

- **Palette:** mineral floor `#E5E6E1` (cool, graded), paper `#FBFBF8`,
  graphite `#17191D`, hairline `#C9CAC4`, **one** signal accent `#C2400A`
  (safety orange — interactive/focus/active only), state colours on marks only.
  **No per-domain hues.** Disciplines are told apart by glyph and name.
- **Type:** Fira Sans (display/body) + Fira Code (ticket ids, counts, minutes,
  XP, readouts). Zero `text-transform: uppercase`. Display case title at
  `clamp(1.75rem, …, 2.5rem)` / 700 / -0.025em.
- **Structure per page:** Home = full-bleed **case band** (graphite job strip +
  document + instrument well) over an unequal **discipline station wall** over a
  log/queue split. Labs = **grouped case register** with sticky station headers.
  Knowledge = **library contents** grouped by track, articles as manual sheets.
  Progress = **record**: graphite summary slab, coverage tallies, session log.
  Settings = utility form on rule-and-heading sections.
- **Signature elements:** the **graphite job strip** across the case band, the
  **instrument well** set beside it, and the **coverage tally** (one small square
  per case, filled when verified) that replaces every progress bar.
- **Control language:** commit buttons are graphite slabs that go signal-orange
  when armed; secondary = paper + hairline; tool = raised graphite inside wells;
  destructive = paper + fault border. All 2px radius, ≥40px, colour-only hover.
- **Second-order slop check:** not dark-dominant (steel is rails/wells only);
  no uppercase; mono confined to values; accent is signal orange, not amber or
  cyan; paper is cool, type is sans (not the warm-paper+serit+terracotta set);
  borders are 1px; every number shown is engine-derived.
- **Scores:** identity 5 · learnability 5 · hierarchy 5 · distinctiveness 5 ·
  technical credibility 5 · scales 5 · continuity 5 · grayscale 5.

---

## Direction C — "Job Ticket System"

**Concept.** The product is a **repair shop's job board**. Every case is a
**ticket** with a signal-coloured header band, a perforated tear line, a stamped
state, and a job number. Home is today's ticket pinned to the board; Labs is the
board itself (columns by state); Progress is the punch-card time sheet.

- **Palette:** board grey `#DCDDD8`, ticket stock `#FFFFFF`, graphite `#1A1D21`,
  signal `#D8410F` ticket header, state stamps.
- **Type:** Fira Sans + Fira Code job numbers.
- **Structure:** ticket → board → punch card.
- **Signature:** the **ticket header band** + **rubber state stamp**.
- **Scores:** identity 4 · learnability 3 · hierarchy 3 · distinctiveness 5 ·
  technical credibility 3 · scales 2 · continuity 3 · grayscale 4.

**Why it loses.** Tickets do not scale: Knowledge is not a ticket board and
Progress is not a punch card, so two of five pages would be cosplaying a metaphor
they do not own. The perforation/stamp devices are *applied decoration* — the
brief bans fake technical ornament, and a tear line that tears nothing is the
same failure in paper form. It also solves "cases waiting for me" but says
nothing about equipment or diagnosis.

---

## Decision

**B — Steel-Framed Bench.**

- A lost on **identity** (a manual is a library, not a lab) and **continuity**
  (nothing mediates the jump into the dark simulation).
- C lost on **scales** (Knowledge and Settings break the metaphor) and on
  **decoration risk** (perforations, stamps, hazard bands are applied, not
  structural).
- B wins on the two axes the brief weights most: *product identity* — steel
  rails, a bench floor, paper work orders and instrument wells are literally a
  technician's bench — and *continuity* — the graphite rails and wells are the
  same material as the simulation workspace, so opening a lab is a change of
  focus, not a change of product. It is also the only direction whose signature
  survives greyscale (frame → paper band → dark well → unequal station bays →
  square tallies) and the only one with **one** accent hue and **zero**
  per-domain colours.
