# UX / Architecture Audit — Lab Environments

Independent, read-only audit of the eight lab environments (the seven original
labs plus the Phase 11 equipment bench) and the scenario shell, performed **after**
Phase 9H codified `docs/DOMAIN_GRAMMAR.md` and
`docs/UI_ANTI_SLOP_RULES.md`. Its purpose is to answer one question: *does each
lab actually behave like its domain, and where is the design converging back
toward generic AI-generated UI?*

- **Audit date:** 2026-09-27
- **Method:** code, not reports. Every finding cites a `file:line` confirmed by a
  direct read of the current file. Search-index results were treated as leads
  only (the index is offset by ~500 lines on `src/content/scenarios/index.ts`).
- **Scope:** `src/features/environments/**` (including `equipment/families/**`),
  `src/features/env/**`, `src/features/network/**`, `src/pages/**`,
  `src/content/schema/index.ts`, `src/content/scenarios/index.ts`,
  `src/content/scenarios/equipment/**`, `src/engine/conditions.ts`,
  `src/engine/simulation.test.ts`, `src/index.css`, `package.json`.
- **Status:** analysis only. **No application file was modified by this audit.**
- **Related (still binding):** `docs/DOMAIN_GRAMMAR.md` (rules R1–R10 + Part C
  grammars), `docs/UI_ANTI_SLOP_RULES.md` (permanent NO/YES checklist),
  `docs/UI_DESIGN_REVIEW.md` (Phase 9H review log),
  `docs/ENVIRONMENT_ARCHITECTURE.md`, `docs/3D_HARDWARE_ARCHITECTURE.md`,
  `docs/DATABASE_LAB_ARCHITECTURE.md`. This document is an **audit**; it changes
  no rule and grants no exception. Where it disagrees with a doc, it says so and
  proposes the doc correction rather than silently diverging.

---

## 1. Executive summary

The entry hypothesis for this audit was: *"Windows, Linux and Security share one
generic shell."* Verified against live code, that framing is **wrong in its
strong form and right in a narrower, more actionable one**.

**What is genuinely fine.** The three "OS-ish" labs are not clones in content.
Windows and Linux derive their tab lists from world keys
(`WindowsLab.tsx:77-85`), Linux renders a real `ls -l`-shaped tree with derived
`rwx` columns (`LinuxLab.tsx:25-62`), and Security gates every interpretive fact
behind an executed check (`SecurityLab.tsx:33-72`: nothing about the sender or
link renders until `mail.analyzed` at `:40`, nothing about the account until
`identity.failedAttempts` at `:34`). The Phase 9H evidence-tier work landed and
holds, and `UI_DESIGN_REVIEW.md:815` (item 5, "22/33 gated") remains accurate.

**What actually broke.** Some of this divergence is on the record and was
decided deliberately: `UI_DESIGN_REVIEW.md:764-765` (item 9I-1) states plainly
that `HardwareLab`/`NetworkLab`/`DatabaseLab` roots are `LabSection` +
`overflow-hidden` (fixed height ≥1024px) while `WindowsLab`/`LinuxLab`/
`SecurityLab` roots are plain `.panel` flex columns, and the remedy chosen was
`overflow-y-auto` on those three — not a shared stage. `consoleLabLayout.test.tsx`
now locks that shape in (3 tests: `overflow-y-auto` present + a `role="status"`
region named "Diagnostic checks" in all three labs). What was **never** logged as
a decision, and what no test protects, is the disappearance of the world-derived
header `status` line from those labs: R2 ("every environment value derives from
`run.world`") was satisfied there by deleting the value instead of deriving it,
and `UI_DESIGN_REVIEW.md:609` shows the mechanism — the anti-slop pass removed
badge-shaped noise ("shell available") from the header with "header is domain text
only" as the stated remedy, and nothing re-derived the state that badge carried.

1. **The stage contract now has two tiers.** Hardware, Network and Database keep
   `LabSection` + a fixed stage wrapper + a world-derived header `status` + a
   dedicated inspector. Windows, Linux and Security are plain scrollable panels
   with no world-derived status; Support dropped the stage entirely. The
   panel/scroll half of that split is a documented decision (9I-1, tested); the
   missing **status** half is not, and it is the half R2 governs.

| Lab | `LabSection` | fixed stage | header `status` from world | inspector surface | in-stage tool rail |
|---|---|---|---|---|---|
| Hardware | yes | `.hw-stage-wrap` | yes (POST / partial / no power) | `.hw-inspector` | chain strip + legend |
| Network | yes | `.net-stage-wrap` | yes (`netStatus`) | `.net-inspector` | probe chips |
| Database | yes | `.db-stage-wrap` | yes (layer verdict) | `.db-inspector` | `.db-checks` |
| Equipment bench | yes (`EquipmentLab.tsx:101`) | device SVG/3D stage | yes (`family.status(state)` → `status={status}` `:90-91,111`) | equipment inspector hotspot | chain strip |
| Windows | no — `panel` + `panel-header` (`:88-91`) | no (scrolls) | **none** | no (inline box) | checks strip `role="status"` (`:215`) |
| Linux | no — same pattern | no | **none** | no | checks strip `role="status"` (`:299`) |
| Security | no — same pattern (`:77-80`) | no | **none** | no (2-col grid) | checks strip `role="status"` (`:82`) |
| Support | no — `panel` (`:88`) | no (`max-h-64` chat, `:96`) | **none** | none | none |

> The `role="status"` regions in the last column are **checks strips**, not
> status lines: they hold diagnostic buttons plus a "done" mark
> (`WindowsLab.tsx:215-230`, `LinuxLab.tsx:299-310`, `SecurityLab.tsx:82-99`).
> They satisfy the live-region requirement; they carry no world state, so they
> are not the R2 status surface. Hardware's equivalent is a real one —
> `status={{ tone: overallTone, label: overallLabel }}` (`HardwareLab.tsx:813`).

2. **Two domains hide their core object.** `SupportLab` never reads
   `run.world` at all — the only `run` field it touches is
   `appliedActions.length` (`:244`). The printer ticket models
   `printer.online / queuePaused / tonerLow / paperJam / verified` and
   `diagnostics.checkedQueue / resumedQueue`
   (`scenarios/index.ts:4658-4668`), the lockout ticket models
   `identity.lockoutActive / passwordReset / failedAttempts` (`:4848-4855`), and
   none of it is on screen. `SecurityLab` never renders the email:
   `senderDisplay`, `subject` and `hasAttachment` are authored
   (`scenarios/index.ts:5326-5336`) and unreachable in the UI, while only the
   *verified* `senderDomain` / `linkHost` appear, post-check (`SecurityLab.tsx:40-43`).
   In both, the learner manipulates a domain they cannot see.

Severity spread: **2 × P0**, **7 × P1**, **4 × P2**, **1 × P3** (14 findings).
Detail in §2, per-domain conformance in §3, root causes in §4, prioritised
recommendations in §5, definition-of-done checklist in §6, phased plan in §7,
method and sources in §8.

---

## 2. Findings ledger (evidence only)

> **Findings vs recommendations.** This section records what the code does today,
> with proof. The *Minimal fix* lines are **proposals, not work in progress** —
> nothing in this document has been implemented, and no source file was touched.
> Consolidated, prioritised recommendations live in §5; the not-yet-started
> delivery plan is §7.

| ID | Sev | Domain | Finding (one line) | Primary evidence |
|---|---|---|---|---|
| F1 | **P0** | Support | Lab never reads `run.world`; device state invisible, fixes unobservable | `SupportLab.tsx:88-249` (`run` touched only at `:244`); world keys `scenarios/index.ts:4658-4668`, `:4848-4855`, `:5064-5075` |
| F2 | **P0** | Security | The email artifact is never rendered — the domain's core object is absent | `SecurityLab.tsx:33-72` (rows built from `mail`/`identity`/`endpoint` only) vs `scenarios/index.ts:5326-5336` |
| F3 | P1 | Support | Hardcoded generic concept chips rendered in every ticket regardless of domain | `SupportLab.tsx:212` (`["dns","evidence","permissions","gateway"]`) |
| F4 | P1 | Shell | "Tools" (topbar) and "Actions" (dock) are the same drawer, same icon, both always visible | `ScenarioPage.tsx:444-451`, `:898-908` |
| F5 | P1 | Shell | "Hint" consumes a hint, "Hints" opens a drawer — same icon, same `n/m` badge, opposite behaviour | `ScenarioPage.tsx:437-443`, `:917-927` |
| F6 | P1 | Hardware | Instruction copy survived here (and in the equipment bench) after being scrubbed from every other lab | `HardwareLab.tsx:812`; `EquipmentLab.tsx:110` (identical fallback); `HardwareLabView.tsx:218-221` |
| F7 | P1 | Hardware | Bench SVG renders at illegible scale (`viewBox 420×280`, font 5–8 units, `width:100%`) | `HardwareLab.tsx:423-425`, `:268-275`, `:433`, `:663-672`; `index.css:1992-1995`, `:2023-2028` |
| F8 | P2 | Hardware | Quick-select legend unmounts whenever an inspection is open — the only keyboard-reachable selection path in the 3D stage | `HardwareLab.tsx:872`, `:892-924`; `HardwareLabView.tsx:153-171` |
| F9 | P1 | Hardware | Permanent label spam + raw world strings in-scene; truthy-string guard paints `beep: none` as a warning | `HardwareLab.tsx:663-672`; authored `beepCode: "none"` at `scenarios/index.ts:415`, `:527`, `:778`, `:1010` |
| F10 | P2 | Shell | Landing page sits outside grammar governance: KPI trio + 3 feature cards + 19 inline hex values | `HomePage.tsx:50-87`, `:89-111`, `:113-140`; hex literals at `:32,52,57,62,65,67,73,77,80,83,91,93,100,105,107,115,121,130,133` |
| F11 | P2 | Content↔UI | `environment.components` is honoured only by Hardware + equipment benches; the 13 tool-panel values content actually uses change nothing on screen | `schema/index.ts:224-276`; predicate at `HardwareLab.tsx:779`, `HardwareLabView.tsx:121`, `EquipmentLab.tsx:94`; content `scenarios/index.ts:1249`, `:2168`, `:3256`, `:4845`; assert-only test `src/engine/simulation.test.ts:44-51` |
| F12 | P2 | All | Interaction kit is copy-pasted, not shared — four divergent checks-strip markups, two tab implementations, three inspectors | `WindowsLab.tsx:215-230`, `LinuxLab.tsx:299-310`, `SecurityLab.tsx:82-99`, `DatabaseLab.tsx:305-307`; inspector styles `.hw-inspector` / `.net-inspector` / `.db-inspector` (`index.css:1998-2008`) |
| F13 | P3 | Hardware | Interactive `<g>` inside `<svg role="img">` risks unnamed focus targets | `HardwareLab.tsx:423-429`, `:88-96`, `:171-178`, `:473-480` |
| F14 | P1 | Content↔Engine | Two printer vocabularies exist: the support ticket's `printer.*` keys are disjoint from the keys the printer bench and engine derivation use, so the renderer that already exists cannot show the ticket's device state | `scenarios/index.ts:4658-4668` vs `engine/conditions.ts:128-146` and `equipment/families/printer.ts:34-48,143-155` |

### F1 — Support lab is world-blind (P0)

`SupportLab.tsx` contains **zero references to `run.world`.** The component is:
a persona header (`:89-94`), a message log capped at 256 px
(`:96 max-h-64 overflow-y-auto`), an optional mentor-evaluation strip
(`:117-132`), then three stacked free-text forms — *Ask customer* (`:136-168`),
*State diagnosis / next step* (`:170-189`), *Ask mentor a concept* (`:191-237`)
— plus a *Mentor tip* button and an applied-steps counter (`:239-246`).

For `printer-isnt-printing`, whose verification steps are
`printer.verified === true` and `printer.queuePaused === false`
(`scenarios/index.ts:4786-4790`), every fact the learner needs is authored and
rendered nowhere: `printer.online / queuePaused / tonerLow / paperJam / verified`
plus `diagnostics.checkedQueue / resumedQueue` (`:4658-4668`). The account
lockout ticket is the same story with `identity.lockoutActive / passwordReset /
mfaReset / loggedIn / failedAttempts` (`:4848-4855`) — and `failedAttempts: 8` is
a tier-1 fact that `SecurityLab` would happily display in a security scenario
(`SecurityLab.tsx:34-36`) but `SupportLab` never can. The learner resumes a queue
and the screen does not change.

This violates **R2** (simulation-first: a fix that patches the world must change
something the learner can see) and it is **doc drift**:
`ENVIRONMENT_ARCHITECTURE.md:49` lists the Support surface as "Ticket + customer
chat + **device/account state strip**", `:77` claims routing produces a "domain
visual (printer/identity strip) + SupportLab", and `DOMAIN_GRAMMAR.md:219` lists
"printer/identity facts in a strip" as a core object. `EnvironmentRenderer.tsx`
has no such branch — `category === "support"` routes straight to `SupportLab`
(`EnvironmentRenderer.tsx:55-120`).

**Minimal fix.** A `run.world`-derived device strip above the conversation: one
row per whitelisted device key, rendered through `formatValue()`, tone from
engine state, whole section omitted when it has no rows (R5). The chat is the
*conversation*, the strip is the *machine*; both belong on screen.
**Verification:** apply `resume-queue` in a component test and assert a visible
`Queue: resumed` row replaces `Queue: paused`.

### F2 — Security lab never shows the email (P0)

`SecurityLab.tsx:40-43` renders exactly two facts for the mail case, and only
after analysis: `mail.senderDomain` and `mail.linkHost`. The content authors
`senderDisplay`, `subject`, `linkHost`, `hasAttachment`, `analyzed`, `reported`
(`scenarios/index.ts:5326-5336`). **None of the artifact is rendered.** The
learner is asked to judge a message they have never seen, from buttons labelled
"Analyze sender domain" / "Check link".

Phishing pedagogy *is* the gap between tier-1 observations (what the message
claims to be: display name, subject, attachment, the host the link text shows)
and tier-2 verdicts (what it actually is: verified domain, authenticity). Gating
tier 2 is correct and already works; gating tier 1 turns the domain's single
teaching move into a button-press quiz, because the only "evidence" on screen is
the list of checks that were run. The grammar's Part C for security names core
objects as "message artifacts, account, surface, timeline"; today there is no
artifact at all, and `UI_ANTI_SLOP_RULES.md`'s SOC-board intent is unmet.

**Minimal fix.** Make an artifact pane the dominant stage region: header block
(from / to / received), subject, body, attachment chip, and a link chip showing
the **displayed text and the resolved host side by side**. Tier-1 fields render
immediately; verdicts stay behind `mail.analyzed`. Render the pane only when
`world.mail` exists so identity-only cases keep their own layout (R5).
**Verification:** assert the subject text is present before any action, and that
`senderDomain` is absent before `analyze-sender` and present after.

### F3 — Generic concept chips in a printer ticket (P1)

`SupportLab.tsx:212` hardcodes `["dns", "evidence", "permissions", "gateway"]`
into a chip row with "Learn" links. In `printer-not-printing` the learner is
offered *"What is DNS?"*. The chips are not derived from the scenario, the world,
or the ticket's KB relevance — they are constant across every ticket, which is
the definition of a filler affordance. Violates R5 (no surface without a data
source) and R8.

**Minimal fix:** derive the chips from scenario data (concepts named by the
ticket's KB articles or its action set) or delete the row — the dock already has
a **Learn** drawer.

### F4 / F5 — The shell labels one thing twice (P1)

`ScenarioPage.tsx:444-451` renders a topbar button labelled **Tools** with a
`ListChecks` icon that calls `toggleDock("actions")` with
`aria-pressed={dock === "actions"}`. At `:898-908` the dock bar renders a button
labelled **Actions** with the *same* `ListChecks` icon, the *same* handler and the
same `aria-pressed`. Two names, one drawer, both permanently on screen.

`:437-443` renders **Hint** (`Lightbulb`, `onClick={hint}`, counter
`hintsUsed.length/hints.length`) — an *irreversible* action that consumes a hint.
`:917-927` renders **Hints** (same `Lightbulb`, same `n/m` badge shape) — a
*reversible* action that opens the drawer (section header "Hints", `:716`).
Identical iconography and identical counters for behaviours of opposite cost is
the kind of affordance error learners attribute to themselves rather than to the
UI. Violates R4/R8.

**Minimal fix:** one label per drawer; top level wins; the dock button becomes a
chevron or is dropped when the topbar already exposes it. Rename the drawer to
**Hint history** with a distinct icon, and never print the same `n/m` badge on
both controls.

### F6 — Instruction copy survived in the bench labs (P1)

`HardwareLab.tsx:812`: `subtitle={stageLabel ?? "click a part to inspect"}`.
`HardwareLabView.tsx:218-221`: `"3D workbench — drag to orbit, click a part to
inspect"`. The second string is the literal example banned at
`UI_ANTI_SLOP_RULES.md:35`. Phase 9H deleted this class of copy from the Windows,
Linux, Security and Database stages; it survived the hardware pass because
`stageLabel` is threaded down from the 3D view and the `??` fallback only
appears in the 2D path. The identical fallback line is duplicated verbatim in the
equipment bench — `subtitle={stageLabel ?? "click a part to inspect"}`
(`EquipmentLab.tsx:110`) — so the copy is now the subtitle policy for two of the
eight surfaces, and any fix has to be applied in two places unless `LabSection`
itself owns the fallback (it should not: R8 wants no instruction copy at all).

**Minimal fix:** `subtitle={stageLabel}` in both files — keep the orbit hint
(manipulation really is non-obvious in 3D), drop "click a part to inspect" (the
hotspots and the inspector teach that within one click).

### F7 — The bench diagram renders below reading size (P1)

`ChassisSvg` is authored in a `viewBox="0 0 420 280"` (`:423-425`) and laid out
with `width: 100%` (`.hw-svg-wrap .hw-bench-svg` `index.css:1992-1995`;
`.hw-bench-svg` `index.css:2023-2028`). Its in-scene text is set in SVG user
units of **5 to 8** — verified samples: DIMM slot ticks `fontSize="5"`
(`:268-275`), `REAR I/O + PCIe` `6` (`:456`), `LIVE`/`OFF` `6` (`:495`), `AC` `6`
(`:513`), `24-pin` `6` (`:589`), `EPS 8-pin` `6` (`:603`), `WORKBENCH` `7`
(`:433`), `STRIP` `7` (`:492`), `PSU` `7` (`:573`), the beep and power-event
strings `7` (`:664`, `:669`), POST badge `8` (`:651-661`). A 420-unit-wide
viewBox stretched across a 900 px stage scales text by ~2.1×
(≈10–17 px, marginal); on a phone-width stage the scale drops under 1× and the
same labels render at **4–8 px**. There is no `@media` or container-query
counter-scale anywhere in the CSS for these labels. R1's 10 px floor is
therefore bypassed by geometry rather than by class choice, which is exactly how
this class of violation escapes a grep-based checklist.

**Minimal fix:** pick one — (a) reduce the viewBox to the meaningful region and
raise all sizes into 10–14 units, (b) render labels as positioned DOM
(`.hw-label` overlays) so they inherit the type scale, or (c) keep SVG labels but
set `font-size` in `px` via CSS (`font-size: 11px` on `.hw-bench-svg text`) which
does not scale with the viewBox. Option (c) is a two-line change; (b) is the
correct one if labels keep growing.
**Verification:** measure rendered label height at 375 px viewport in DevTools.

### F8 — The selection surface unmounts while an inspection is open (P2)

`:872` is a ternary: while `selectedHotspot` is truthy the `.hw-inspector`
`<aside>` renders **instead of** the `.hw-legend` quick-select (`:892-924`). The
legend is documented as the keyboard-equivalent selection path
(`ENVIRONMENT_ARCHITECTURE.md:64`), so the moment a learner selects a part, the
only remaining way to reach another part is to press *Close* (`:883-889`) and tab
back through the stage. Selection-light domains (Windows/Linux rows, DB ladder
rungs) keep their selection surface visible at all times; hardware turns it into a
mode. In the 3D stage the cost is higher, because the R3F scene exposes no
accessible part list of its own (`HardwareLabView.tsx:153-171` renders the scene
plus camera-preset buttons only) — the legend chips are the sole keyboard path to
a *different* component, and they are exactly the thing that disappears.

Secondary: legend chips label themselves with `id.replace(/-/g, " ")` (`:919`),
producing lowercase machine identifiers — `power supply`, `cpu cooler`,
`front panel` — where `benchHotspot.ts` already holds human labels (`GPU seated`,
`Beep code`, …). Violates R1 (domain nouns, human-readable labels).

**Minimal fix:** render legend and inspector simultaneously (inspector as an
overlay, legend as a persistent bottom rail with `aria-pressed`), and feed chip
labels from the hotspot identity map.

### F9 — Label spam, raw world strings, and a warning that isn't one (P1)

Three distinct problems in one region:

1. **Permanent label spam.** At least fourteen `<text>` elements are always on:
   `WORKBENCH` (`:433`), `REAR I/O + PCIe` (`:456`), `STRIP` (`:492`),
   `LIVE`/`OFF` (`:495`), `AC` (`:513`), `PSU` (`:573`), `STBY` (`:571`), `24-pin`
   (`:589`), `EPS 8-pin` (`:603`), the POST badge (`:651-661`), plus per-slot DIMM
   names (`:268-275`) — and every one of them stays lit whether or not the learner
   is inspecting anything.
   `3D_HARDWARE_ARCHITECTURE.md:13` forbids exactly this for the 3D scene
   ("inspection callouts are contextual, never permanent label spam"); the 2D
   scene was never held to it, so the two views of the same world read as
   different products.
2. **Machine identifiers as learner copy.** `{String(bench.beepCode)}` (`:665`)
   and `{String(bench.lastPowerEvent)}` (`:670`) paint raw world strings into the
   scene, bypassing `formatValue()`/label maps that the inspector uses
   (`benchHotspot.ts:15,20` map those keys to "Last power event" / "Beep code").
   R6 bans this. Content values are already narrative — `"thermal shutdown 14:32"`
   (`scenarios/index.ts:780`), `"no boot device found (F1)"` (`:1015`) — and they
   arrive as unlabelled decoration at 7 units. The same leak appears in the
   header: `scenario.environment.availableTools.join(" · ")` (`:817`) prints
   tool ids such as `hardware-bench`; `EquipmentLab.tsx:115` duplicates it.
3. **A warning that is not a warning.** `:663` guards with
   `Boolean(bench.beepCode)`, but the authored value for "no beeps" is the
   **string `"none"`** (`scenarios/index.ts:415`, `:527`, `:778`, `:1010`), which
   is truthy. Every scenario whose world or whose repair patch sets it therefore
   draws **`beep: none` in `C.warn`** — a warning-coloured label asserting a fault
   that does not exist, inside a lab about interpreting beep codes. (The
   legitimate value at `:324`, `beepCode: "one-short"`, shows the field is meant to
   carry codes, not statuses — so the guard needs a code-aware check, not a
   `!== "none"` patch.)

There is also a view-parity break: `3D_HARDWARE_ARCHITECTURE.md:127-129` declares
`beepCode` and `lastPowerEvent` *evidence-only* in 3D, while the 2D scene paints
them as in-scene text — so flipping 2D ↔ 3D silently changes the evidence set.

**Minimal fix:** route both strings through the existing label map, tone from
engine state (no beep → no label, or a neutral "POST beep: none" row in the
inspector), move them out of the scene into the inspector/chain strip, and gate
the label-spam set behind the same `selected`/hover condition the 3D callouts use.

### F10 — The shell pages are ungoverned (P2)

`docs/DOMAIN_GRAMMAR.md` and `UI_ANTI_SLOP_RULES.md` are written as if their
scope were "labs". `HomePage` is outside that scope and reads like a different
product: a hero panel (`:15-48`), a **KPI trio** — Labs / Completed / XP, big
`text-3xl font-mono` numbers with a progress bar (`:50-87`) — and a **row of
three feature cards** (`:89-111`). Both are the default LLM landing-page
composition. It also hardcodes **19 hex literals** in inline `style` props
(`#94a3b8` ×13 at `:32,52,57,62,67,77,83,93,100,107,115,130,133`; `#38bdf8` ×3 at
`:80,91,121`; `#22c55e` ×2 at `:65,73`; `#fbbf24` ×1 at `:105`) plus two `rgba()`
gradients in the hero wash (`:21`), duplicating values that already exist as
`--color-lab-*` and `--color-ok` tokens. `App.tsx:91` has one more. Consequence: the palette can be
re-tokenised and the landing page will not follow.

Progress reporting on a landing page is legitimate; the *KPI-tile* framing and the
constant three-card row are not. **Minimal fix:** swap tokens, and replace the
feature-card row with something true about this product (the seven domains as
lab doors, or the current in-progress ticket as a single "resume" surface).

### F11 — `environment.components` is a promise two lab families keep (P2)

The schema accepts **47** component ids (`schema/index.ts:224-276`) in three
groups: 8 PC parts (`wall` … `front-panel`), 23 equipment parts
(`printer*`, `router*`, `switch*`, `access-point`/`ap-*`, `ups*`, `patch-panel`,
`wall-jack`, `ethernet-cable`), and 16 tool/panel names (`event-viewer`,
`task-manager`, `services`, `device-manager`, `filesystem`, `process-list`,
`package-manager`, `service-manager`, `network-topology`, `packet-inspector`,
`dns-inspector`, `evidence-board`, `email-client`, `log-viewer`, `ticket-inbox`,
`customer-chat`).

Content authors all three groups: network scenarios declare
`["network-topology","dns-inspector","packet-inspector"]`
(`scenarios/index.ts:3256`, `:4300`); the lockout ticket declares
`["ticket-inbox","customer-chat","evidence-board"]` (`:4845`); the equipment packs
declare their parts (`equipment/accessPoint.ts:41`, `equipment/patch.ts:42`,
`equipment/printer.ts:40`).

Exactly **three** call sites read the field — the same two-line predicate pasted
three times, under two names (`compVisible` in the hardware pair, `visible` in the
bench): `HardwareLab.tsx:704` + `:779-780`, `HardwareLabView.tsx:120-122`,
`EquipmentLab.tsx:93-95`.

```ts
// pasted verbatim, with only the identifier changed
const components = scenario.environment.components as string[];
const visible = (id: string): boolean =>
  components.length === 0 || components.includes(id);
```

So the 8 PC ids and the 23 equipment ids work; **the 13 tool/panel ids that content
actually declares are inert** — no Windows, Linux, Network, Support, Security or
Database code reads the array. Consequences: `dns-inspector` and `packet-inspector`
have never existed as named surfaces (NetworkLab always renders its topology plus
one inspector), `email-client` is unimplementable while F2 stands, and
`ticket-inbox` is silently ignored while `customer-chat` renders whether declared or
not. Three enum values — `service-manager`, `email-client`, `log-viewer` — are
declared in the schema and used by no scenario at all.

Two documents tell authors the opposite. `CONTENT_AUTHORING.md:19` makes
"`environment.components` listing preferred domain panels" a checklist item, and
`SIMULATION_ARCHITECTURE.md:30-31` calls `components[]` plus
`environment.showInspector` / `showTerminal` "layout toggles" — `showInspector`
(`schema/index.ts:277`, `true` in every scenario that sets it) likewise has no
consumer anywhere in `src/`. Meanwhile `src/engine/simulation.test.ts:44-51`
asserts `filesystem`, `network-topology` and `event-viewer` **are present** on
those scenarios, which converts an inert field into *false confidence*: the suite
green-lights a surface that never reaches the screen.

**Minimal fix (either direction is acceptable, but pick one):** implement a
`componentId → surface` registry each lab consults (the tool/panel group maps
naturally onto existing Windows/Linux/Network views: `event-viewer`, `services`,
`process-list`, `filesystem`…), or delete the unimplementable values from the enum
and from the authoring checklist so authors cannot write fiction. Either way,
replace the content-shape assertion in `simulation.test.ts` with a renderer-side
test that fails when a declared component id has no consumer, and fold the
triplicated predicate into one helper next to `formatValue()`.

### F12 — The interaction kit is copied, not shared (P2)

Windows and Linux build the same inline tab strip by hand
(`WindowsLab.tsx:92-110`, mirrored in `LinuxLab.tsx`), and the "checks strip"
exists in four mutually incompatible markups: `WindowsLab.tsx:215-230`
(`btn-secondary` stack), `LinuxLab.tsx:299-310` (identical copy),
`SecurityLab.tsx:82-99` (same copy inside a grid cell with a conditional
`md:col-span-2`), `DatabaseLab.tsx:305-307` (`.db-checks` chips). All four carry
the same `role="status" aria-label="Diagnostic checks"` contract, which is exactly
why the divergence is invisible to the test that guards it
(`consoleLabLayout.test.tsx`). Inspectors are implemented three times
(`.hw-inspector` / `.net-inspector` / `.db-inspector`, `index.css:1998-2008`) over
one shared `InspectDock`, and the `environment.components` visibility predicate is
pasted three times (F11). R7 exists precisely to stop this; the shared primitives
(`LabSection`, `Chain`, `InspectDock`) landed, but the mid-level kit (tabs, check
rails, status line) did not, and every new domain re-decides them — which is the
mechanism by which three domains ended up with no world-derived status line.

**Minimal fix:** extract `LabTabs`, `LabChecks`, `LabStatus` from the three best
existing implementations (db/net for status, db for checks, Windows for tabs) and
migrate all seven labs. This makes "no status line" structurally impossible.

### F13 — Focus targets inside an image role (P3)

`ChassisSvg` opens `<svg role="img" aria-label="Open PC chassis on workbench with
power path">` (`:423-429`) and its children are interactive groups, e.g.
`<g className="hotspot" role="button" tabIndex={0} aria-label="Motherboard"
onKeyDown=…>` (`:88-96`, and the same shape at `:171-178`, `:226-233`,
`:287-294`, `:324-331`, `:366-373`, `:473-480`, `:520-527`). Chrome prunes the
subtree of `role="img"` from the
accessibility tree, so these focusable nodes may be announced as unnamed or not
at all. **Needs browser confirmation** (axe DevTools + keyboard walk) before it is
treated as fact — it is reported here as a structural risk, not a verified
failure. Note also that the keyboard handlers accept `Enter` only (`:178`,
`:233`, `:294`, `:331`), never `Space`, which a native button would.
**Minimal fix if confirmed:** drop `role="img"` on the container (keep
`aria-label` via `aria-labelledby` on a wrapper) and keep `role="button"` on the
groups.

### F14 — Two printer vocabularies, one of them invisible (P1)

The codebase already contains a printer bench, and the support ticket does not
speak its language.

- The engine derives observable printer state —
  `powerOk`, `netLink`, `printReady` — from `powerOn`, `powerCableSeated`,
  `netCableSeated`, `netPortOk`, `netEnabled`, `addressOk`, `paperOk`, `tonerOk`,
  `doorClosed`, `spoolerRunning`, `jamPresent`, `queuePaused`
  (`engine/conditions.ts:128-146`, "Equipment causality (Phase 11)").
- The bench renders exactly those keys through family metadata with human labels
  and tone (`equipment/families/printer.ts:34-48` visuals/status,
  `:143-155` label map: `printReady` → "Ready to print", `jamPresent` → "Jam",
  `spoolerRunning` → "Spooler"), and `EquipmentLab.tsx:91-95` puts the verdict in
  the header status.
- The support ticket `printer-isnt-printing` instead authors `online`,
  `queuePaused`, `tonerLow`, `paperJam`, `verified` plus
  `diagnostics.checkedQueue/resumedQueue` (`scenarios/index.ts:4658-4668`) — only
  `queuePaused` is shared — and routes to `SupportLab`, which reads no world at all
  (F1).

So the failure is doubly expensive: the learner cannot see the device (F1), *and*
the renderer that would show it cannot be reused without a key migration, because
`paperJam` vs `jamPresent` and `tonerLow` vs `tonerOk` are inverted in name as well
as spelling. Nothing in the schema, the engine, or the tests catches the mismatch:
`initialWorld` is `z.record(z.string(), z.unknown())` (`schema/index.ts:221`), so
any key name validates. The same latent hazard exists for every future
conversation-first domain that also has a bench.

**Minimal fix:** migrate the support ticket's `printer.*` keys to the equipment
vocabulary (or add a one-line alias map in the ticket path), then render the strip
F1 asks for by reusing `printerFamily`'s label/status functions instead of
inventing a third vocabulary. **Verification:** a test that asserts every key in a
scenario's `initialWorld.<namespace>` appears in that namespace's known key list —
which would have caught this before it reached content.

---

## 3. Per-domain conformance matrix

Graded against `docs/DOMAIN_GRAMMAR.md` Part A (R1–R10) and Part B (stage shape),
as of the commit this audit was read from. ✅ holds · ⚠️ partial · ❌ violated.

| Surface | Part B stage shape | R2 world-derived | R3 tiers | R4/R7 kit | R5 conditional | R6 text | R8 labels | Findings |
|---|---|---|---|---|---|---|---|---|
| Hardware | ✅ full-bleed stage + inspector | ✅ `bench.*` incl. header status `:813` | ✅ gated `memTest*` | ⚠️ own legend/inspector ternary | ✅ `compVisible` | ❌ raw `beepCode` / `lastPowerEvent` | ⚠️ chip ids as labels, `C.warn` on `"none"` | F6–F9, F13 |
| Equipment bench (6 families) | ✅ device stage + inspector | ✅ `family.status(state)`, derived in `conditions.ts:125-146` | ✅ `*Checked`/`*Traced` reveal gates documented at `:118-124` | ✅ own but consistent | ✅ `visible` `:93-95` | ✅ label maps in `families/*.ts` | ✅ | — |
| Network | ✅ topology + probes + inspector | ✅ `netStatus` | ✅ probe-gated | ✅ | ✅ | ✅ | ✅ | — |
| Database | ✅ ladder + inspector | ✅ layer verdict status | ✅ `UNTESTED` layers | ✅ `.db-checks` | ✅ | ✅ | ✅ | — (F12 duplication) |
| Windows | ⚠️ tabbed console, no fixed stage, **no status** | ❌ status line absent | ✅ | ✅ checks strip `:215-230` | ✅ conditional tabs `:77-85` | ✅ | ✅ | F12 |
| Linux | ⚠️ as Windows | ❌ | ✅ | ✅ `:299-310` | ✅ `ls -l` tree `:25-62` | ✅ `formatValue` | ✅ | F12 |
| Security | ⚠️ evidence board, no stage, **no status** | ❌ (world read ✅, status ❌, artifact ❌) | ✅ gates `:34-64` | ✅ `:82-99` | ✅ `rows.length > 0` `:115` | ✅ | ✅ | **F2**, F12 |
| Support | ❌ Part B requires "chat thread + inputs + **state strip**"; only the chat exists | ❌ never reads `run.world` | n/a (no artifact) | ❌ no strip at all | ❌ constant concept chips `:212` | ✅ | ❌ domain-blind chips | **F1**, F3, F14 |
| ScenarioPage shell | ✅ topbar → stage → dock | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ Tools/Actions + Hint/Hints | F4, F5 |
| HomePage | outside grammar scope (no rule covers it) | n/a | n/a | n/a | ✅ counts are real (`scenarios.length`) | ✅ | ❌ 19 inline hex | F10 |

**Reading of the matrix.** The failure is not "some labs are ugly". It is
directional: the three domains with the most explicit architectural
documentation (Hardware, Network, Database) and the newest one (Equipment) hold
every rule; the two *oldest* console labs and the two *human-facing* domains
(Security, Support) are where R2 and Part B leak. The audit's original
hypothesis — "Windows, Linux and Security look alike because they share a generic
shell" — is false; they look plain because the same two surfaces (stage, status)
went missing in each, independently, and nothing in the test suite notices.

**Strongest parts, for the record** (these should be the templates for the fix,
not rewritten): `dbState`'s UNTESTED-layer discipline; `netState`'s probe-gated
evidence; `equipment/families/*` as a data-driven renderer with one metadata file
per device (`families/printer.ts` maps keys → labels → tone with no scenario-id
branching anywhere); `LinuxLab.tsx:25-62`'s derived `rwx` columns;
`consoleLabLayout.test.tsx` as the pattern for cheap layout invariants.

---

## 4. Root causes

1. **The shared kit stops one level too high.** `LabSection`, `Chain`,
   `InspectDock`, `formatValue` exist; `LabTabs`, `LabChecks`, `LabStatus` do not.
   Every domain therefore re-implements tabs (2 copies), the checks strip (4
   copies) and the visibility predicate (3 copies, F11) — and a rule that is
   implemented by copy can silently lapse in one copy. That is exactly how the
   header status line disappeared from three labs while a differently-shaped test
   (`role="status"` = checks strip) stayed green.
2. **Deletion is the default remedy for slop, and nothing re-adds the missing
   signal.** `UI_DESIGN_REVIEW.md:609` removed the `"shell available"` badge with
   "header is domain text only" as the stated cure. The badge was implementation
   metadata (correctly removed), but the state it pointed at stayed unrendered, so
   R2 went from violated-ugly to violated-invisible. Anti-slop passes need a paired
   question: *what world fact now carries this meaning?*
3. **Content↔UI contracts are asserted on the content side only.**
   `src/engine/simulation.test.ts:44-51` checks that `environment.components`
   *contains* `filesystem` / `network-topology` / `event-viewer`, and
   `equipment/logic.test.ts:102-104` checks that `availableTools` *contains*
   `device-panel` / `inspection`; neither checks that a declared id reaches a
   renderer. Same asymmetry for `showInspector`
   (no consumer at all) and for the two printer vocabularies (F14): the engine
   derives `printer.powerOk / netLink / printReady` from keys
   (`conditions.ts:128-146`) that the support ticket never writes
   (`scenarios/index.ts:4658-4668` uses `online`, `paperJam`, `tonerLow`), and
   because nothing cross-checks engine keys against authored keys, the bench and
   the ticket drift apart invisibly.
4. **The docs are a second, unmaintained source of truth about the UI.**
   `ENVIRONMENT_ARCHITECTURE.md:49` still describes a Support "device/account state
   strip", `:77` promises a "domain visual (printer/identity strip) + SupportLab",
   `SCENARIO_ENVIRONMENT_MATRIX.md:38,61,62` says Phase 8H "adds device/account
   state strips so `printer.*` / `identity.*` are visible beside the conversation",
   and `DOMAIN_GRAMMAR.md:217-222` lists the strip as a core object and as the
   Support inspector. None of it exists in code. A reader of the docs would
   conclude F1 is already fixed; that is worse than an undocumented gap, because it
   closes the finding before anyone opens the file.

---

## 5. Consolidated recommendations (prioritised)

Ordered by learner impact per unit of change. Each item names the file to touch and
the test that would make the fix permanent. **None of these is implemented.**

| # | Action | Fixes | Target | Made permanent by |
|---|---|---|---|---|
| R-1 | Extract `LabStatus` (world-derived status line) and render it in Windows, Linux, Security | F12 + the R2 lapse | new `features/environments/LabStatus.tsx`, modelled on `HardwareLab.tsx:813` and DatabaseLab's layer verdict | layout test: change one `run.world` key in a test world, assert the rendered status text changes |
| R-2 | Render the authored email artifact (`senderDisplay`, `subject`, `body`, `hasAttachment`) behind the existing `mail.analyzed` gate | F2 | `SecurityLab.tsx:100-130` evidence column | render test: authored subject appears only after the analysis check is applied |
| R-3 | Add SupportLab's Part B "state strip": device/account facts read from `run.world`, tone from value | F1 | `SupportLab.tsx`, below the header, reusing `formatValue` | render test: `initialWorld.printer` → strip visible; empty world → strip absent (R5) |
| R-4 | One action-list label in the dock ("Actions"); drop the duplicate Tools tab | F4 | `ScenarioPage.tsx` dock tabs | test: dock exposes a label containing "Actions" and none containing "Tools" |
| R-5 | Singularize the hint control label | F5 | `ScenarioPage.tsx` hint control | same label test |
| R-6 | Migrate the support printer vocabulary onto the equipment keys and reuse `printerFamily` status/labels | F14, enables R-3 | `scenarios/index.ts:4658-4668` + `SupportLab.tsx` | content test: every `initialWorld` key of a namespace appears in that namespace's declared key list |
| R-7 | Decide `environment.components`: renderer registry **or** delete the 13 inert ids and the authoring-checklist line | F11 | `schema/index.ts:224-276`, `CONTENT_AUTHORING.md:19`, the three predicate copies | renderer-side test: every declared id has a consumer; replaces the content-shape assertion at `src/engine/simulation.test.ts:44-51` |
| R-8 | Fix the truthy guard (`beepCode !== "none"`) and route `beepCode` / `lastPowerEvent` through a label map | F6, F7 | `HardwareLab.tsx:663`, `:700-712` | unit test of the formatter: `"none"` → neutral tone + "No POST beep" text |
| R-9 | Extract `LabChecks` + `LabTabs`; migrate all seven labs; keep the `role="status"` semantics | F12, F3 | primitives extracted from `WindowsLab.tsx:92-110`, `:215-230`, `DatabaseLab.tsx:305-307` | the four divergent markups are gone; labs import the shared primitives |
| R-10 | Replace HomePage inline hex with existing tokens/classes | F10 | `pages/HomePage.tsx` (19 occurrences) | style rule: no `#[0-9a-f]{6}` in `src/pages/**` |
| R-11 | Confirm F13 in a browser, then fix `role="img"` and add `Space` activation | F13 | `HardwareLab.tsx:423-429` + hotspot groups | axe scan (needs a real browser; not runnable here) |
| R-12 | Correct the four stale doc claims from root cause 4 | F1 docs drift | `ENVIRONMENT_ARCHITECTURE.md:49,77`, `SCENARIO_ENVIRONMENT_MATRIX.md:38,61-62` | docs review: every "implemented / visible" claim carries a resolving `file:line` |

Deliberately **not** recommended: reworking Hardware, Network, Database or the
Equipment bench (they hold the rules — see §3); adding dependencies; any layout
change to Windows/Linux/Security beyond R-1/R-2/R-9, because their stage shape is a
logged, tested choice (see F12).

---

## 6. Definition of done (additive checklist)

For each lab touched by the remediation, all of the following must be true.
Nothing here asks for a new visual language — every item makes an existing rule
checkable.

- [ ] **R2** — at least one rendered value on the surface is a function of
      `run.world`, and flipping that key in a test world changes the rendered text.
- [ ] **R3** — any verdict/interpretation string sits behind the check that
      produces it; artifact rows (log lines, message headers) are not gated.
- [ ] **R4** — in-lab buttons are only `isDiagnostic` actions, or contextual
      promotions of currently-available fixes; no trap action appears outside the
      dock.
- [ ] **R5** — each tab/pane renders iff its world key exists; no empty placeholder
      for an absent key.
- [ ] **R6** — no `JSON.stringify`, no raw enum value, no untranslated key string
      visible to a learner.
- [ ] **R7** — tabs, list rows, checks and chips come from the shared primitives,
      not a local copy; every control is a native `button`, with `aria-pressed`
      where selection is stateful.
- [ ] **R8** — status carries colour **and** text; no implementation metadata
      (`kind`, `shell`, `panel only`); no how-to copy inside panels; domain nouns
      come from the scenario world.
- [ ] **R9/R10** — no new animation, no new dependency, no emoji; lucide icons stay
      `aria-hidden` beside text.
- [ ] **Contract** — every id/key a scenario authors (`components`,
      `initialWorld` namespaces) is consumed by a renderer, or removed from content
      and from the authoring checklist.
- [ ] **Docs** — any doc line that claims a surface exists is updated with a
      resolving `file:line`, or deleted.

---

## 7. Phased remediation plan (proposed — not started)

| Phase | Contents | Exit criterion | Cost |
|---|---|---|---|
| **P-A · Honesty** | R-4, R-5, R-8, R-10, R-12 | No duplicate/contradicting labels in any chrome; a healthy POST beep reads neutral; no hex literals in `src/pages/**`; docs no longer claim the Support strip exists | ~1 day, low risk |
| **P-B · World visible again** | R-1, R-2, R-3 — each driven by a scenario that needs it | Windows, Linux, Security and Support each render a world-derived status; SecurityLab shows the authored email after analysis; Support shows device state; the R2 layout test is green | ~2–3 days, medium |
| **P-C · One kit** | R-9, R-7, R-6 | The four checks-strip markups collapse into one; `components` / `showInspector` are either honoured or deleted; the printer vocabulary is unified | ~3–4 days, medium–high (touches every lab) |
| **P-D · Verify** | R-11 plus a manual keyboard walk of all eight surfaces, an axe scan, and target-size checks at 360/768/1440 | Recorded browser results replace the "needs confirmation" hedges in §2 | ~1 day, needs a browser |

P-A is independent of P-B/P-C and is safe to land alone. P-B is the phase that
actually changes learner experience. Nothing in any phase is done yet.

---

## 8. Method, sources, and limitations

**What was read.** All nine environment component files across the eight surfaces
(`HardwareLab.tsx`, `HardwareLabView.tsx`, `EquipmentLab.tsx`, `NetworkLab.tsx`,
`DatabaseLab.tsx`, `WindowsLab.tsx`, `LinuxLab.tsx`, `SecurityLab.tsx`,
`SupportLab.tsx`), the shared
kit (`LabSection`, `Chain`, `InspectDock`, `formatValue`), `engine/conditions.ts`,
`engine/simulation.ts` + its test, `content/schema/index.ts`,
`content/scenarios/index.ts` (30 scenarios across 8 categories, verified by
counting scenario-depth `category:` fields) and the equipment content packs
(`equipment/{accessPoint,patch,printer,router,ups}.ts`; 6 families in
`features/environments/equipment/families/`), `pages/{HomePage,ScenarioPage}.tsx`,
`index.css`, and the governing docs `DOMAIN_GRAMMAR.md`, `UI_DESIGN_REVIEW.md`,
`UI_ANTI_SLOP_RULES.md`, `ENVIRONMENT_ARCHITECTURE.md`,
`SCENARIO_ENVIRONMENT_MATRIX.md`, `CONTENT_AUTHORING.md`,
`SIMULATION_ARCHITECTURE.md`.

**How claims were checked.** Every `file:line` in this document was opened and read
at that line rather than inferred from a symbol index; findings were re-read after
each correction pass, because the document was revised iteratively and early
sections cited pre-correction line numbers. Two severities moved during that pass
and the reasons are recorded in the findings themselves: **F8 dropped P1 → P2**
because losing the quick-select legend while an inspection is open is a real
regression for the 3D stage, but the 2D SVG hotspots stay keyboard-reachable, so it
is a usability loss rather than a keyboard block; **F12 stayed P2** because the
divergence it describes is a logged, tested layout decision, and only the *unlogged*
half of that decision (no world-derived status line) is the actual defect.

**Limitations.** No browser, no screenshots, no axe scan, no Lighthouse, and no
runtime inspection were available in this environment, so nothing here describes
pixels — it describes markup, styles, state flow and tests. Visual conclusions
("reads as unfinished", "looks plain") are therefore only used where a *missing*
surface explains them, and every such statement is paired with the code that omits
the surface. Type-scale, focus-ring and touch-target claims were read from
`index.css` rather than measured. F13, and any statement about how a screen reader
announces the hardware hotspots, requires the P-D browser pass before being trusted.

**What this audit deliberately does not claim.** It does not claim the labs are
bad — §3 records five surfaces that satisfy every rule, and the equipment bench is
the pattern the rest should follow. It does not claim the plain console labs were
accidents: `UI_DESIGN_REVIEW.md:764-765` documents that choice and
`consoleLabLayout.test.tsx` protects it. The finding is narrower and more
actionable: **the deliberate half of that split was logged; the other half — status
lines removed in the same anti-slop pass, an unreachable authored artifact, a
never-rendered conversation state — was not, and no test distinguishes the two.**





