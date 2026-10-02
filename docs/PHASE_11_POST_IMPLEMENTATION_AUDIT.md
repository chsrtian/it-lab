# Phase 11 — Post-Implementation Adversarial Audit

**Scope:** read-only architecture / content / quality audit of the IT Equipment Lab
expansion. No source was modified. No browser was launched. No E2E was run.
**Method:** direct reading of the current repository, plus `npm test`,
`npm run typecheck`, `npm run lint`, `npm run build` and inspection of the emitted
`dist/assets` chunk graph.

**Verified locally**

| Gate | Result |
|------|--------|
| `npm test` | 261 passed / 20 files |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run build` | success |
| Entry chunk contains `WebGLRenderer` | **false** (three.js correctly absent) |
| Equipment 3D chunking | 6 per-family chunks + shared `core-*.js` — confirmed |

---

## 1. EXECUTIVE AUDIT

### Overall architectural condition

Phase 11 is **genuinely integrated, not superficially layered** — but only on the
axes it chose to own, and the integration stops precisely at the visual layer.

What is real and holds up:

- The **family model is a real abstraction**, not a naming convention. Six
  `FamilyDef` modules own one world namespace, one component vocabulary, one
  chain, one status function, and one evidence table each. No renderer contains a
  scenario-id branch. `EnvironmentRenderer.tsx:57` routes on `deviceFamily`/`kind`
  only, and `logic.test.ts:93-121` proves the `kind ⟺ deviceFamily` invariant across
  all 61 scenarios. `ScenarioPage` genuinely is untouched by equipment
  (its only environment import is `EnvironmentRenderer`).
- The **engine causality layer is correct and load-bearing.** `deriveEquipment()`
  in `src/engine/conditions.ts:125-232` is the single authoritative source for
  every derived flag in all six families, and it is the *only* place those flags
  are computed. `logic.test.ts:124-131` asserts `deriveWorld(initialWorld)` is a
  no-op for all 31 seeds — a genuinely strong invariant that catches content drift
  at test time.
- The **component vocabulary is now drift-proof.** `partIds.ts` ↔
  `FAMILIES[…].components` parity is asserted
  (`equipmentExpansion.test.tsx:106-121`), family components are asserted against
  the shared `focusTarget` enum (`logic.test.ts:47-70`), and I confirmed by hand
  that **every one of the 26 family components has a real 2D hotspot and a real 3D
  interactive group**. Earlier-audit items 2 and 10 (declared-but-inert component
  IDs) are genuinely resolved for equipment.
- **3D laziness is honest.** `EquipmentLabView.tsx:32-51` declares six
  `React.lazy` stages; the build emits six separate chunks plus a shared
  `core-*.js`; the three/drei payload lands in a lazily-imported chunk and the
  entry bundle contains no `WebGLRenderer`. `stageTypes.ts` is three-free so the
  view can type the map without pulling WebGL. This is the correct pattern.
- **Scenario quality is above the Phase 10 baseline.** Causal chains are
  physically coherent, wrong actions are graded with real reasoning rather than
  as punishes, every fix is evidence-gated, and every debrief carries a
  `Rule out` step plus an explicit transferable principle (enforced by
  `contentQuality.test.ts:111-121`). All 31 are solvable — I traced every
  `successConditions`/`verificationSteps` pair against `deriveEquipment` by hand
  and found no unreachable success state.

Where the integration stops — and this is the single most important finding in
this audit:

> **The spoiler-gating discipline lives in `status()` / `componentState()` /
> `evidence`, and the 2D SVG and 3D stage layers bypass it by reading
> `flag(state, …)` directly.**

`IT_EQUIPMENT_ARCHITECTURE.md:156-157` states "Shared world-derived state
(family `visual(state)` + `status(state)`) feeds both projections; neither
projection computes its own truth." That is **false as written**. All six SVGs
call `flag(state, …)` on raw world keys for the marks that actually carry the
diagnostic signal. The consequence is concrete and reproducible: in
`ups-battery-expired` the header correctly reads "Online" and the inspector
correctly reads "Not tested", while the `BAT` lamp in `UpsSvg.tsx:97` is red and
`UpsStage.tsx:152` repeats it. The design is right; the enforcement is one layer
short.

So: the phase is **architecturally sound and honestly lazy-loaded, but its
central safety claim — evidence-gated disclosure — is enforced on roughly two
thirds of the surfaces and asserted by seven tests.** Every "reveal flag" the
report counts as a gating mechanism is a *fix gate*; only 16 of the 23 declared
flags actually gate anything the learner can see, and 7 of them
(`alarmChecked`, `pathInspected`, `tonerChecked`, `probeDone`, `loadChecked`,
`outletChecked`, `inputChecked`) have **zero references anywhere in
`src/features`**.

### Answering the earlier-audit question directly

| Earlier risk | Status after Phase 11 |
|---|---|
| 1. Vocabulary duplicated across renderers | **Partly fixed.** Equipment is unified into `FamilyDef` + `*Visuals()`. But `benchHotspot.ts` ↔ `equipment/hotspot.ts` still duplicate the `related`/`locked` block verbatim, there are three independent path readers (`getByPath`, `readAny`, `readPath`), and two parallel 3D context/palette modules exist. |
| 2. Inert `environment.components` IDs | **Fixed** for equipment. All 26 family components verified to have 2D + 3D representations. |
| 3. Printer state vocabulary mismatch (`online`/`paperJam`/`tonerLow` vs `powerOn`/`jamPresent`/`tonerOk`) | **NOT fixed — it was duplicated, not removed.** The five new printer scenarios use the canonical vocabulary correctly. But `src/content/scenarios/index.ts:4664-4670` still seeds the legacy support scenario `printer-not-printing` with `printer: { online, queuePaused, tonerLow, paperJam, verified }`, in the *same* `world.printer` namespace that `deriveEquipment()` now mutates. See P0-4. |
| 4. SupportLab world-blind | **Unchanged** (out of scope), but the new `world.printer` collision makes it relevant. |
| 5. Duplicated diagnostic/check-strip patterns | **Partly fixed** within equipment (one `buildEquipmentHotspot`); bench↔equipment duplication remains. |
| 6. `environment.components` weakly validated | **Improved but incomplete.** `logic.test.ts:106-111` validates every declared component against its family for all 31; `equipmentExpansion.test.tsx` validates rendered hotspot *counts* for only 5 of 31 and never validates hotspot **ids**. See P1-5. |
| 7. Permissive `initialWorld: z.record(string, unknown)` | **Unchanged** (`schema/index.ts:221`). See P3-1. |
| 8. `showInspector` unused | **Unchanged.** Declared at `schema/index.ts:277`, set `true` in all 61 scenarios, read nowhere. See P2-6. |
| 9. Weak evidence gates on some actions | **Substantially fixed.** Every equipment fix carries an `appliesWhen` evidence gate, enforced end-to-end in `applyAction` (`engine/scenario.ts:116-121`) and in the inspector's `disabled` state. The residual problem is the inverse: the gates do not control what the visuals show. |
| 10. Dead/inert component IDs | **Fixed** (see item 2). |

---

## 2. FINDINGS

### P0

---

#### P0-1 — The horizontal run's landing port is drawn at the *patch lead's* port, erasing the root cause of `patch-crossconnect-mislabelled`

**Files**
- `src/features/environments/equipment/svg/PatchPanelSvg.tsx:31-33, 82-90`
- `src/features/environments/equipment/families/patchPanel.ts:14-23, 25-48`
- `src/content/scenarios/equipment/patch.ts:256-270, 320-339, 341-360`

**Problem**
`PatchVisuals` exposes `activePanelIndex` (= `patchPanelPort - 1`) but has **no
concept of where the horizontal run lands** (`horizontalPort`). `PatchPanelSvg`
therefore computes:

```ts
const panelIdx = v.activePanelIndex;                        // = patchPanelPort - 1
const runLandX = traced ? panelPortX(panelIdx) : 250;      // line 33
```

and draws the horizontal run to `runLandX`. In `patch-crossconnect-mislabelled`
the world is `horizontalPort: 9, patchPanelPort: 5`. After `trace-run` sets
`horizontalTraced`, the SVG draws the run arriving at **panel port 5** — the
same port the patch lead is on. The mismatch the scenario exists to teach is
therefore *visually erased* in 2D, while the footer text 200 px away prints
`run lands P9 · patched P5 · MISMATCH`. The drawing and the label contradict each
other on screen.

`PatchPanelStage.tsx:79-85` has the same omission: the run terminates at a fixed
`[0, 0.08, -0.025]` and never references `horizontalPort` at all, so 3D cannot
express the fault either, before or after the fix.

**Why it matters**
This is the flagship cabling scenario, the only `EVIDENCE_DISCRIMINATION` in the
family, and the one whose whole pedagogical payload is "a label is a claim, only
a toner confirms it". The single most important visual in that lesson is wrong.
`horizontalPort` is a first-class world key with a `labels` entry, evidence rows,
and a chain step — the *derivation and inspector* model it correctly; only the
projections model it wrongly.

**Evidence**
`patchPanel.ts:188` labels `horizontalPort: "Run lands on panel"` and
`patchPanel.ts:218` gates it in evidence with `when: "horizontalTraced"`, so the
inspector reports `P9` correctly. `PatchPanelSvg.tsx:184-185` prints
`LBL: 3-14 · PANEL P5` and `:236-239` prints `run lands P9 · patched P5 · MISMATCH`
— both correct. Only the geometry at `:33` is wrong. No test touches
`horizontalPort` geometry.

**Fix direction**
Add `activeRunIndex: number` (derived from `horizontalPort`) to `PatchVisuals`,
gated by `horizontalTraced` exactly as `activePanelIndex` is gated. Have
`PatchPanelSvg` land the run on `panelPortX(activeRunIndex)` and draw the patch
lead from `activePanelIndex`, so the two cables visibly terminate on different
ports. Mirror it in `PatchPanelStage`. Add a test asserting that for
`patch-crossconnect-mislabelled` after `trace-run`, the run and the lead resolve
to different indices.

---

#### P0-2 — 3D asserts trunk VLANs are fine the moment they are checked, in the scenario where they are not

**Files**
- `src/features/environments/equipment/3d/stages/SwitchStage.tsx:72-88`
- `src/features/environments/equipment/svg/SwitchSvg.tsx:93-115`
- `src/content/scenarios/equipment/switch.ts:269-320, 375-395`

**Problem**
`SwitchStage` renders the VLAN trunk badge as:

```tsx
{[0, 1, 2].map((i) => (
  <Led key={i} tone={trunkChecked ? "ok" : "off"} ... />
))}
```

Once `trunkChecked` flips, all three trunk indicators are green regardless of
`trunkCarries`. In `switch-vlan-mismatch` the trunk carries `[1]` while port 1
sits in VLAN 10 — so the 3D view shows a healthy trunk immediately after the
learner reads it, i.e. it visually contradicts the feedback text of the very
action that set the flag ("Uplink trunk carries VLAN 1 only; port 1 access VLAN
10 … no forwarding path").

`SwitchSvg.tsx:109-112` does the right thing: it prints the real
`trunkCarries.join(",")` after the check.

**Why it matters**
This is a 3D visual asserting a fact the simulation state says is false, in the
one scenario whose learning objective is "a green LED proves the cable, not the
VLAN". It is the exact failure mode the family was built to avoid, and it is
invisible to every existing test because `PART_IDS` parity is an id-set
comparison, not a state-rendering comparison.

**Evidence**
`switchVisuals` has no trunk-membership projection at all — the information is
simply absent from the shared visual contract, so the stage had to invent one.
`SwitchSvg` bypasses the shared contract and reads `state.trunkCarries` directly,
which is why the two projections disagree.

**Fix direction**
Extend `SwitchVisuals` with a trunk projection (e.g.
`trunkLeds: IndicatorTone[]` sized to `trunkCarries.length`, or
`trunkOk: boolean | null` where `null` means "not checked"). Drive both
`SwitchSvg` and `SwitchStage` from it, so the badge count and colour are derived
once and the two projections cannot diverge.

---

#### P0-3 — 3D has no representation of the serving switch, so `ap-poe-port-disabled`'s root cause exists only in 2D

**Files**
- `src/features/environments/equipment/3d/stages/AccessPointStage.tsx` (whole file)
- `src/features/environments/equipment/svg/AccessPointSvg.tsx:34-53`
- `src/content/scenarios/equipment/accessPoint.ts:11-57, 116-164`

**Problem**
`AccessPointSvg` draws a `PoE SW` block with a lamp bound to
`flag(state, "upstreamPoeCapable")` (line 42). `AccessPointStage` has no switch
at all — the drop runs from the AP through a grommet and "disappears under the
bench" (lines 79-87). `upstreamPoeCapable` is the **root cause** of
`ap-poe-port-disabled` and is the state that
`accessPoint.ts:85-86` inspects to separate "cable loose" from "port has PoE
administratively off".

**Why it matters**
`IT_EQUIPMENT_ARCHITECTURE.md:185-186` asserts "3D is never the only path" and
the reverse is claimed nowhere — but here 3D is strictly *less* informative, and
the two hypotheses of the scenario are indistinguishable in 3D. A learner who
switches to 3D loses the ability to tell `ap-poe-port-disabled` from
`ap-drop-unplugged`. That is a 2D-only evidence path, which the parity section of
the brief specifically asks about.

**Evidence**
Compare `ap-drop-unplugged` (`poeCableSeated: false, upstreamPoeCapable: true`)
and `ap-poe-port-disabled` (`poeCableSeated: true, upstreamPoeCapable: false`).
In 2D these are trivially distinguishable (dashed vs solid drop, dark vs amber
switch lamp). In 3D `accessPointVisuals.powerLed` is
`poePowered ? ok : poeCableSeated ? warn : off` — the stage passes that single
value to both the AP face lamp and the drop `Rj45` lamp, so both scenarios render
as "one amber lamp, no radio". Additionally `lampOf()` in `AccessPointStage.tsx:30-31`
maps `"crit"` to `EC.ledOff`, so the 3D PoE indicator can never render critical.

**Fix direction**
Give the AP family a two-element PoE path in 3D (AP + upstream switch with its own
`Interactive` group keyed to `ap-poe`), and let `accessPointVisuals` expose
`upstreamLed` separately from `powerLed` so both projections render the same two
facts.

---

#### P0-4 — `deriveEquipment()` writes equipment-family keys into a legacy support scenario that uses a different printer vocabulary

**Files**
- `src/engine/conditions.ts:128-147`
- `src/content/scenarios/index.ts:4662-4670, 4768, 4792-4795`
- `src/features/environments/equipment/logic.test.ts:12-14, 124-131`
- `docs/ENVIRONMENT_ARCHITECTURE.md:50`

**Problem**
`deriveEquipment` gates on the *namespace key alone*, with no check on
`environment.kind`:

```ts
const printer = objOf(out.printer);
if (printer) {
  const powerOk = yes(printer, "powerOn") && yes(printer, "powerCableSeated");
  ...
  out.printer = { ...printer, powerOk, netLink, printReady };
}
```

The legacy support scenario `printer-not-printing` seeds
`src/content/scenarios/index.ts:4664`:

```ts
printer: { online: true, queuePaused: true, tonerLow: false, paperJam: false, verified: false }
```

It has no `powerOn`, so on the **first action applied in that scenario** the
engine injects `powerOk: false, netLink: false, printReady: false` into a world
whose own success condition is `printer.verified === true` and whose own gate is
`printer.queuePaused === false`. The scenario's world now simultaneously carries
two mutually inconsistent vocabularies for the same physical device:

| concept | legacy support scenario | new printer family |
|---|---|---|
| powered | `online` | `powerOk` (derived from `powerOn`, `powerCableSeated`) |
| fault flags | `paperJam`, `tonerLow` | `jamPresent`, `tonerOk` |
| resolved | `verified` | `printReady` |
| paused | `queuePaused` | `queuePaused` (the only accidental overlap) |

**Why it matters**
This is the earlier audit's finding #3, and the answer is that it was **not
fixed — it was duplicated**. The Phase 11 vocabulary is correct and consistent
across the five new printer scenarios; the legacy vocabulary survives untouched
in the same namespace, and the engine now actively writes the new vocabulary into
it. Nothing breaks today only because `SupportLab` happens not to read
`powerOk`/`netLink`/`printReady`. The invariant that made Phase 11 safe —
"seeds must be `deriveWorld`-stable" — is **no longer true of the catalogue as a
whole**; the test that enforces it filters to `kind === "equipment-bench"`
(`logic.test.ts:12-14`) and therefore cannot see the violation.

**Evidence**
Deterministic from the code: `objOf(out.printer)` succeeds, `yes(printer,"powerOn")`
is `false`, so three keys are added. `docs/ENVIRONMENT_ARCHITECTURE.md:50` itself
lists `printer` as a **Support-domain** world key while line 45 lists `printer.*`
as an **Equipment-domain** world key — the collision is documented and unresolved.

**Fix direction**
Two independent decisions are needed, and they should be made explicitly:
(a) scope `deriveEquipment` to namespaces the scenario actually declares — e.g.
key off `environment.deviceFamily.worldKey` rather than probing for the key's
presence, so a support scenario's `printer` strip is never touched; and
(b) either migrate `printer-not-printing` to the family vocabulary or rename its
namespace (e.g. `printerStrip`) so the two models can never meet. Then widen the
seed-stability assertion from "every equipment scenario" to **every scenario in
the catalogue**, which is the invariant that was actually intended.

---

### P1

---

#### P1-1 — 7 of the 23 declared "reveal flags" are read by nothing; 3 of the 5 UPS flags gate nothing observable

**Files**
- `docs/IT_EQUIPMENT_ARCHITECTURE.md:125-132`
- `docs/SCENARIO_ENVIRONMENT_MATRIX.md:39, 41, 61, 62, 63`
- `src/features/environments/equipment/families/{printer,router,ups}.ts`
- `src/content/scenarios/equipment/{printer,router,ups}.ts`

**Problem**
A repo-wide reference count of every flag the docs call a reveal flag:

| flag | set in content | referenced in `src/features/**` |
|---|---|---|
| `queueChecked` | yes | 5 |
| `neighborChecked` | yes | 2 |
| `addressChecked` | yes | 7 |
| **`alarmChecked`** | yes | **0** |
| **`pathInspected`** | yes | **0** |
| **`tonerChecked`** | yes | **0** |
| `wanChecked` | yes | 12 |
| `dhcpChecked` | yes | 8 |
| `natChecked` | yes | 6 |
| `lanChecked` | yes | 1 |
| **`probeDone`** | yes | **0** |
| `portChecked` / `uplinkChecked` / `trunkChecked` / `poeChecked` | yes | 5 / 5 / 14 / 6 |
| `assocChecked` | yes | 12 |
| `batteryChecked` / `breakerChecked` | yes | 8 / 4 |
| **`loadChecked`** | yes | **0** |
| **`outletChecked`** | yes | **0** |
| **`inputChecked`** | yes | **0** |
| `jackTraced` / `horizontalTraced` / `patchChecked` | yes | 16 / 12 / 23 |

**Why it matters**
These flags are documented as the mechanism that hides facts until evidence
exists. Seven of them are pure `appliesWhen` gates: they unlock a fix and change
nothing a learner can see. The UPS case is the sharpest — the family defines
`ups-output` evidence as `["outletsLive", "outputPresent"]`
(`families/ups.ts:169`) and `ups-input` as
`["inputPresent", {breakerOk…}, {onUtility…}]` (`families/ups.ts:156-160`), so
in `ups-outlet-group-dead` the `ups-output` inspector reads
`Outlet group: fail` at t=0 and in `ups-input-unplugged` the `ups-input`
inspector reads `Utility input: fail` at t=0 — the exact facts that
`outletChecked` / `inputChecked` are documented as hiding. `SCENARIO_ENVIRONMENT_MATRIX.md:62-63`
explicitly lists `outletChecked, outletsLive` and `inputChecked, inputPresent` as
"gated", which is false.

**Evidence**
`families/ups.ts` contains no reference to `loadChecked`, `outletChecked`, or
`inputChecked`; `families/printer.ts` contains none to `alarmChecked`,
`pathInspected`, or `tonerChecked`; `families/router.ts` contains none to
`probeDone`. Grep across `src/features/**` returns zero.

**Fix direction**
For each of the seven, decide explicitly whether it is an *evidence-reveal* flag
(→ wire it into the family's evidence `when` and/or `componentState`) or a
*fix-gate only* flag (→ rename to `…Proven`/`…Verified` and move it out of the
"reveal flags" table in both docs). The UPS family needs the first treatment:
gate `outletsLive` on `outletChecked` and `inputPresent`/`onUtility` on
`inputChecked`, and gate `loadPct` on `loadChecked`. Add a test that, for every
flag named in the reveal-flag table, applying the action that sets it changes at
least one evidence row, chain step, or `componentState` label.

---

#### P1-2 — The visual layer bypasses the gating that the status/inspector layer enforces, producing eight reproducible t=0 spoilers

**Files**
- `src/features/environments/equipment/svg/RouterSvg.tsx:42, 117, 137`
- `src/features/environments/equipment/svg/UpsSvg.tsx:97, 106-108, 158, 166-171`
- `src/features/environments/equipment/svg/AccessPointSvg.tsx:42, 116`
- `src/features/environments/equipment/3d/stages/UpsStage.tsx:97-105, 152`
- contrast: `families/{router,ups,accessPoint}.ts` `status()` / `componentState()`

**Problem**
The gating discipline is real in the family modules. `status()` for the UPS reads
`breakerChecked && !breakerOk` (line 36), `batteryChecked && !batteryOk`
(line 38); `componentState("ups-battery")` returns `"Not tested"` until
`batteryChecked` (line 100). None of that reaches the pixels. The `*Visuals()`
helpers — which the SVGs *do* call — are also ungated, and several SVGs bypass
even those:

| scenario | what the learner sees at t=0 | source | what the inspector correctly says |
|---|---|---|---|
| `ups-battery-expired` | `BAT` lamp red; 3D `ups-battery` lamp red | `UpsSvg.tsx:97`, `UpsStage.tsx:152` | "Online" / "Not tested" |
| `ups-breaker-tripped` | breaker drawn `TRIP` in red; outlet bank drawn green while `OUT` lamp is red and header says "No output" | `UpsSvg.tsx:106-108, 158, 166-171` | "Breaker: not shown" |
| `ups-outlet-group-dead` | all 6 outlet rectangles stroked `C.crit` | `UpsSvg.tsx:158` | "Outlet group: fail" (ungated) |
| `router-nat-disabled` | `NAT` lamp amber | `RouterSvg.tsx:137` via `families/router.ts:32` | "NAT: not checked" |
| `router-dhcp-exhausted` | `DHCP` lamp amber | `RouterSvg.tsx:117` via `families/router.ts:31` | "DHCP: not checked" |
| `router-upstream-outage` | `MODEM` lamp red | `RouterSvg.tsx:42` | "Link up — path not checked" |
| `ap-poe-port-disabled` | `PoE SW` lamp amber | `AccessPointSvg.tsx:42` | "Not powered" / PoE rows gated |
| `switch-poe-overload` | *(correctly gated — `poeChecked`)* | `SwitchSvg.tsx:82`, `SwitchStage.tsx:59` | "Switching" |

**Why it matters**
`router-nat-disabled` and `router-dhcp-exhausted` are the two scenarios whose
first diagnostic action exists specifically to distinguish "NAT off" from
"nothing wrong with NAT" and "pool empty" from "uplink dead". An amber service
lamp on the device face settles both before the learner touches anything. This
is the failure the whole reveal-flag design exists to prevent, and the
corresponding test coverage (`logic.test.ts:290-424`) checks **evidence rows and
one chain step only** — never a lamp, a colour, or a stage caption.

Note the switch family gets this right (`SwitchSvg.tsx:82`, `SwitchStage.tsx:59`
both gate the PoE lamp on `poeChecked`), which proves the pattern is understood
and simply was not applied to the other five families.

**Evidence**
`families/ups.ts:24` `batteryLed: flag(state,"batteryOk") ? "ok" : "crit"` —
`batteryOk` is a *content input*, not a derived flag, so it is `false` in
`ups-battery-expired`'s seed (`content/scenarios/equipment/ups.ts:49`).
`families/router.ts:32` `natLed: flag(state,"natEnabled") ? "ok" : "warn"` —
`natEnabled: false` is seeded at `content/scenarios/equipment/router.ts:763`.
Both are read directly by the SVG.

**Fix direction**
Move gating into the `*Visuals()` functions, which are the shared projection
contract both renderers already consume — e.g. `upsVisuals.batteryLed` becomes
`batteryChecked ? (batteryOk ? "ok" : "crit") : "unknown-tone"`, and
`routerVisuals.natLed` becomes `natChecked ? … : "off"`. Add a generic test that
walks every family, computes visuals at t=0 and after each check action, and
asserts no visual tone changes to a fault tone before the corresponding
`*Checked` flag is set. That test is the missing guard for this entire class.

---

#### P1-3 — The AP family ignores the engine's own derived `clientLink` and substitutes a cruder predicate that misreports a healthy client as faulty

**Files**
- `src/engine/conditions.ts:196-200`
- `src/features/environments/equipment/families/accessPoint.ts:17-26, 29-41, 60-65, 91-98`
- `src/content/scenarios/equipment/accessPoint.ts:749-759, 805, 1335`

**Problem**
The engine derives the correct wireless-client fact:

```ts
const clientLink = radioUp && yes(ap,"pskOk") && yes(ap,"channelClear") && yes(ap,"clientAssociated");
const pathOk = clientLink && yes(ap,"clientIpOk");
```

The family never reads `clientLink`. `accessPointVisuals.clientLed` uses
`pathOk ? ok : clientAssociated ? warn : off`, and `chain()`'s "Client link" step
reports `clientAssociated ? "Associated" : "Not associated"`. So the projection
is driven by a *different, weaker* predicate than the engine's.

**Why it matters**
In `ap-channel-congestion` the world is `clientAssociated: true, pskOk: true,
clientIpOk: true, channelClear: false`. The client is associated, addressed, and
authenticated; the only fault is a busy channel. The engine's `clientLink` is
`false` for a defensible reason, but the renderer's `clientAssociated` is
`true`, so the client lamp shows **amber** — a client-side fault indicator — for
a scenario whose fault is airtime contention. `AccessPointSvg.tsx:116` compounds
it: the laptop's NIC lamp is `assoc ? ok : off`, i.e. **green**, in the same
scene. Two lamps in one frame disagree about the client.

The reverse also holds: in `ap-wrong-passphrase` (`clientAssociated: false`) the
client lamp is `off` — indistinguishable from "no clients nearby" — so the
scenario's actual fault (handshake rejected) has no visual expression at all.

**Evidence**
`clientLink` appears in exactly three places in `src/`: its definition
(`conditions.ts:197, 200`), one scenario's `verificationSteps`
(`accessPoint.ts:1335`), and one test assertion (`logic.test.ts:234`). It is
never read by a family, an SVG, or a stage. The `status()` ladder
(`accessPoint.ts:34-39`) does consult `assocChecked` + `pskOk` + `channelClear` +
`clientIpOk`, so the header is right while the lamps are not.

**Fix direction**
Make `clientLink` the single client-path predicate everywhere: `clientLed`
should be `pathOk ? ok : clientLink ? warn : clientAssociated ? "warn-rejected"
: off`, and the chain's "Client link" step should read `clientLink` with an
`assocChecked` gate. Introduce a distinct tone for "associated but not passing"
so `ap-wrong-passphrase` and `ap-channel-congestion` stop looking identical, and
add a test asserting the family never reads a content input that the engine
already derives.

---

#### P1-4 — Filtering the chain strip by `environment.components` silently re-links non-adjacent causal stages

**Files**
- `src/features/environments/EquipmentLab.tsx:123-148`
- `src/features/environments/equipment/families/printer.ts:56-112`
- `src/content/scenarios/equipment/printer.ts:258, 688`

**Problem**
`EquipmentLab` filters chain steps by component visibility and then computes the
connector arrow from the **filtered** neighbours:

```tsx
{steps.filter((s) => visible(s.component)).map((s, i, arr) => (
  …
  <ChainArrow healthy={s.tone === "ok" && (arr[i+1]?.tone === "ok" || arr[i+1]?.tone === "unknown")} />
))}
```

`printerFamily.chain()` emits five steps: `power` (printer), `net`
(printer-network), `addr` (printer-network), `queue` (printer), `ready`
(printer). `printer-paper-jam` and `printer-low-toner` both declare
`components: ["printer", "printer-paper", "printer-cartridge"]` — no
`printer-network`.

**Why it matters**
In those two scenarios the strip renders **Power → Queue → Ready**. The `net` and
`addr` hops are removed and the arrow is drawn between Power and Queue as though
they were adjacent. The learner is shown a causal chain that asserts the queue
hangs directly off the power supply, in a scenario about a sheet of paper in the
feed rollers. The same filter also means `printer-paper` — a declared component —
never appears in the chain at all in `printer-queue-paused`, so the strip is
incomplete in the opposite direction.

**Evidence**
`EquipmentLab.tsx:126` filters; `:137-144` indexes `arr` (the filtered array) for
the arrow. The three-step result is directly derivable from
`families/printer.ts:59-110` plus the component lists at
`content/scenarios/equipment/printer.ts:258` and `:688`. `equipmentExpansion.test.tsx:174-183`
asserts the queue step's text for `printer-queue-paused` but never asserts the
*sequence* or the arrow.

**Fix direction**
Do not drop chain steps. Instead render filtered-out steps as a visually
de-emphasised "not in scope" marker, or better: make `chain()` itself
scenario-aware is forbidden (no id branching) — so the right fix is for
`ChainStepView` to carry the component and for the strip to render an explicit
gap element where a step was removed, so the surviving steps are never rendered
as adjacent. Alternatively require that any scenario omitting a component also
declares the chain steps it wants, via a schema field.

---

#### P1-5 — The component-parity tests validate id *sets* and hotspot *counts*; they cannot detect an inert or mislabelled component

**Files**
- `src/features/environments/equipmentExpansion.test.tsx:51-104, 106-121`
- `src/features/environments/equipment/logic.test.ts:450-479`

**Problem**
What the "component/hotspot parity" guard actually asserts:
1. `PART_IDS` (a hand-maintained const array) equals `family.components.map(id)`
   — for 5 of 31 scenarios there is additionally a check that the number of
   rendered `g.hotspot` elements equals `family.components.length`
   (`:81-103`), and for 3 printer scenarios a count plus two `aria-label`
   lookups.
2. Every declared `environment.components` entry exists in the family
   (`logic.test.ts:106-111`).
3. For all 31 × all components, `buildEquipmentHotspot` returns a non-null
   hotspot with a non-empty label and summary (`logic.test.ts:469-476`).

What it does **not** assert, and what therefore passes while the UI is wrong:
- That the set of hotspot **ids** equals the declared component set. The count
  test would pass if a hotspot were emitted for `printer-cartridge` twice and
  `printer-network` not at all.
- That each family component has a **visible** representation, for 26 of 31
  scenarios.
- That any 3D stage renders its parts at all — no stage is mounted in any test
  (jsdom has no WebGL), so all six stages and `core.tsx` have **zero** runtime
  coverage. `SwitchStage.tsx:82`'s false green trunk (P0-2) and
  `AccessPointStage`'s missing switch (P0-3) are both invisible to the suite.
- That a *state change* alters the DOM. Every DOM assertion runs against a single
  `createRun(scenario, "guided")` state, so a component that renders but never
  updates is fully green.

**Why it matters**
This is the answer to "can tests pass while a component is visually inert?" —
yes, and the mechanism is structural. A `PART_IDS` array is a *declaration of
intent* checked against a *declaration of intent*; it says nothing about what
the stage draws.

**Evidence**
`equipmentExpansion.test.tsx:60-62` asserts `hotspots.length === components.length`
— a cardinality check. `:118` asserts `[...parts].sort()` equals
`family.components.map(c => c.id).sort()` — a set check between two literals.
No test file imports any file from `equipment/3d/stages/`.

**Fix direction**
Three additions, in order of value:
1. Extract a per-family `hotspotIds(state, visible)` declaration from each SVG
   (or export the id list from a shared module) and assert set equality against
   `family.components` for **all 31** scenarios, not counts for 5.
2. Assert that for each family and each component, applying a state-changing
   action mutates at least one rendered attribute (an LED `fill`, a `stroke`, or
   a text node) inside that component's `<g>`. This is the only test shape that
   can catch a visually inert component.
3. Move the pure projection functions (`printerVisuals`, `routerVisuals`, …) and
   the 3D stages' tone decisions into testable pure functions and unit-test them
   directly, so 3D gets coverage without a WebGL context.

---

### P2

---

#### P2-1 — `relatedAction` binds a component to the *first* loosely-matching action, which both mis-binds and drops actions

**Files**
- `src/features/environments/equipment/hotspot.ts:77-91`
- `src/features/environments/benchHotspot.ts:254-268`
- `src/content/scenarios/equipment/patch.ts:530-570`
- `src/content/scenarios/equipment/ups.ts:932-953`

**Problem**
```ts
const related = scenario.actions.find(
  (a) => a.component === compId ||
         a.inspectTarget === compId ||
         a.matchHints?.some((h) => h.toLowerCase().includes(compId.replace(/-/g, " "))),
);
```

`find` returns one action, and the third clause is a substring test over free-text
hints. Two concrete failures:

- **`patch-switch-port-disabled`:** the `switch-port` hotspot resolves to
  `trace-path` ("Tone the whole path from desk to switch") because that action's
  `matchHints` include the literal `"switch port"` (`patch.ts:548`), and it
  precedes `enable-switch-port`. The hotspot therefore offers a *diagnostic* as
  its action and hides the *fix* that is explicitly authored onto
  `component: "switch-port"` (`patch.ts:555`).
- **`ups-breaker-tripped`:** `check-breaker` is authored with
  `component: "ups"`, not `"ups-input"`, even though the `ups-input` component is
  the one whose evidence row (`{ path: "breakerOk", when: "breakerChecked" }`,
  `families/ups.ts:158`) reveals the finding. No action matches `"ups input"` by
  component or by hint, so the **Utility input** hotspot has **no action button
  at all** in the scenario where the breaker is the root cause.

**Why it matters**
The inspector's disabled-button affordance is the only place a locked fix is
communicated (`InspectDock` `Hotspot.tsx:96` `disabled={…disabled}`), and the
Tools dock hides gated actions entirely (`ScenarioPage.tsx:616` iterates
`availableActions`). So for these two scenarios the learner is never shown that a
fix exists and is waiting on evidence. The `matchHints` heuristic is also
unbounded: any future hint containing "switch port", "printer", or "wall jack"
silently re-binds a component to an arbitrary action.

**Evidence**
`patch.ts:548` `matchHints: ["tone the path", "tracer", "panel port 5",
"switch port", "amber led"]` vs `patch.ts:552-556` where `enable-switch-port`
declares `component: "switch-port"`. `ups.ts:937-938` `component: "ups"`.

**Fix direction**
Drop the `matchHints` clause from the component→action binding entirely (it is a
free-text matcher being used as an identity relation) and return **all** matching
actions, rendering them as a list. At minimum, make the explicit
`component`/`inspectTarget` match take strict precedence over any fuzzy match, and
realign `ups-breaker-tripped`'s `check-breaker` onto `ups-input`.

---

#### P2-2 — Port-count constants are duplicated between the family model and both renderers, and the switch renderers hard-code 8

**Files**
- `src/features/environments/equipment/families/patchPanel.ts:11-12` (`PATCH_PANEL_PORTS = 12`, `PATCH_SWITCH_PORTS = 8`)
- `src/features/environments/equipment/svg/PatchPanelSvg.tsx:2-5` (imports them correctly)
- `src/features/environments/equipment/3d/stages/PatchPanelStage.tsx:12-13` (`const PANEL_PORTS = 12; const SWITCH_PORTS = 8;` — re-declared)
- `src/features/environments/equipment/3d/stages/SwitchStage.tsx:12` (`const PORT_COUNT = 8`)
- `src/features/environments/equipment/svg/SwitchSvg.tsx:6` (`const PORTS = 8`)

**Problem**
`PatchPanelSvg` imports the family constants (correct); `PatchPanelStage`
re-declares them locally. `SwitchSvg` and `SwitchStage` both hard-code 8 while
`switchPorts(state)` returns `state.ports.length` entries and every scenario
seeds an 8-element array.

**Why it matters**
A silent-truncation hazard in both directions: adding a 9th port to a switch
scenario renders 8 ports in 2D *and* 3D with no error, no test failure (nothing
asserts rendered count against `switchPorts().length`), and no visible cue.
Changing `PATCH_PANEL_PORTS` in the family would update the SVG and not the 3D
stage.

**Evidence**
`SwitchStage.tsx:93` `rawPorts.slice(0, PORT_COUNT)` and `SwitchSvg.tsx:130`
`v.portLeds.slice(0, PORTS)` — both slice against a literal, while
`families/switch.ts:22-39` derives the array length from the world.

**Fix direction**
Have `switchVisuals` return `ports: SwitchPortState[]` (it already computes it)
and let both renderers map over it without a slice. Import
`PATCH_PANEL_PORTS`/`PATCH_SWITCH_PORTS` into `PatchPanelStage` instead of
re-declaring. Add a test asserting rendered port-group count equals
`switchPorts(state).length` for every switch scenario.

---

#### P2-3 — Switch fixes patch the entire 8-port array by literal, re-declaring derived values, and conditions address ports by bare index

**Files**
- `src/content/scenarios/equipment/switch.ts:151-164, 875-888, 1140-1161`
- `src/content/scenarios/equipment/switch.ts:198, 443, 447, 673, 922, 926, 1200`
- `src/content/scenarios/equipment/logic.test.ts:124-131`

**Problem**
`enable-port`, `swap-to-spare-port`, and `move-bench-tester-to-injector` each
replace the whole `ports` array with an 8-element literal that re-states
`link: true/false` and `path: true/false` — values `deriveEquipment` owns and will
overwrite. Conditions address ports positionally: `switch.ports.3.link`,
`switch.ports.0.path`, `switch.ports.2.link`.

**Why it matters**
Two hazards, both silent:
1. The `logic.test.ts:124-131` no-op invariant is asserted only on
   `initialWorld`, never on post-patch worlds. If a future patch literal
   contradicts the derivation, `deriveWorld` silently corrects it and no test
   notices — which is the *desired* behaviour but means the literal is dead
   weight that actively misleads a reader into thinking `link`/`path` are
   authored.
2. `switch.ports.3.link` is index-coupled to port `id: 4`. Reordering the array
   silently retargets the success condition at a different port, and
   `verificationSteps` (`switch.ports.2.link === false`) would then assert the
   wrong port is still down. Nothing asserts `ports[i].id === i + 1`.

**Evidence**
`switch.ts:154-161` — a full 8-port literal where only `enabled` on port 4
changed. `switch.ts:926` — `path: "switch.ports.2.link", value: false` as a
verification step, i.e. success is defined as *"the failed port is still
failed"*, expressed as a positional index.

**Fix direction**
Introduce a `switch.setPort` patch operation (id-keyed merge) alongside the
existing whole-array replace, so a fix expresses intent ("port 4 admin up")
rather than transcribing the array. Drop the `link`/`path` keys from patch
literals entirely. Add a test asserting `ports[i].id === i + 1` for every switch
scenario, or migrate conditions to a new `portById` path form.

---

#### P2-4 — 17 of 31 equipment scenarios expose a Customer dock backed by a synthesized stub script; the grammar doc says equipment has no conversation

**Files**
- `src/features/environments/hasCustomerConversation.ts:8-17`
- `src/engine/conversation.ts` (`defaultScript`)
- `src/content/scenarios/equipment/*.ts` (`ticket.channel`)
- `docs/DOMAIN_GRAMMAR.md:275`

**Problem**
`hasCustomerConversation` returns true when `ticket.channel` is `"phone"` or
`"walkup"` even with no `conversation` script. `createConversation` then falls
back to `defaultScript(scenario)`, whose follow-ups are:

> "When did you first notice this?" · "Has anything changed **on this machine**
> recently?" · "Does the same thing happen **for other users**?"

and whose only reply is "I am not sure - I only know what I see from my side."

17 of the 31 equipment tickets use `walkup` (8) or `phone` (9); the other 14
(`portal` 10, `email` 4) expose no dock. So within one family, half the
scenarios present a "Talk to the customer" affordance and half do not, and the
ones that do get questions about "this machine" for a comms-cabinet UPS or a
ceiling access point.

`DOMAIN_GRAMMAR.md:275` states the Equipment lab has "no conversation" —
contradicted by the shipped behaviour.

**Why it matters**
This is not a crash (the drawer renders), it is a content gap presented as a
feature. A learner who opens the Customer dock in `ups-breaker-tripped` gets a
dead conversation that can never contribute evidence, and no test notices.

**Evidence**
`defaultScript` is unconditional. `hasCustomerConversation` short-circuits on
channel alone. `IT_EQUIPMENT_ARCHITECTURE.md:40` says "no conversation script"
and treats that as a clean statement; it does not mention the dock.

**Fix direction**
Decide per family whether a customer conversation is part of the equipment
pedagogy. If not, gate `hasCustomerConversation` on
`scenario.conversation !== undefined` (keeping the channel heuristic for the
Phase 10 catalogue, which does define scripts) — one-line change, restores the
grammar doc's claim. If yes, author real scripts for the affected 17. Either
way, `defaultScript`'s machine-oriented follow-ups should be parameterised by
`environment.kind`.

---

#### P2-5 — Two consumable hotspots own no state-dependent geometry, so selecting them shows an unchanged object

**Files**
- `src/features/environments/equipment/svg/UpsSvg.tsx:93-100` (BAT lamp) vs `:117-134` (battery drawer)
- `src/features/environments/equipment/svg/PrinterSvg.tsx:126-130` (TONER lamp) vs `:146-168` (toner door)

**Problem**
The only marks that reflect `batteryOk` and `tonerOk` are the `BAT` and `TONER`
LEDs, and both are rendered inside the **`ups`** and **`printer`** hotspot groups
respectively — not inside the `ups-battery` / `printer-cartridge` groups. The
battery drawer and toner door are static rectangles whose `stroke` only reflects
*selection*.

**Why it matters**
Clicking "UPS battery" in `ups-battery-expired` opens an inspector reading
"Not tested" next to a battery drawer that looks identical to a healthy one. The
component is declared, hit-testable, inspectable, and visually inert — the exact
pattern the phase was supposed to eliminate. `PrinterStage.tsx:114` and
`UpsStage.tsx:152` do place the corresponding LEDs inside the consumable's
`Interactive` group, so this is a 2D-only inconsistency as well.

**Evidence**
`UpsSvg.tsx:97` `<Led cx={226} cy={124} tone={v.batteryLed} />` sits inside the
`visible("ups")` block opened at `:54`. `PrinterSvg.tsx:129`
`<Led cx={304} cy={104} tone={v.tonerLed} r={2.5} />` sits inside the
`visible("printer")` block opened at `:82`.

**Fix direction**
Move each consumable's indicator into its own `HotspotG` in 2D (matching the 3D
grouping), and give the consumable a state-dependent mark beyond the LED — a
depleted-gauge fill for the cartridge, a bay-door state for the pack.

---

#### P2-6 — `showInspector` is declared, set 61 times, and read nowhere

**Files**
- `src/content/schema/index.ts:277`
- all 61 scenario files (`showInspector: true`)
- `src/features/**` (no reader)

**Problem**
Earlier-audit item 8, unchanged. `showInspector: z.boolean().default(true)` is
authored explicitly in every scenario in the catalogue and consumed nowhere.
`EquipmentLab` renders the inspector whenever a component is selected,
unconditionally (`EquipmentLab.tsx:164-183`).

**Why it matters**
A schema field that looks like a control but does nothing is a trap for the next
author: setting `showInspector: false` will appear to work in review and change
nothing at runtime. The same is true of the sibling `showTerminal` field, which
`SCENARIO_ENVIRONMENT_MATRIX.md:85` at least acknowledges.

**Fix direction**
Either implement it (`showInspector === false` → suppress `InspectDock` and fall
back to the legend chips) or delete it from the schema and from all 61 scenarios.
The audit's earlier recommendation was to delete; nothing has changed.

---

#### P2-7 — A successful port inspection in `switch-vlan-mismatch` does not set the family's port-reveal flag

**Files**
- `src/content/scenarios/equipment/switch.ts:353-373` (`check-port-state`, no `patch`)
- `src/features/environments/equipment/families/switch.ts:164-176`

**Problem**
`check-port-state` is labelled "Read the link state on the finance port" and
inspects `switch-port`, but sets no `portChecked`. The family's
`componentState("switch-port")` therefore keeps returning
`"3/8 linked — admin state not checked"` (unknown) for the whole scenario, even
after the learner has demonstrably read the port state.

Contrast `switch-port-shutdown` (`check-port-leds`) and `switch-port-faulty`
(`check-port-leds`), which both do set `portChecked`, and `switch-vlan-mismatch`
(`check-trunk`), which does set `trunkChecked`.

**Why it matters**
Content and family disagree about what a "check" is. The learner's action
succeeds, the feedback text reports the negotiated link, and the inspector
insists the admin state was never checked — a small, persistent contradiction
between the environment's narrative and its state model.

**Evidence**
`switch.ts:372` — the action object ends with `matchHints` and no `patch` key.
`families/switch.ts:173-174` — the `!flag(state,"portChecked")` branch.

**Fix direction**
Add `patch: { switch: { portChecked: true } }` to `check-port-state`, and add a
test asserting that every action with `component: "switch-port"` and
`kind: "inspect"` sets `portChecked` — the general form of this invariant.

---

#### P2-8 — Two scenarios' diagnostic feedback narrates indicator states that are deliberately not rendered yet

**Files**
- `src/content/scenarios/equipment/switch.ts:1069-1072` (`check-power` → "PoE indicator red")
- `src/content/scenarios/equipment/switch.ts:803-806` (`check-power` → "the PoE indicator steady")
- `src/features/environments/equipment/svg/SwitchSvg.tsx:82`, `3d/stages/SwitchStage.tsx:59`

**Problem**
`check-power` in `switch-poe-overload` reports "Power LED green with no thermal
alarm, **PoE indicator red**". In `switch-port-faulty`, `check-power` reports
"Power LED green and **the PoE indicator steady**". Both render the PoE lamp only
when `poeChecked` is set (`SwitchSvg.tsx:82`, `SwitchStage.tsx:59`), and in both
scenarios `check-power` runs *before* the PoE check.

**Why it matters**
In `switch-poe-overload` the action's payoff — the red PoE lamp, the one visible
thing that discriminates "power pool" from "chassis" — is described in prose
while the corresponding action (`check-poe-budget`) is still available and its
lamp still hidden. The learner is told the answer by a text channel while the
visual channel withholds it, which inverts the intended evidence discipline.

**Fix direction**
Either drop the PoE-lamp clause from `check-power`'s feedback in both scenarios
(it is `check-poe-budget`'s job), or render the PoE lamp ungated for the *panel
reading* only and keep the budget numbers gated.

---

#### P2-9 — The published architecture document describes a `FamilyDef` that does not exist and an invariant the renderers do not uphold

**Files**
- `docs/IT_EQUIPMENT_ARCHITECTURE.md:64-76, 156-157, 177-179, 194-195`
- `docs/SCENARIO_ENVIRONMENT_MATRIX.md:37-38, 39, 41, 61-63`
- `src/features/environments/equipment/types.ts:69-84`
- all six `equipment/svg/*.tsx`

**Problem**
1. **The interface in the doc is wrong.** `IT_EQUIPMENT_ARCHITECTURE.md:65-76`
   publishes:
   ```ts
   interface FamilyDef {
     …
     chainSteps: ChainStepView[];   // actual: chain(state): ChainStepView[]
     visual(state): …;               // actual: no such field — six free functions
     svg: ComponentType<SvgProps>;   // actual: no such field — SVG_BY_FAMILY in EquipmentLab.tsx:53
   }
   ```
   None of `chainSteps`, `visual`, or `svg` exists on `types.ts:69-84`. A reader
   following this doc would look for a per-family visual contract that is in fact
   six exported free functions plus a record in the view.
2. **The core invariant is stated as fact and is false.** Lines 156-157: "Shared
   world-derived state (family `visual(state)` + `status(state)`) feeds both
   projections; **neither projection computes its own truth**." All six SVGs call
   `flag(state, …)` on raw world keys — `RouterSvg.tsx:42, 50, 68, 163`,
   `UpsSvg.tsx:45, 106, 158, 168, 173`, `AccessPointSvg.tsx:42, 47, 116`,
   `SwitchSvg.tsx:41, 44, 111, 155`, `PatchPanelSvg.tsx:24-28, 63, 184, 236`,
   `PrinterSvg.tsx:68, 71`. This is precisely the mechanism behind P1-2, and the
   document denies it.
3. **The gating table and the matrix document behaviour that is not enforced.**
   `IT_EQUIPMENT_ARCHITECTURE.md:125-132` lists all 23 flags as reveal flags
   (see P1-1). `SCENARIO_ENVIRONMENT_MATRIX.md:39` claims `printer-paper-jam` is
   "gated: … `jamPresent`" — `jamPresent` is *never* gated (it is the raw
   computed row at `families/printer.ts:209-214` and the ungated `JAM` LED at
   `PrinterSvg.tsx:130`). Line 41 claims `printer-low-toner` is "gated:
   `tonerChecked, tonerOk`" — `tonerOk` is the raw row at
   `families/printer.ts:223` and the ungated amber `TONER` LED at
   `PrinterSvg.tsx:129`. Lines 61-63 claim `loadChecked`, `outletChecked`,
   `inputChecked` gate UPS facts; none of the three is read anywhere.
4. **`docs/IT_EQUIPMENT_ARCHITECTURE.md:194-195` overstates the test surface**,
   listing "gating contracts" and "3D `PART_IDS` parity" without noting that
   gating is asserted on 7 scenarios/7 facts and `PART_IDS` is an id-set
   comparison (see P1-5).

**Why it matters**
These documents are the contract a future phase will be reviewed against. Three
of their load-bearing claims — the interface shape, the single-source-of-truth
invariant, and the gating table — are contradicted by the code. A reviewer
relying on the doc would conclude the spoiler problem is solved.

**Fix direction**
Regenerate the `FamilyDef` block from `types.ts`, restate the projection
invariant as the aspiration it currently is not (or, better, make it true — see
P1-2's fix direction — and then keep the claim), and split the reveal-flag table
into "evidence-reveal flags" and "fix-gate flags" with a test per row.
Regenerate the matrix's "gated" column from the family's actual `when`
expressions rather than by hand.

---

#### P2-10 — Scenario-quality findings across the 31

**Files:** `src/content/scenarios/equipment/*.ts`

**(a) Five scenarios are cosmetically distinct restatements of two causal shapes.**
`router-cable-loose-wan`, `switch-uplink-down`, `ap-drop-unplugged`, and
`ups-input-unplugged` all follow an identical beat structure — *check power /
panel → inspect the one cable → reseat it* — with a "someone was in the room"
trigger, and their debriefs converge on the same sentence
("when a room was physically touched overnight, prove the connectors…").
`router-cable-loose-wan` is even marked `difficulty: "foundational"` with
`estimatedMinutes: 10`, identical to `ap-drop-unplugged`. Symmetrically,
`ups-overload` and `switch-poe-overload` are the same "shared budget exceeded,
remove the newest claimant" story on two devices.
*Fix direction:* differentiate by which layer is actually shared — utility feed
vs a single switch uplink vs a PoE pool vs a single cable — and give each a
distinct diagnostic discriminator (e.g. the switch case should be solvable by
reading neighbour-port LEDs, which only `switch-port-shutdown` currently does).

**(b) Two printer scenarios open pre-solved.** `printer-paper-jam` and
`printer-low-toner` both seed the fault as a raw world boolean, and both faults
are rendered ungated *and* are the scenarios' `focusTarget`:
- `printer-paper-jam` → focus `printer-paper` → `componentState` returns
  "Jam present" (`families/printer.ts:119`), the evidence row reads `Jam: fail`
  (`:209-214`), `status()` returns "Jam" (`:42`), the `JAM` LED is red
  (`PrinterSvg.tsx:130`), and the SVG prints "PAPER JAM" (`:135-137`) — all
  before any action. `check-panel` and `check-door` become pure confirmation.
- `printer-low-toner` → focus `printer-cartridge` → "Toner low" (`:124-126`),
  `Toner: fail` (`:223`), amber `TONER` LED (`PrinterSvg.tsx:129`).
  The ticket does state the panel reports a toner warning, so the *symptom* is
  legitimately visible; but the *location* (which consumable) is the finding the
  scenario is meant to earn.
  *Fix direction:* gate the cartridge/paper verdict on a new `cartridgeChecked` /
  `feedChecked` flag so the amber lamp appears only after the gauge is read, the
  way `printer-ip-conflict` correctly gates `addressOk` on `addressChecked`.
  `printer-ip-conflict` is the model to copy.

**(c) Taxonomy axes disagree in two scenarios without any test noticing.**
`printer-paper-jam` and `patch-keystone-loose` are both
`scenarioType: "FOUNDATIONAL_DIAGNOSIS"` at `difficulty: "intermediate"`.
`contentQuality.test.ts:202-224` validates that the type is *in the enum* and
that the axes are each well-formed, but never that they are mutually consistent.

**(d) `switch-port-faulty` verifies while the fault remains in service.** Its
`successConditions` is `switch.ports.3.link === true` (the phone moved to port
4) and `verificationSteps` deliberately assert `switch.ports.2.link === false`
(`switch.ts:926`) — i.e. the switch still has a dead port and the scenario counts
as resolved. Defensible as "restore service, confirm the component", but the
family has **no state to record an RMA**, so the actual repair is inexpressible.
*Fix direction:* either add a `portQuarantined`/`rmaRaised` flag with its own
`appliesWhen`, or reword the success condition so the debrief does not claim the
fault is closed.

---

#### P2-11 — The root-cause indicator in `router-upstream-outage` is drawn on a non-selectable element

**Files**
- `src/features/environments/equipment/svg/RouterSvg.tsx:37-42`
- `src/content/scenarios/equipment/router.ts:1003-1021, 1076-1101`

**Problem**
The `MODEM` block and its lamp (bound to `flag(state, "upstreamOk")`) sit
*outside* every `HotspotG` — the SVG's first hotspot opens at line 45. It is
therefore drawn but not clickable, not focusable, and not in the legend. The
lamp is the single most diagnostic mark in `router-upstream-outage` (whose root
cause *is* `upstreamOk: false`), and the learner is shown a red lamp on a part
they cannot select, while the selectable `router-wan` hotspot correctly reports
"Link up — path not checked".

**Why it matters**
This is the "visually present but causally irrelevant — or conversely, causally
critical but not reachable" inversion the brief asks about. It also compounds
P1-2: the same fact is simultaneously over-shown (a red lamp, before evidence)
and under-reachable (no way to inspect the element carrying it).

**Fix direction**
Bring the modem inside the `router-wan` `HotspotG` (it is the far end of the WAN
path, which is exactly what that component describes), and gate its lamp on
`wanChecked` to match `families/router.ts:200-204`.

---

#### P2-12 — `UpsSvg`'s footer caption contradicts the panel header in `ups-breaker-tripped`

**Files**
- `src/features/environments/equipment/svg/UpsSvg.tsx:166-171`
- `src/features/environments/equipment/families/ups.ts:32-41`

**Problem**
The footer renders:
```tsx
{v.outputLed !== "ok" ? "OUTPUT DEAD" : flag(state,"inputPresent") ? "LOAD ON MAINS" : "LOAD ON BATTERY"}
```
In `ups-breaker-tripped` the seed is `outletsLive: true, inputPresent: true,
outputPresent: false`. The header status is "No output" and the `OUT` lamp is
red — but the footer reads **"LOAD ON MAINS"**, because it tests `outputLed`
first and `outletsLive` second never. The outlet bank at `:158` is simultaneously
stroked green (`outletsLive`), i.e. six green outlet rectangles labelled "LOAD ON
MAINS" on a unit reporting no output.

**Why it matters**
Three elements of the same 2D frame assert contradictory facts about the same
device. In the UPS family this is the frame a learner will stare at longest,
since the scenario's whole point is that the *input breaker* — not the outlets —
is what opened.

**Fix direction**
Drive the footer from `family.status(state)` and the outlet bank from
`outputPresent` (not `outletsLive`), so the caption, the header, and the lamps
share one source. Note that `families/ups.ts:169` already lists `outletsLive` as
an evidence row for `ups-output` while the SVG uses it as a liveness paint —
another instance of P1-2's root cause.

---

### P3

---

#### P3-1 — `initialWorld` remains `z.record(z.string(), z.unknown())`

`src/content/schema/index.ts:221`. Earlier-audit item 7, unchanged. A misspelled
family key (`prnter:`) passes validation; `familyState` (`registry.ts:25-30`)
returns `{}`; `flag()` returns `false` for everything; and the family renders a
fully green, fully healthy device. The failure is silent and looks like success.
*Fix direction:* add a per-`deviceFamily` `z.object` shape for the world
namespace, or at minimum a `superRefine` that requires the declared family's
`worldKey` to be present and to contain that family's canonical keys.

#### P3-2 — Derivation defaults are inconsistent in polarity: some fabricate health, some fabricate failure

`src/engine/conditions.ts`:
- router `dhcpPoolFree` defaults to `-1` (`:156`) → `dhcpServing: false` → a
  router scenario that simply omits the key silently reports DHCP down.
- UPS `loadOk` defaults to `true` when `loadPct` is absent (`:213`) → an
  uninitialised UPS reports a healthy load.
- switch `trunk` defaults to `[1]` (`:166-168`) and port `vlan` to `1`
  (`:180`) → VLAN 1 is always "on the trunk", so a missing `trunkCarries` looks
  correct rather than unexamined.
- patch `horizontalPort`/`patchPanelPort` default to `-1`/`-2` (`:219-220`) so
  `panelMatch` is `false` by default, i.e. a mismatch is the resting state.

Both directions are wrong for the same reason: an absent key is treated as a
*fact* rather than as *unknown*. *Fix direction:* derive `…Ok: boolean | null`
where absence is meaningful, and render `null` as an explicit "not measured"
tone, reusing the `"unknown"` tone the family status functions already have.

#### P3-3 — The LED labelled "WAN" on the router is not the WAN link

`src/features/environments/equipment/svg/RouterSvg.tsx:98-101` binds
`v.internetLed` — a `clientPath`-derived value — to a lamp captioned `WAN`,
while the physical WAN link state is drawn only as cable colour at `:50`
(`wanLinked`). In `router-wan-misconfigured` (`wanLink: true`,
`wanReachable: false`) the cable is drawn solid green while the lamp captioned
"WAN" is red. The router has no WAN-link lamp at all; `v.wanLed` is computed
(`families/router.ts:24`) and drawn only in 3D (`RouterStage.tsx:49`).
*Fix direction:* bind the "WAN" lamp to `v.wanLed` and add a separate
"INTERNET" lamp for `v.internetLed`; the 3D stage already has four distinct
lamps, so the 2D projection is the one that collapsed them.

#### P3-4 — Two 3D geometry facts contradict their own state

- `src/features/environments/equipment/3d/stages/RouterStage.tsx:53` hard-codes
  the router's mains lead as `seated={false}` regardless of `powerOn`, so the
  device is drawn with an unplugged power lead while `v.powerLed` reports `ok`.
- `src/features/environments/equipment/3d/stages/UpsStage.tsx:106` places the
  `ups-input` lamp at `position={[-0.075, 0.16, 0.172]}` — the **front** face —
  inside the group whose inlet, breaker, and lead are all on the **rear**
  (`z = -0.171`). The "IN" lamp floats on the opposite side of the chassis from
  the input it labels.

#### P3-5 — 3D geometry is rebuilt on every hover tick

`src/features/environments/equipment/3d/core.tsx:134-146` memoises `TubeGeometry`
on `[from, to, seated, sag, radius]`, and every stage passes **inline array
literals** for `from`/`to` (e.g. `RouterStage.tsx:55-56, 74-75, 95-96`;
`UpsStage.tsx:90-91`; `SwitchStage.tsx:133-134`; `PatchPanelStage.tsx:68-69,
80-81, 137-138`). A new array identity each render ⇒ the `useMemo` misses ⇒ a
`TubeGeometry` is constructed and the previous one disposed. Because
`EquipmentLabView` stores hover in React state (`EquipmentLabView.tsx:129, 150-161`),
**every pointer move over a 3D part disposes and rebuilds every cable geometry in
the scene.** Compounding it: `InvalidateOnRender` (`core.tsx:82-88`) calls
`invalidate()` from an effect with no dependency array, forcing a frame on every
render, and `shadowKey` (`RouterStage.tsx:30`, `UpsStage.tsx:35`,
`SwitchStage.tsx:44`, `PatchPanelStage.tsx:41`) is a string that changes with every
LED tone, remounting `ContactShadows` (`core.tsx:327-337`) each time.
*Fix direction:* hoist the cable endpoints to module-level `const` tuples (or
serialise them into the memo key), and derive `shadowKey` from a coarse state
fingerprint rather than every lamp.

#### P3-6 — 3D infrastructure is duplicated between the bench and the equipment lab

- `equipment/3d/sceneCtx.ts` exports `InteractCtx`, `MotionCtx`, `EC`;
  `hardware3d/sceneCtx.ts` exports `SceneInteract`, `InteractCtx`, `MotionCtx`,
  `AC`/`C`. Two palettes, two context modules, two `useHot` implementations.
- `equipment/3d/core.tsx:52-80` (`Interactive`) and `:25-49` (`Led`) duplicate
  `hardware3d/parts.tsx`.
- `equipment/hotspot.ts:77-91` and `benchHotspot.ts:254-268` are byte-equivalent
  apart from the id type — and they diverge in the heuristic:
  `compId.replace(/-/g, " ")` vs `compId.replace("-", " ")`.
- Three independent path readers: `getByPath` (`engine/conditions.ts:3-13`),
  `readAny` (`benchHotspot.ts:40-48`), `readPath` (`equipment/hotspot.ts:10-17`).

Earlier-audit item 1, partly addressed. *Fix direction:* lift
`Interactive`/`Led`/`Cable`/`Rj45`/`StageFrame` and the two contexts into one
`features/environments/three/` module with a single palette parameterised by
family; export one `readPath` from the engine and import it in both hotspot
builders.

#### P3-7 — The hardware and equipment labs share one persisted 3D/2D view preference

`src/features/environments/hardware3d/capabilities.ts:3` defines
`STORAGE_KEY = "itlab.hardwareView"`, and both `HardwareLabView` and
`EquipmentLabView` import `readStoredView`/`storeView` from it. Choosing 3D on a
PC-bench scenario forces 3D on the next printer scenario. Also
`prefersReducedMotion()` is read once into `const [reduced] = useState(…)`
(`EquipmentLabView.tsx:118`, `HardwareLabView.tsx:97`), so an OS-level
preference change mid-session is not observed. *Fix direction:* namespace the
storage key per environment family.

#### P3-8 — `EnvironmentRenderer` will render an empty stage for a schema-valid equipment scenario

`src/features/environments/EnvironmentRenderer.tsx:57` routes on
`kind === "equipment-bench" || scenario.environment.deviceFamily`, but
`deviceFamily` is `.optional()` in the schema (`schema/index.ts:219`). A scenario
with `kind: "equipment-bench"` and no `deviceFamily` reaches `EquipmentLab`, whose
`if (!family) return null` (`EquipmentLab.tsx:88`) yields a blank stage with no
fallback and no error. `logic.test.ts:93-121` guarantees no *shipped* scenario is
in that state, but the runtime has no guard. *Fix direction:* route on
`deviceFamily` presence only, and fall through to `HardwareLab` otherwise.

#### P3-9 — `docs/ARCHITECTURE.md` predates Phase 9 and Phase 11

- `:15` lists the domain labs as "Hardware, Network, Windows, Linux, Support,
  Security" — omits **Database** and **Equipment**.
- `:16-17` names the engine modules "conditions, scenario, terminal, evaluation
  (ActionEvaluator), conversation (ConversationEngine), scoring (HintSystem)".
  No `ActionEvaluator`, `ConversationEngine`, or `HintSystem` exists.
- `:31-38` (run flow) never mentions `deriveWorld`/`deriveEquipment`, the single
  most consequential engine behaviour in the codebase.
- `docs/SIMULATION_ARCHITECTURE.md` documents conditions, patches, and
  `recordCommand` but contains **no** mention of `deriveEquipment` — the engine
  section is the natural home for the causality layer and omits it entirely.
- `docs/ENVIRONMENT_ARCHITECTURE.md:131` lists `features/env/Indicator.tsx` in the
  primitives table; the component is exported from `features/env/Chain.tsx`
  (`features/env/index.ts:3`) and no `Indicator.tsx` exists.
- `docs/CONTENT_AUTHORING.md` is a 64-line checklist that predates Phase 11
  entirely: its "Where content lives" table lists only
  `src/content/scenarios/index.ts` (not `scenarios/equipment/`), and it documents
  neither `deviceFamily`/`kind: "equipment-bench"`, nor the seed-stability rule
  (`deriveWorld(initialWorld)` must be a no-op), nor the whole-array replacement
  rule for `switch.ports` — the three rules whose violation is most likely and
  most silent.
- `docs/SCENARIO_ENVIRONMENT_MATRIX.md:37-38` begins the 31 equipment rows in a
  table with **no header row**, so they render as an unlabelled table in Markdown.

#### P3-10 — All 31 equipment scenarios ship inside the entry chunk

`dist/assets/index-*.js` = 1430.11 kB (375.61 kB gzip), and it contains all six
family modules, all six SVGs, and all 31 scenarios' content. Family *geometry* is
correctly split (6 chunks + shared `core-*.js`, verified); scenario *content* is
not. The report's "3D lazy loading" claim is accurate as stated; a reader could
easily over-read it as "equipment does not cost the entry bundle".
*Fix direction:* treat content splitting as a separate, later decision — with 61
scenarios it is not yet load-bearing, but it should be recorded as a known
ceiling rather than left implicit.

---

## 3. PHASE 11 ACCEPTANCE MATRIX

| Requirement | Evidence in code | Status | Risk |
|---|---|---|---|
| 61 total scenarios (30 + 31) | `logic.test.ts:74-91` (`getScenarios().length === 61`, `equipmentScenarios.length === 31`, per-family `{printer:5, router:6, switch:5, "access-point":6, ups:5, "patch-panel":4}`); `simulation.test.ts:314-315`. Verified: 31 unique tickets `HD-1028`–`HD-1058`. | **MET** | none |
| 6 new equipment families | `deviceFamilySchema` (`schema/index.ts:195-202`); `FAMILIES` (`registry.ts:10-17`); parity asserted `logic.test.ts:43-45` | **MET** | none |
| 31 equipment scenarios, all `kind="equipment-bench"` | `logic.test.ts:93-121` proves `isBench ⟺ deviceFamily !== undefined` for all 61, plus `category === "hardware"`, `shell === "none"`, tools present | **MET** | none |
| `EnvironmentRenderer → EquipmentLabView → EquipmentLab` | `EnvironmentRenderer.tsx:57-59` (priority 1, before the hardware catch), `:53` `key={scenario.id}`; `EquipmentLabView.tsx:111-249`; `EquipmentLab.tsx:67-209` | **MET** | none |
| No scenario-id branching in renderers | Manual review of all 6 families, 6 SVGs, 6 stages, `EquipmentLab`, `EquipmentLabView`, `hotspot.ts`: every branch is on `visible()`, world state, or reveal flags. No `scenario.id` comparison exists in `src/features/**` | **MET** | none |
| 2D SVG implementation per family | 6 components in `equipment/svg/`, dispatched via `SVG_BY_FAMILY` (`EquipmentLab.tsx:53-60`); all use `HotspotG` + `Led` from `shared.tsx` | **MET** | none |
| Lazy 3D implementation per family | `EquipmentLabView.tsx:32-51` (6 `React.lazy`); build emits `PrinterStage` 3.60 kB, `RouterStage` 2.44 kB, `SwitchStage` 2.41 kB, `AccessPointStage` 1.80 kB, `UpsStage` 3.57 kB, `PatchPanelStage` 3.71 kB + shared `core-*.js` 5.14 kB | **MET** | none |
| Three.js / R3F remains out of the initial bundle | Verified: `dist/assets/index-*.js` contains no `WebGLRenderer`; it is in the lazily-imported `ContactShadows-*.js` (928 kB). `stageTypes.ts` is three-free by design | **MET** | none |
| Capability gate + reduced-motion fallback | `capabilities.ts:49-57` (`resolveInitialView`, unit-tested via `hardware3d/logic.test.ts`); `EquipmentLabView.tsx:117-125`; `SceneBoundary` error boundary (`:53-67`) falls back to 2D on throw; asserted `equipmentExpansion.test.tsx:124-134` | **MET** | View preference leaks between the bench and equipment labs (P3-7) |
| `PART_IDS` ↔ family component parity | `partIds.ts` (6 arrays); asserted set-equality `equipmentExpansion.test.tsx:106-121`; `logic.test.ts:47-70` also asserts membership in the shared `focusTarget` enum | **MET (weakly)** | Compares two hand-maintained declarations; no stage is ever mounted, so a stage that renders nothing passes (P1-5, P0-2, P0-3) |
| Hotspot ↔ `environment.components` parity | `logic.test.ts:106-111` validates every declared id against its family (all 31). `equipmentExpansion.test.tsx:51-103` validates rendered hotspot **counts** for 5 of 31 | **PARTIAL** | Count-only for 5/31; ids never compared; a component rendered but inert passes (P1-5, P2-5) |
| Every equipment component has a visible representation | Manually verified: all 26 family components have a 2D `HotspotG` **and** a 3D `Interactive` group. Not asserted by any test | **MET (untested)** | Regression would be silent (P1-5) |
| Evidence / spoiler gating — printer (6 flags) | `queueChecked` ✓ (evidence + chain, tested), `neighborChecked` ✓ (tested), `addressChecked` ✓ (tested), `alarmChecked` ✗ 0 refs, `pathInspected` ✗ 0 refs, `tonerChecked` ✗ 0 refs | **PARTIAL (3/6)** | Fix-gates presented as disclosure gates (P1-1) |
| Evidence / spoiler gating — router (5 flags) | `wanChecked` ✓ (tested), `dhcpChecked` ✓, `natChecked` ✓, `lanChecked` ✓ (1 ref), `probeDone` ✗ 0 refs | **PARTIAL (4/5)** | Modem lamp leaks `upstreamOk` ungated (P1-2, P2-11) |
| Evidence / spoiler gating — switch (4 flags) | `portChecked` ✓, `uplinkChecked` ✓ (tested), `trunkChecked` ✓ (14 refs), `poeChecked` ✓ — **PoE lamp correctly gated in both projections** | **MET** | `switch-vlan-mismatch` never sets `portChecked` (P2-7); 3D trunk lamps assert false health (P0-2) |
| Evidence / spoiler gating — AP (1 flag) | `assocChecked` gates 5 evidence rows + `ap-poe`/`ap-radio` `componentState` + status ladder | **MET (in inspector)** | `AccessPointSvg.tsx:42` leaks `upstreamPoeCapable` ungated; `clientLed` misreports congestion (P1-2, P1-3) |
| Evidence / spoiler gating — UPS (5 flags) | `batteryChecked` ✓ (tested), `breakerChecked` ✓; `loadChecked` ✗, `outletChecked` ✗, `inputChecked` ✗ — all 0 refs | **PARTIAL (2/5)** | `outletsLive`/`inputPresent` are raw ungated evidence rows; SVG leaks BAT/TRIP/outlets (P1-1, P1-2, P2-12) |
| Evidence / spoiler gating — patch panel (3 flags) | `jackTraced`, `horizontalTraced`, `patchChecked` — 16/12/23 refs, all wired into evidence + chain + `componentState` + SVG cable/label rendering | **MET** | 3D cannot express `horizontalPort` at all (P0-1) |
| Gating is tied to **evidence**, not UI visibility | `EvidenceEntry.when` / `{path, when}` semantics in `types.ts:15-28`; `hotspot.ts:44-51` applies `when` to plain, path, and computed rows identically; `chain()`/`componentState()` gate independently. 7 assertions in `logic.test.ts:290-424` | **PARTIAL** | Correct in the inspector/chain; **not** applied to any LED, colour, cable stroke, or 3D lamp (P1-2) |
| Wrong actions graded appropriately | `contentQuality.test.ts:33-61` — every `*-wrong` action carries a negative grade across all 61; 10 audited traps assert `scoreDelta < 0`. Equipment traps use `risky`/`premature`/`unnecessary`/`low-value` with substantive rationale | **MET** | none |
| No premature fixes | Every equipment fix carries `appliesWhen` on a check-derived flag; enforced end-to-end in `engine/scenario.ts:116-121` and surfaced as `disabled` in `InspectDock`. No test enumerates this for all 31 | **MET (untested at scale)** | `contentQuality.test.ts:124-137` proves it for `windows-wont-boot` only |
| All 31 scenarios solvable | Traced by hand: every `successConditions` + `verificationSteps` pair is reachable via the authored fix chain under `deriveEquipment`. No unreachable success state found | **MET (manual)** | No automated solvability test exists for any scenario (P1-5) |
| Debriefs teach a transferable principle | `contentQuality.test.ts:111-121` requires a `Rule out` methodology step and the literal string `Transferable principle` in all 61. All 31 equipment debriefs do state a specific, non-generic principle | **MET** | none |
| Multiple plausible observations before diagnosis | Each scenario seeds 3 hypotheses with 2 `initiallyPlausible: true`; each provides 2-4 evidence actions, only one of which discriminates. `printer-network-unreachable` and `router-upstream-outage` are the strongest | **MET** | 4 scenarios are cosmetically parallel (P2-10a) |
| `typecheck` clean | `tsc -b --pretty false` → 0 errors | **MET** | — |
| `lint` clean | `eslint .` → 0 errors, 0 warnings | **MET** | — |
| `build` clean | `vite build` → ✓ built in 2.64s | **MET** | 1.43 MB entry chunk (P3-10) |
| 261/261 tests passing | Verified: 20 files, 261 passed | **MET** | See P1-5: 7 gating assertions, 1 of 31 fix progressions, 0 3D mounts |
| No new dependencies | `package.json` unchanged in shape; all equipment code uses `react`, `three`, `@react-three/fiber`, `@react-three/drei`, `lucide-react`, `zod` — all pre-existing | **MET** | none |
| `ScenarioPage` untouched | `ScenarioPage.tsx` imports only `EnvironmentRenderer` from the environments feature; no equipment import, no `deviceFamily` reference, no equipment-specific branch | **MET** | Indirect effect: 17 equipment scenarios now expose the Customer dock (P2-4) |
| 6 family registries | `registry.ts:10-17`; each family is one `FamilyDef` in `families/*.ts`; `FAMILIES` keys asserted equal to `deviceFamilySchema.options` | **MET** | Family *visual* projections are 6 free functions + a record in the view, not registry members (P2-9) |
| Architecture docs updated | `IT_EQUIPMENT_ARCHITECTURE.md` (new, 230 lines), `ENVIRONMENT_ARCHITECTURE.md` (routing + lazy strategy + world keys all updated), `SCENARIO_CATALOG.md`, `SCENARIO_ENVIRONMENT_MATRIX.md` (all 31 rows), `DOMAIN_GRAMMAR.md` §Equipment, `VERIFICATION.md` | **PARTIAL** | Counts and per-family tables verified accurate (types 8/10/6/3/2/2, difficulty 8/5/17/1, per-family 5/6/5/6/5/4 — all exact). But the `FamilyDef` interface, the single-source-of-truth invariant, and the reveal-flag table are contradicted by code (P2-9); `ARCHITECTURE.md`/`SIMULATION_ARCHITECTURE.md`/`CONTENT_AUTHORING.md` untouched (P3-9) |

---

## 4. TOP 5 NEXT ACTIONS

Ordered by dependency — each unblocks the next. None of these is a redesign.

**1. Make the shared projection contract actually shared, then move gating into it.**
Everything in P1-2, P1-3, P0-2, P0-3, P2-3, P2-4 and P2-12 is one root cause:
`family.status()`/`componentState()` are gated, and the visuals are not, because
the visuals are not part of the family contract. Concretely: (a) give each
`FamilyDef` a `visuals(state): FamilyVisuals` member so the six free functions
become registry data and the doc's `visual(state)` line becomes true; (b) thread
the `*Checked` reveal flags into every `*Visuals()` tone; (c) delete the direct
`flag(state, …)` reads from all six SVGs. This is the prerequisite for the
spoiler problem having any durable fix, and it also makes P0-2 and P0-3
structurally impossible rather than individually patched. Add the generic
regression test described in P1-5's fix direction in the same change, so the
invariant is enforced from the moment it becomes true.

**2. Fix the two 3D/2D divergences that assert false facts, and the two state keys the projections cannot express.**
`PatchVisuals.activeRunIndex` (P0-1), the switch trunk projection (P0-2), the
AP upstream switch (P0-3), and the AP `clientLink` consumption (P1-3). These are
independent of action 1's mechanics but share its test, and they are the four
places where the simulation currently teaches something false. `patch-crossconnect-mislabelled`
and `switch-vlan-mismatch` are the two scenarios that justify the whole family
architecture; in 3D neither currently works.

**3. Scope `deriveEquipment` to the declared family and close the `world.printer` namespace collision.**
P0-4. This is a correctness defect in the engine's blast radius, it is the item
the earlier audit specifically asked about, and it is cheap: gate on
`environment.deviceFamily` rather than key presence, then widen
`logic.test.ts:124-131` from "every equipment scenario" to "every scenario in the
catalogue". Do the namespace rename or migration in the same change, because
widening the test will immediately surface the second-order problem.

**4. Replace the hand-maintained parity declarations with enforced ones, and add state-mutation assertions.**
P1-5, P2-2. Today `PART_IDS` is a declaration compared to a declaration, and
hotspot parity is a cardinality check over 5 of 31 scenarios. Introduce a
per-family `hotspotIds()` declaration, assert set equality for all 31, drive port
rendering from `switchPorts(state).length` instead of three separate literals,
and add the "an applied action must change something inside that component's
subtree" assertion. Without this, actions 1-3 can regress silently, and no
future 3D code gets any coverage at all (no stage is ever mounted).

**5. Reconcile the content/gating contract: the 7 inert reveal flags, the `relatedAction` binding, and the two documentation tables that assert behaviour the code does not implement.**
P1-1, P2-1, P2-9. These are one review pass over the same three artefacts
(`families/*.ts` evidence tables, the flag table in `IT_EQUIPMENT_ARCHITECTURE.md`,
and the "gated" column in `SCENARIO_ENVIRONMENT_MATRIX.md`), and they must be
changed together — currently the docs describe a stronger contract than the code
implements, which is what allowed P1-2 to ship. Fixing `relatedAction` in the
same pass removes the mis-bound and missing action buttons in
`patch-switch-port-disabled` and `ups-breaker-tripped`.

---

## 5. DO NOT FIX YET

Real issues that should deliberately wait for a later phase.

1. **P3-10 — Splitting scenario content out of the entry chunk.** The entry bundle
   is 1.43 MB, but that is a Phase 10 baseline condition, not a Phase 11
   regression, and 61 scenarios does not justify route- or family-level content
   splitting yet. Record the ceiling; revisit when the catalogue or the KB passes
   a threshold that makes first-paint measurable.

2. **P3-1 / P3-2 — Replacing `initialWorld: z.record(string, unknown)` with
   per-family typed world schemas, and making absent keys mean *unknown* rather
   than *false*.** This is the right long-term model and it touches every
   scenario in the catalogue, both families, and the engine. It is a
   schema-migration project, not a hardening task, and it should follow — not
   accompany — the projection work in action 1, so the migration has a stable
   target shape.

3. **P3-6 — Unifying the bench and equipment 3D infrastructure** (contexts,
   palettes, `Interactive`/`Led`/`Cable`, the duplicated `related`/`locked`
   block, the three path readers). Real duplication, but the two labs are
   currently stable and independently evolvable, and merging them risks
   destabilising the Phase 9 workbench for no Phase 11 benefit. The cheap
   half — aligning `replace("-", …)` to `replace(/-/g, …)` and importing one
   `readPath` — can be done opportunistically; the full merge should be its own
   phase.

4. **P2-6 — Deleting `showInspector`.** Correct, trivial, and entirely
   independent of every other finding. Deleting a schema field touches all 61
   scenario files and produces a large, noisy diff for zero behavioural change.
   Fold it into whatever future phase last touches the schema (i.e. whichever
   phase does item 2 above), so it rides along.

5. **P2-4 — Authoring real conversation scripts for the 17 equipment scenarios
   with a walkup/phone channel.** The *one-line* gate fix (require
   `scenario.conversation !== undefined`) should be done as part of action 5
   since it is a behaviour change with a doc consequence. Whether equipment
   scenarios *should* have customer conversations is a pedagogy decision, not an
   engineering one, and should not be pre-empted here.

6. **P2-10a — De-duplicating the four "someone was in the room" cable
   scenarios and the two shared-budget scenarios.** This is a content-design
   decision with curriculum implications (difficulty distribution, prerequisite
   graph, catalog targets all shift). It belongs to a content phase with its own
   targets, not to a hardening pass.

7. **P2-10b / P3-9 — Taxonomy consistency (`FOUNDATIONAL_DIAGNOSIS` at
   `intermediate`) and the `ARCHITECTURE.md` / `SIMULATION_ARCHITECTURE.md` /
   `CONTENT_AUTHORING.md` staleness.** Individually trivial; collectively a
   documentation sweep that should happen once the code they describe has
   stopped moving — i.e. after actions 1-5 land.

---

## 6. FINAL RECOMMENDATION

**NEEDS TARGETED HARDENING**

Phase 11 is not superficial work. The family registry, the engine causality layer,
the declarative routing, the seed-stability invariant, the component-vocabulary
parity, and the six-way 3D lazy split are all real, all load-bearing, and all
correct on their own terms — verified independently, not taken from the report.
The 261/261 is honest about what it claims and the build graph is genuinely clean.

What is not yet true is the phase's central safety claim. The evidence-gating
design is well conceived and correctly implemented in the status, chain, and
inspector layers, and the switch family demonstrates the pattern working end to
end in both projections. But the 2D and 3D visual layers read raw world state
around that discipline rather than through it, and the result is a set of
reproducible t=0 spoilers in five of six families plus 3D visuals that assert
facts the simulation state contradicts. The documentation describes the intended
contract in enough detail that the gap reads as resolved.

That is a bounded, well-understood class of defect with a single root cause and a
known fix, sitting on top of a sound foundation. It is not major rework: no
scenario needs to be rewritten, no architecture needs to be replaced, and
`ScenarioPage` needs no change. It is also not "ready": four scenarios currently
teach something the 3D view draws incorrectly, one engine derivation writes into
a foreign namespace, and the tests are structurally incapable of catching any of
it.

Recommended: execute the five next actions in order, beginning with the shared
projection contract, before any further scenario or family work is layered on top.


---

## 7. PHASE 11.1 RESOLUTION

Hardening pass executed against this audit. All work is scoped to the five
recommended next actions plus the two P2 findings that coincided with them.
No scenario was rewritten, no dependency was added, `ScenarioPage` was not
touched, and the six-way 3D lazy split is intact (all six `*Stage` chunks
still emit separately from the entry bundle).

### P0 fixes

1. **P0-1 (patch panel leakage).** `patchPanelVisuals().activeRunIndex` is now
   `null` until `horizontalTraced`, and `switchPortLeds` reports the disabled
   port only after `patchChecked`. `PatchPanelSvg` gates the horizontal run
   path off `activeRunIndex` (and gained `data-testid="patch-horizontal-run"`),
   and `PatchPanelStage` only lands the run cable on a panel port after the
   trace - before it, the cable parks off-screen and the shadow key follows the
   gated visuals.
2. **P0-2 (switch trunk + PoE lamps).** `trunkTone` is `off` until
   `trunkChecked`, then `ok`/`warn` from the routed-vs-linked comparison;
   `poeLed` is `null` until `poeChecked`. Both SVG and stage read the visuals
   exclusively - the PoE lamp no longer renders red at t=0 in
   `switch-poe-overload`, and the trunk badge never asserts membership before
   the trunk is checked.
3. **P0-3 (AP upstream lamp).** `upstreamLed` is `off` until `assocChecked`,
   then `ok`/`warn` from `upstreamPoeCapable`. `AccessPointSvg` was already
   reading the visuals field; `AccessPointStage` was rendering its own raw
   `assocChecked` cylinder and now renders the shared `Led upstreamLed` next to
   a serving-switch box, so both projections show one truth.
4. **P0-4 (foreign namespace in legacy content).** The `printer-not-printing`
   seed was migrated to canonical printer keys (including the derived
   `powerOk`/`netLink`/`printReady` so `deriveWorld` is a no-op), and
   `check-printer-power` no longer writes `printer.online`. Grep confirms the
   only remaining `online`/`tonerLow`/`paperJam` occurrences in scenario
   content are prose.

### P1-1 - inert reveal flags now change displayed evidence

- **Printer** (lamps and LCD status deliberately untouched - see below):
  `alarmChecked` gates the `Jam` evidence row, `pathInspected` gates the
  `doorClosed` row, `tonerChecked` gates the `tonerOk` row and puts
  `printer-cartridge` into `Not inspected`, and `printer-paper` reads
  `Alarm not read` until the panel alarm is read. Matrix lines 39/41 are now
  literally true.
- **UPS**: `inputChecked` gates the `Utility input` evidence row and the
  `ups-input` verdict (`Not checked` -> `No input power`); `outletChecked` gates
  the `Outlet group` row and the `ups-output` verdict (`Bank not inspected` ->
  `Outlets dead`); `loadChecked` gates the `Load %` row; the chain input step
  reads `Not checked` until the inlet is inspected.
- **Router**: `probeDone` now relabels `router-wan` from `Upstream down` to
  `First ISP hop unreachable`, and from `Reachable` to `Path verified` after the
  escalation fix.

### P1-2 - systemic visual gating (the audit's leak table)

Gating philosophy applied consistently: **physical and symptom facts stay
ungated** (ticket-observable lamps, cords, link lights, LCD status),
**checked-class facts gate** behind their `*Checked`/`*Traced` flags.

- **UPS**: new `breakerLed` (off until `breakerChecked`), `batteryLed` now off
  until `batteryChecked`, new `outletsLed` driven by `outputPresent` with the
  crit readout gated on `outletChecked`. `UpsSvg` breaker text now renders
  `—` -> `ON`/`TRIP`, outlet sockets render neutral -> red only after
  inspection; `UpsStage` breaker button and outlet lamps read the same fields.
- **Router**: `natLed`, `dhcpLed`, and the `internetLed` fault branch are off
  until `natChecked`/`dhcpChecked`/`wanChecked`.
- **Printer**: the audit's P1-2 table did not list the jam/toner lamps, and
  both printer tickets report them as symptoms ("panel flashing", "says toner
  is out"); hints reference the flashing lamp. They are therefore **not**
  gated - gating them would hide the reported symptom. The printer's covered
  surface is the P1-1 evidence/component-state wiring above.
- **P2-11**: the MODEM block moved inside the `router-wan` hotspot (it was an
  unclickable orphan) and its lamp now waits for `wanChecked`.
- **P2-12**: the outlet-bank contradiction reproduced exactly - six green
  sockets while output was dead, because they followed `outletsLive`. Fixed via
  `outletsLed`. The cited footer claim did **not** reproduce: `UpsSvg`'s footer
  already tests `outputLed` first and reads `OUTPUT DEAD` whenever output is
  down (verified against the `ups-breaker-tripped` seed); header, footer, and
  lamps now share one source.

### P1-5 - test hardening

- Seed-stability drift test widened from the 31 equipment scenarios to **all
  61**. It immediately caught a real pre-existing drift: `pc-on-no-display`
  seeded `posted: false` while `deriveWorld` (fans spinning + front-panel
  connector + PSU output OK - engine authority, unmodified) derives `true`.
  The seed now matches derivation; success still requires `displayOk`, and no
  test or action gated on the old value.
- New gate-pair tests assert every newly gated visuals field is non-fault with
  its flag absent and fault-bearing once the flag is set (patch run/port lamp,
  switch trunk/PoE, AP upstream, UPS breaker/battery/outlets, router
  NAT/DHCP/internet).
- New flag-flip tests apply each check action and assert the inspector output
  changes: printer alarm/path/toner, UPS inlet/bank, router config/probe/fix.
- New `printer-not-printing` drift tests: no legacy keys, `deriveWorld` no-op,
  and the documented fix sequence satisfies `successConditions`.
- New SVG render tests: MODEM lives in the WAN hotspot group and its lamp
  waits for the check; UPS breaker text and outlet strokes stay neutral until
  inspected.
- Render-level tests for the 3D stages remain out of scope: stages mix R3F
  intrinsics that jsdom cannot render without a Canvas, which matches the
  existing suite's approach (3D is covered by `PART_IDS` parity; stage gating
  is covered through the shared `*Visuals` functions the stages consume -
  typechecked, so stages cannot bypass them).

### Deferred (unchanged from section 5)

`showInspector` deletion (item 4), P2-4 conversation authoring, P2-10a content
de-duplication, P2-10b/P2-10c + P3-9 taxonomy and documentation sweep (item 7),
P3-1/P3-2 typed world schemas, P3-6 lab merge, P3-10 bundle splitting. The
taxonomy label and doc staleness were deliberately not touched: they remain
deferred debt for the post-actions documentation sweep.

### Gates

`npm run typecheck` clean; `npm run lint` clean; `npm test` **278/278**
(261 baseline + 17 new); `npm run build` clean with all six `*Stage` chunks
lazy; 61 scenario IDs and FAMILIES/registry parity intact; no new
dependencies.