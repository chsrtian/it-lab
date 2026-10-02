# Phase 11.1 — Independent Verification Audit

**Scope:** read-only verification of eight specific Phase 11.1 claims against the
current source. No source modified, no browser launched, no E2E run. Not a
general architecture audit.
**Method:** direct reading of the current repository plus `npm test`,
`npm run typecheck`, `npm run lint`, `npm run build` and inspection of the emitted
`dist/assets` chunk graph.

**Locally reproduced gates**

| Gate | Result |
|---|---|
| `npm test` | **278 passed / 20 files** (claim: 278/278) |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run build` | ✓ built in 2.72s |
| Equipment 3D chunking | 6 `*Stage` chunks + shared `core-*.js` — intact |
| Entry chunk `WebGLRenderer` | absent (three.js still lazy) |
| Entry size | 1,431.78 kB (was 1,430.11 kB — +1.67 kB) |
| New dependencies | none |
| `ScenarioPage` | no equipment / `deviceFamily` / printer reference |

---

## VERIFICATION RESULT

### 1. PATCH PANEL — **PASS**

`patchPanelVisuals` (`families/patchPanel.ts:31-59`) now exposes
`activeRunIndex: number | null`, computed **only** from `horizontalTraced`:

```ts
activeRunIndex: flag(state, "horizontalTraced")
  ? Math.min(Math.max(runPort - 1, 0), PATCH_PANEL_PORTS - 1)
  : null,
```

All four path elements now agree between the simulated state and both
projections:

| element | simulated source | SVG | 3D |
|---|---|---|---|
| horizontal port | `horizontalPort` | `PatchPanelSvg.tsx:33` `runLandX = v.activeRunIndex !== null ? panelPortX(v.activeRunIndex) : 250` | `PatchPanelStage.tsx:81-85` `to={v.activeRunIndex !== null ? [panelPortX(v.activeRunIndex), …] : [0, …]}` |
| patch-panel port | `patchPanelPort` | `PatchPanelSvg.tsx:102` / `PatchPanelStage.tsx:141` — `panelPortX(v.activePanelIndex)` | same |
| patch cable | `patchSeated` | `PatchPanelSvg.tsx:106-109` (stroke + dash) | `PatchPanelStage.tsx:142` `seated={patchSeated}` |
| switch port | `switchPortNumber` / `switchPortEnabled` | `PatchPanelSvg.tsx:205` `v.switchPortLeds` | `PatchPanelStage.tsx:163, 172` |

**`patch-crossconnect-mislabelled` contradiction is resolved.** The seed is
`horizontalPort: 9, patchPanelPort: 5`. After `trace-run` sets
`horizontalTraced`, the run path (`d="M56 140 H${runLandX} V86"`,
`PatchPanelSvg.tsx:83`) terminates at `panelPortX(8)` while the patch lead
(`:102`) leaves from `panelPortX(4)`. The two cables visibly terminate on
different ports, matching the footer text `run lands P9 · patched P5 ·
MISMATCH` (`:236-239`) and the `patch-panel` verdict
(`families/patchPanel.ts:168-174`). No pre-trace leakage: `activeRunIndex` is
`null`, the run parks at x=250 and the `?` marker is drawn (`:92-99`).

A fourth leak was also closed: `switchPortLeds` for a disabled port is now
`patchChecked ? "warn" : "off"` (`families/patchPanel.ts:43`), so
`ups`/`patch` no longer shows a fault lamp before the patch lead is checked.
`data-testid="patch-horizontal-run"` (`PatchPanelSvg.tsx:90`) was added for
testability.

### 2. SWITCH — **PASS**

Trunk physical link state is no longer used to reveal the VLAN-10 root cause.
`SwitchVisuals` gained `trunkTone` and `trunkCarries`
(`families/switch.ts:53-67`, `69-99`):

```ts
trunkTone: !flag(state, "trunkChecked") ? "off"
  : linked === 0 ? "off"
  : routed === linked ? "ok" : "warn",
```

| stage | `switch-vlan-mismatch` (seed `trunkCarries: [1]`, port 1 in VLAN 10) |
|---|---|
| **pre-evidence** | `trunkTone: "off"` — `SwitchSvg.tsx:14` renders `C.muted`; `SwitchStage.tsx:80` renders `Led tone="off"`. Badge text is `"? ? ?"` (`SwitchSvg.tsx:111`). Membership never asserted. |
| **after `check-trunk`** | `linked: 4, routed: 3` → `trunkTone: "warn"` → `C.warn` in 2D, amber `Led` in 3D. Badge prints the real `1` (`SwitchSvg.tsx:111, 154`). |
| **logical VLAN state** | `path` is engine-derived per port (`conditions.ts` `link && uplinkLink && (vlan === 1 || trunk.includes(vlan))`), unaffected by the visual gate. After the `add-vlan-to-trunk` fix (`trunkCarries: [1,10]`) `routed === linked` → `trunkTone: "ok"`. |

The old false-green bug (`trunkChecked ? "ok" : "off"`, three unconditional green
LEDs) is gone. `poeLed` is now `null` unless `poeChecked`
(`families/switch.ts:79-84`), so `switch-poe-overload` renders no PoE lamp at
t=0. Both SVG (`:12`, `:14`) and stage (`:57-58`, `:80`) read the visuals
exclusively.

### 3. ACCESS POINT — **PASS**

`AccessPointVisuals` gained `upstreamLed`
(`families/accessPoint.ts:11-21`, `23-38`), gated on `assocChecked` and sourced
from `upstreamPoeCapable`. `AccessPointStage` now renders a **serving PoE
switch** (box at `:97-100`, port at `:101-104`, `Rj45` lamp at `:105`, `Led` at
`:106`) at the far end of the drop, and the drop continues past the grommet to it
(`:91-95`).

The two scenarios are now distinguishable, **state-driven rather than
decorative**:

| | `ap-poe-port-disabled` (`poeCableSeated: true, upstreamPoeCapable: false`) | `ap-drop-unplugged` (`poeCableSeated: false, upstreamPoeCapable: true`) |
|---|---|---|
| AP-side pigtail `:78-83` | `seated` — plug in the AP `Rj45` | `seated={false}` — plug visibly pulled back |
| grommet→switch run `:91-95` | seated | seated (the loose end is the pigtail) |
| switch port lamp `:105-106` | `upstreamLed` → `off` pre-check, `warn` after | `upstreamLed` → `off` pre-check, `ok` after |
| AP face lamp `:56` | `powerLed: "warn"` (cable seated, no power) | `powerLed: "off"` (cable out) |

`lampOf` (`AccessPointStage.tsx:30-37`) now maps `"crit"` to `EC.ledCrit`; the
old "3D PoE lamp can never render critical" defect is fixed. `AccessPointSvg.tsx:42`
binds the same `v.upstreamLed`. The representation is driven entirely by
`poeCableSeated`, `upstreamPoeCapable`, and `assocChecked` — no decorative
constant.

### 4. PRINTER CONTRACT — **PASS**

`printer-not-printing` (`src/content/scenarios/index.ts:4664-4681`) now seeds the
canonical vocabulary:

```
powerOn, powerCableSeated, netCableSeated, netPortOk, netEnabled, addressOk,
paperOk, tonerOk, doorClosed, jamPresent, spoolerRunning, queuePaused,
verified, powerOk, netLink, printReady
```

**Repository-wide search for the old competing vocabulary** (`online`,
`tonerLow`, `paperJam`) across all of `src/**/*.ts{,x}`:

- **Zero** occurrences as a world-state key in any scenario `initialWorld` or
  action `patch`.
- **Zero** renderer reads. No `SupportLab`, `HardwareLab`, or equipment module
  references them.
- Remaining hits are English prose, not state: `equipment/printer.ts:444` (a
  ticket title, "Printer is online but unreachable"), `equipment/router.ts:478,712`
  ("back online"), `equipment/ups.ts` `mode: "online"` (a UPS mode value, unrelated
  vocabulary), `engine/conditions.ts:205-206` (UPS mode default), and
  `scenarios/index.ts:4737` (a rationale string: "…rules out offline and
  paper-jam states…").
- `check-printer-power` no longer writes `printer.online`; no `printer: { online`
  construct remains in `scenarios/index.ts`.

**No production scenario or renderer depends on the old vocabulary.** The single
remaining prose reference (`index.ts:4737`) is descriptive text in a rationale,
not a state dependency.

Note on mechanism: `deriveEquipment` (`engine/conditions.ts:125-147`) is
**unchanged** — it still probes `objOf(out.printer)` by key presence with no
`deviceFamily` scoping. The defect was resolved by the *other* option I offered:
migrating the legacy seed to the same vocabulary and seeding the derived keys, so
`deriveWorld` is a genuine no-op. The safety property holds; the architectural
coupling remains (see P3-1).

### 5. SPOILER GATING — **PARTIAL**

Five of six families are correctly hardened. **The printer family was not.**

| family | representative root-cause indicator | pre-evidence | post-evidence | verdict |
|---|---|---|---|---|
| printer | `tonerOk` → amber `TONER` lamp, header "Low toner" | **amber / "Low toner"** | amber | **not gated** |
| printer | `jamPresent` → red `JAM` lamp, red tray stroke, `PAPER JAM` caption, header "Jam" | **red / "PAPER JAM" / "Jam"** | red | **not gated** |
| router | `natEnabled` → `NAT` lamp (`RouterSvg.tsx:130`, `families/router.ts:40`) | `"off"` | `"warn"` | gated |
| router | `dhcpServing` → `DHCP` lamp (`RouterSvg.tsx:110`, `:33-39`) | `"off"` | `"warn"` | gated |
| router | `wanReachable` → `internetLed` (`RouterSvg.tsx:102`, `:25-31`) | `"off"` | `"crit"` | gated |
| router | `upstreamOk` → `MODEM` lamp (`RouterSvg.tsx:48`) | `"off"` | `"crit"` | gated |
| switch | `poeBudgetOk` → PoE lamp (`SwitchSvg.tsx:12`, `SwitchStage.tsx:57`) | `null` | `"crit"` | gated |
| switch | trunk membership (`SwitchSvg.tsx:14`, `SwitchStage.tsx:80`) | `"off"` | `"warn"` | gated |
| access point | `upstreamPoeCapable` → `PoE SW` lamp (`AccessPointSvg.tsx:42`, `AccessPointStage.tsx:105`) | `"off"` | `"warn"` | gated |
| UPS | `batteryOk` → `BAT` lamp (`UpsSvg.tsx:97`, `UpsStage.tsx:162`) | `"off"` | `"crit"` | gated |
| UPS | `breakerOk` → breaker `ON`/`TRIP` (`UpsSvg.tsx:113-123`, `UpsStage.tsx:98-100`) | `—` | `TRIP` | gated |
| UPS | `outletsLive` → outlet sockets (`UpsSvg.tsx:173`, `UpsStage.tsx:128-141`) | `C.edge` (neutral) | `C.crit` | gated |
| patch panel | `switchPortEnabled` → switch port lamp (`PatchPanelSvg.tsx:205`) | `"off"` | `"warn"` | gated |
| patch panel | `horizontalPort` → run geometry (`PatchPanelSvg.tsx:33`) | `null` / parked | lands on port | gated |

**Bypass audit.** I enumerated every remaining `flag(state, …)` and `state.<key>`
read across all six SVGs. Every survivor is either (a) a reveal flag used *as* the
gate (`horizontalTraced`, `jackTraced`, `patchChecked`, `trunkChecked`,
`wanChecked` — `PatchPanelSvg.tsx:21-23`, `SwitchSvg.tsx:11`, `RouterSvg.tsx:48`),
or (b) a symptom-level physical fact (`jamPresent`, `printReady`, `netLink`,
`netCableSeated`, `powerOk`, `uplinkLink`, `uplinkCableSeated`, `lanLink`,
`clientPath`, `pathOk`, `radioUp`, `poeCableSeated`, `endpointSeated`,
`horizontalSeated`, `patchSeated`, `inputPresent`). No `*Checked`-gated
configuration fact is read raw outside its `*Visuals()` function. The P1-2
"raw state bypasses the shared gating mechanism" pattern is eliminated for
router, switch, UPS, access point, and patch panel.

The three previously-inert UPS flags, `probeDone`, and the three printer flags
are now all consumed — verified by direct symbol reference:
`ups.ts:68, 73, 122, 126-127, 182, 194, 207`; `router.ts:138-142`;
`printer.ts:119, 126, 215, 219, 227`.

**Why PARTIAL rather than PASS** is finding P1-1 below: 11.1 gated the printer
*inspector* on `alarmChecked`/`tonerChecked` but left the printer *visuals and
panel status* ungated, which introduced a new internal contradiction.

### 6. REGRESSION TEST QUALITY — **PASS**

17 tests added: `logic.test.ts` 22 → 36 `it()` blocks, `equipmentExpansion.test.tsx`
13 → 16. The 278/261 delta matches exactly.

**Genuinely protective (Visuals gate pairs)** — `logic.test.ts:528-587`, five
tests that assert each newly gated field is non-fault with its flag absent and
fault-bearing once set, using real scenario seeds via `seedOf()`
(`:47-54`): patch run index + disabled-port lamp, switch trunk + PoE, AP upstream,
UPS breaker/battery/outlets, router NAT/DHCP/internet. These would fail on a
reverted `*Visuals()`.

**Genuinely protective (inspector flag flips)** — `logic.test.ts:589-701`, six
tests that apply the real check action and assert the inspector changes:
`"Alarm not read"` → `"Jam present"` with the `Jam` evidence row appearing
(`:590-608`); `Cover` row appearing after `pathInspected` (`:610-623`);
`"Not inspected"` → `"Toner low"` (`:625-640`); UPS inlet and bank; router
config/probe/fix.

**Genuinely protective (SVG render-level)** — `equipmentExpansion.test.tsx:238-337`,
three tests that render the SVG component directly and assert on **DOM
attributes in both states**: the `MODEM` text node's `closest("g")` is the
`Router WAN` hotspot and its `circle[cx="34"][cy="72"]` `fill` is `toneFill("off")`
→ `toneFill("crit")` (`:239-277`); the breaker text is `—` and `TRIP` is absent,
then `TRIP` present (`:279-307`); all six outlet `rect[fill="#0a0f1a"]` have
`stroke === C.edge` then `C.crit` (`:309-337`). **These are the strongest tests
in the suite** — they pin the actual paint, so a revert to raw
`flag(state, …)` in the SVG would fail even though the Visuals tests would pass.

**Genuinely protective (drift)** — `logic.test.ts:703-749`: legacy-key absence,
`deriveWorld` no-op, and the full fix sequence satisfying `successConditions`
with `printReady: true`.

**On the 3D substitute (the brief's explicit question).** I agree with the
assessment that R3F/jsdom mounting is genuinely impractical, and the substitute
is *mostly* adequate but not complete. What it does provide: every 3D stage
imports its `*Visuals` function and paints **only** its returned fields —
verified by reading all six stages (`AccessPointStage` `:28, 56, 63-64, 75, 105-106`;
`SwitchStage` `:27, 54-58, 80, 108`; `UpsStage` `:28, 33, 98-100, 128-141, 162`;
`RouterStage` `:25, 48-51, 110, 121`; `PrinterStage` `:25, 53-55, 98-99, 114`;
`PatchPanelStage` `:35, 41, 82-84, 105, 141-142, 163, 172`). Because
`EquipmentStageProps.state` is `Record<string, unknown>` and the stage reads
`v.<field>`, the compiler forbids a typo but **cannot** forbid a stage adding a
raw `state.x === true` read alongside. That is the residual gap: the Visuals
tests + typechecking protect the *values*; only the three SVG tests protect the
*renderer's choice of field*. Switch trunk and AP upstream are covered at the
Visuals level only (no SVG/3D render test), so a future edit that re-added a raw
`flag(state, "trunkCarries")` read to `SwitchStage` would pass the suite. This
is a P2 residual, not a P1 — the same exposure existed before 11.1 and 11.1
strictly reduced it.

**Not protected:** hotspot-id set equality (still count-only for 5 of 31), and
`PART_IDS` parity remains a set comparison between two hand-maintained
declarations — unchanged, and out of 11.1's reported scope.

### 7. SEED / ENGINE CONSISTENCY — **PASS**

`logic.test.ts:138-145` now iterates `getScenarios()` — **all 61**, not the 31
equipment scenarios. The assertion is meaningful:

```ts
for (const s of getScenarios()) {
  const seeded = s.environment.initialWorld;
  expect(deriveWorld(structuredClone(seeded)), s.id).toEqual(seeded);
}
```

`toEqual` is a deep comparison against a structured clone, so any derived key
that is **missing**, **extra**, or **differing** fails with the scenario id as the
message. This is a genuine invariant, not a smoke test: it is exactly the
assertion whose absence allowed `deriveEquipment` to write `powerOk: false` into
a foreign `world.printer` undetected.

**`pc-on-no-display` correction is real and correctly diagnosed.** The seed
(`scenarios/index.ts:31-45`) is now `powerSwitchAtWall: true,
powerCableSeated: true, psuToggle: true, psuOutputOk: true,
frontPanelConnector: true, fansSpin: true, ledsOn: true, monitorPower: true,
videoCableToGpu: false, gpuSeated: true, ramSeated: false, beepCode: "one-short",
posted: true, displayOk: false`. Traced against the unmodified bench derivation
(`engine/conditions.ts`): `outputOk = wall && cable && toggle !== false` = `true`
→ the `if (!outputOk)` block is skipped so `posted` is not cleared; the
`fansSpin && posted !== true && frontPanelConnector` branch is a no-op because
`posted` is already `true`; the final `posted && !outputOk` guard does not fire.
Stable, and the correction is semantically right — POST completes, the display
does not, which is the scenario. The widened test found a genuine pre-existing
Phase 8 drift, which is the strongest available evidence that the widened scope
is doing work.

Engine architecture is preserved: `deriveEquipment` is byte-for-byte the same
six-family block, `deriveWorld` still composes `deriveEquipment` then the bench
chain, and no derivation moved into a renderer.

### 8. NEW REGRESSIONS — **PASS**

Inspected only the surfaces 11.1 touched. No regressions found.

- `ScenarioPage` has no equipment / `deviceFamily` / printer reference.
- Build: all six `*Stage` chunks still emitted separately
  (`AccessPointStage` 2.19 kB, `SwitchStage` 2.36, `RouterStage` 2.48,
  `PrinterStage` 3.60, `UpsStage` 3.74, `PatchPanelStage` 3.79, `core-*.js` 5.14);
  three.js still isolated in the lazily-imported `ContactShadows-*.js`
  (928.14 kB); entry +1.67 kB.
- `upsVisuals`, `routerVisuals`, `accessPointVisuals` gained fields
  (`outletsLed`/`breakerLed`, `upstreamLed`) — purely additive interfaces, so
  no consumer can break. `switchVisuals` gained `trunkTone`/`trunkCarries`;
  `poeLed` tightened to also require `poeChecked`, which is behaviour the SVG
  previously applied itself (`SwitchSvg.tsx:12`), so no visual change.
- `patchPanelVisuals.switchPortLeds` tightening to `off` pre-`patchChecked` is
  a deliberate spoiler fix, verified consistent with the still-passing
  `patch-switch-port-disabled` status test (`equipmentExpansion.test.tsx:222-235`).
- `ups-output` gating order (`families/ups.ts:125-130`) is sound: `outletChecked`
  only suppresses the fault when output is also absent, so a healthy bank still
  reports "Outlets live" at t=0.
- No new dead code, unused export, or circular import; lint clean.
- `patchPanelStage.ts:12-13` still re-declares `PANEL_PORTS`/`SWITCH_PORTS`
  locally rather than importing the family constants — **pre-existing** (P2-2),
  not a 11.1 regression, but the 11.1 edit to that exact file was an opportunity
  to fix it.

---

## FINDINGS

Issues introduced by, or still directly relevant to, Phase 11.1.

### P1

**P1-1 — The printer family gates its inspector but not its visuals or its panel
status, so 11.1 introduced a new self-contradiction.**

- `src/features/environments/equipment/families/printer.ts:32, 34` —
  `tonerLed: flag(state, "tonerOk") ? "ok" : "warn"` and
  `jamLed: flag(state, "jamPresent") ? "crit" : "off"` are ungated.
- `src/features/environments/equipment/families/printer.ts:42` —
  `if (flag(state, "jamPresent")) return { tone: "crit", label: "Jam" };` in
  `status()`, ungated. `status()` is both the panel header **and** the
  `printer` component's `stateSummary`.
- `src/features/environments/equipment/svg/PrinterSvg.tsx:132, 134-137` — the
  output tray is stroked `C.crit` and the literal caption `PAPER JAM` is drawn
  from the raw `jam` local (`PrinterSvg.tsx:18`).
- Contrast `families/printer.ts:119-121` and `:126`, which 11.1 *did* gate
  (`"Alarm not read"` / `"Not inspected"`), and `:215, 219, 227`, which 11.1
  *did* gate in evidence.

Consequence at t=0 in `printer-paper-jam`: the panel header reads **"Jam"**, the
JAM lamp is red, the caption reads **"PAPER JAM"** — while the inspector for the
same component reads **"Alarm not read"** with the `Jam` evidence row absent.
Before 11.1 these agreed (uniformly pre-solved); 11.1 traded a uniform pre-solve
for an internal disagreement, which is a worse failure mode because it teaches
the learner that the inspector is unreliable.

The project's own stated policy — recorded in
`docs/PHASE_11_POST_IMPLEMENTATION_AUDIT.md:1493-1495` as *"physical and symptom
facts stay ungated; checked-class facts gate"* — supports a split that 11.1 did
not make. For `printer-low-toner` the ticket reports "the printer says toner is
out", so the amber lamp and "Low toner" header are genuinely symptom-level and
correctly left alone. For `printer-paper-jam` the ticket reports only "started
flashing" — the raw red JAM lamp is the "flashing", but the **`PAPER JAM`
caption and the "Jam" header verdict name the fault class**, which is diagnosis,
not symptom.

Fix direction: leave `printerVisuals.jamLed` and the `PAPER JAM` glyph as the
ticket-level symptom if desired, but gate the `status()` `jamPresent` branch on
`alarmChecked` and drop or gate the literal caption, so the header agrees with
the inspector it sits beside. Add a render-level test in the style of
`equipmentExpansion.test.tsx:279-307`.

**P1-2 — `accessPointVisuals.clientLed` still uses `clientAssociated` instead of
the engine-derived `clientLink`, so `ap-channel-congestion` still renders a
client fault that the state does not contain.**

- `src/features/environments/equipment/families/accessPoint.ts:27-31` —
  `clientLed: pathOk ? "ok" : clientAssociated ? "warn" : "off"`.
- `src/engine/conditions.ts:196-200` derives
  `clientLink = radioUp && pskOk && channelClear && clientAssociated`, and
  `clientLink` is still read by **no** family, SVG, or stage.
- In `ap-channel-congestion` (`clientAssociated: true, pskOk: true,
  clientIpOk: true, channelClear: false`) the client is associated, addressed and
  authenticated; the client lamp renders amber for an airtime fault, while
  `AccessPointSvg.tsx:127`'s laptop NIC lamp renders green in the same frame.
  Symmetrically `ap-wrong-passphrase` (`clientAssociated: false`) renders the
  client lamp fully off — indistinguishable from "no clients nearby" — so that
  scenario's actual fault has no visual expression.
- 11.1 edited this exact function to add `upstreamLed` and left `clientLed`
  untouched, so this is "still directly relevant" rather than newly introduced.

Fix direction: drive `clientLed` from `clientLink` behind the existing
`assocChecked` gate, and add a distinct "associated but not passing" tone so
congestion and rejected-handshake stop rendering identically. This is a
self-contained change to one function plus a renderer.

### P2

**P2-1 — `deriveEquipment` is still scoped by key presence, not by declared
family, so the coupling that made P0-4 dangerous is intact.**

`src/engine/conditions.ts:128, 149, 162, 193, 203, 217` each probe
`objOf(out.<ns>)` with no reference to `environment.deviceFamily`. The legacy
migration resolved the *observable* defect, not the mechanism: any future
non-equipment scenario that seeds a `printer` / `router` / `switch` / `ap` /
`ups` / `patch` key for its own purposes will silently receive
`powerOk`/`netLink`/`printReady` (etc.) injected. The widened all-61
seed-stability test now catches that *at test time* rather than in production,
which is a real mitigation, but the engine still has no way to know which
namespaces are equipment namespaces.
Fix direction: thread the family's `worldKey` (or `deviceFamily`) into
`deriveEquipment` so derivation is driven by the schema rather than by key
presence. Non-blocking — the test suite now guarantees the invariant.

**P2-2 — The switch trunk and AP upstream fixes are protected only at the
`Visuals` level; no render-level test pins either SVG or stage.**

`equipmentExpansion.test.tsx:238-337` covers router and UPS at the DOM level but
not switch or AP. The `Visuals` gate-pair tests (`logic.test.ts:543-557`) plus
typechecking protect the *values*, not the renderer's *choice of field*. A
future edit adding a raw `flag(state, "trunkCarries")` read to `SwitchStage`, or
`flag(state, "upstreamPoeCapable")` to `AccessPointSvg`, would pass all 278
tests while re-introducing exactly the P0-2 / P1-2 leak.
Fix direction: add two DOM-level tests mirroring `:239-277` — assert
`SwitchSvg`'s trunk badge `fill` is the muted tone pre-`trunkChecked` and `C.warn`
after in `switch-vlan-mismatch`, and `AccessPointSvg`'s `PoE SW` lamp `fill` is
`off` → `warn` in `ap-poe-port-disabled`.

**P2-3 — `docs/IT_EQUIPMENT_ARCHITECTURE.md` was not updated for the new
projection contract, so the drift identified in the previous audit has grown.**

The doc still publishes a `FamilyDef` with `chainSteps`, `visual(state)` and
`svg` fields that do not exist (`IT_EQUIPMENT_ARCHITECTURE.md:64-76`), still
claims "neither projection computes its own truth" (`:156-157`) — now *closer*
to true but still not exact, since both projections still read reveal flags
directly — and its reveal-flag table (`:125-132`) predates `upstreamLed`,
`trunkTone`, `breakerLed`, `outletsLed` and `activeRunIndex`. The
`SCENARIO_ENVIRONMENT_MATRIX.md` "gated" column is now accurate for printer
lines 39/41 and UPS 61-63, which is a genuine improvement, but the architecture
doc has no corresponding update.
Fix direction: fold the doc update into the already-deferred documentation sweep
rather than opening a new pass.

### P3

**P3-1 — `PatchPanelStage.tsx:12-13` still re-declares `PANEL_PORTS = 12` and
`SWITCH_PORTS = 8`** instead of importing `PATCH_PANEL_PORTS` /
`PATCH_SWITCH_PORTS` from `families/patchPanel.ts:11-12`, which
`PatchPanelSvg.tsx:2-5` does correctly. Pre-existing, but 11.1 edited this file
and added a new dependency on `v.activeRunIndex`; the constant duplication is
now the only remaining drift hazard in the patch family.

**P3-2 — `scenarios/index.ts:4737`** still contains the prose "rules out offline
and paper-jam states". It is descriptive text in an `evaluation.rationale`, not
a state key, so it is harmless — but it is the last textual trace of the retired
vocabulary and will read as stale to a future maintainer.

**P3-3 — `PatchPanelSvg.tsx:177-179`** highlights only `activePanelIndex` (the
patch lead's port) with the accent stroke. When the run lands on a different
port (`patch-crossconnect-mislabelled`), the run's actual landing port carries no
mark. The cable geometry now shows the mismatch, so this is an affordance gap
rather than a contradiction, but a second highlight for `activeRunIndex` would
make the two landings unambiguous at a glance.

---

## TEST TRUSTWORTHINESS

**278/278 meaningfully protects the fixes, with one named gap.**

Protective and non-vacuous:
- The three SVG render tests (`equipmentExpansion.test.tsx:238-337`) assert real
  DOM attributes in both the pre- and post-evidence state. A revert to raw
  `flag(state, …)` in `RouterSvg` or `UpsSvg` fails them.
- The five `Visuals` gate-pair tests (`logic.test.ts:528-587`) use real scenario
  seeds and assert the exact tone transition, so a re-loosened `*Visuals()` fails.
- The six inspector flag-flip tests (`:589-701`) drive the real engine and assert
  the observable inspector delta.
- The all-61 seed-stability test (`:138-145`) is a true invariant and has already
  earned its keep by surfacing the `pc-on-no-display` drift.
- The `printer-not-printing` triplet (`:703-749`) guards the migration against
  both regression directions (legacy key reappearing, derived keys drifting).

Gap, stated plainly: **switch trunk and AP upstream — two of the four P0/P1
projection fixes — have no render-level test.** For those, protection rests on
"the stage and SVG read `v.<field>` and nothing else", which typechecking
enforces for field names but not for the absence of an additional raw state read.
The previous audit's P1-5 finding stands unchanged in kind, though 11.1 reduced
its exposure substantially: the six families' visuals are now the single
authoritative projection, five of six are DOM-tested, and the two DOM-untested
families are the two whose leaks were the most blatant (unconditional green
trunk LEDs; an absent upstream switch).

No test in the suite is a tautology, and the 17 new tests each correspond to a
specific, named regression.

---

## REMAINING DEFERRED TECHNICAL DEBT

Only items from the previous audit's section 5 that remain live.

1. **`showInspector` deletion.** Unchanged — declared
   `schema/index.ts:277`, set `true` in all 61 scenarios, read nowhere. Still
   recommended for deletion, still correctly deferred to the next schema-touching
   phase.
2. **P2-4 conversation authoring.** Unchanged — 17 equipment scenarios with a
   `walkup`/`phone` channel still expose the Customer dock on a synthesized
   `defaultScript`. The one-line gate (require
   `scenario.conversation !== undefined`) was not taken.
3. **P2-10a content de-duplication.** Unchanged — the four
   "someone-was-in-the-room" cable scenarios and the two shared-budget
   scenarios remain cosmetically parallel.
4. **Documentation sweep (P2-9 / P2-10b / P3-9).** Still deferred and now
   carrying more: `ARCHITECTURE.md`, `SIMULATION_ARCHITECTURE.md`,
   `CONTENT_AUTHORING.md`, `SCENARIO_ENVIRONMENT_MATRIX.md`'s headerless table,
   and now `IT_EQUIPMENT_ARCHITECTURE.md`'s `FamilyDef` block and reveal-flag
   table (see P2-3). 11.1 correctly did not start this.
5. **P3-1 / P3-2 typed world schemas and `null`-means-unknown defaults.** Still
   deferred. Unchanged and still correct to defer.
6. **P3-6 bench/equipment 3D infrastructure merge.** Unchanged. Note that
   `PatchPanelStage` and `UpsStage` were both edited by 11.1 without
   consolidating the duplicated `Led` / `Interactive` / palette surface, which is
   consistent with the deferral.
7. **P3-10 entry-bundle content splitting.** Unchanged; entry grew 1.67 kB.
8. **P1-4 chain-strip re-linking on component filtering.** Not in 11.1's reported
   scope and not addressed. `EquipmentLab.tsx` still filters chain steps by
   `visible(s.component)` and indexes the filtered array for `ChainArrow`, so
   `printer-paper-jam` and `printer-low-toner` still render
   Power → Queue → Ready with the Network/Address hops removed. Worth noting
   that 11.1's printer edits touched the same family without addressing it.
9. **P2-1/P2-2 (`relatedAction` binding; port-count constants).** Not addressed.
   `hotspot.ts` still resolves one action via a substring test over
   `matchHints`, so `patch-switch-port-disabled` still offers
   "Tone the whole path from desk to switch" on the `switch-port` hotspot instead
   of "Enable the switch access port".

---

## FINAL STATUS

**PHASE 11.1 NEEDS TARGETED CORRECTION**

All four P0s are genuinely fixed and verified independently at the source level:
the patch-panel geometry now agrees across state, 2D, and 3D; the switch trunk
badge no longer asserts VLAN membership it has not read; the AP 3D stage has a
state-driven serving switch that distinguishes a disabled PoE port from an
unplugged drop; and the legacy printer scenario is on canonical vocabulary with
no surviving state dependency on the old one. The spoiler-gating leak table is
closed for five of six families with no raw-flag bypass remaining in router,
switch, UPS, access point, or patch panel, and all ten previously-inert reveal
flags are now consumed. The lazy split, dependency set, `ScenarioPage`, and
engine architecture are all intact, and 278/278 is backed by tests that assert
real DOM state rather than smoke conditions.

The correction required is small and well-localised. The printer family is the
one family whose visuals and panel status were left ungated while its inspector
was gated, which leaves `printer-paper-jam` asserting "Jam" in the header and
"PAPER JAM" on the canvas directly beside an inspector reading "Alarm not read" —
a contradiction Phase 11.1 introduced rather than inherited. And
`accessPointVisuals.clientLed` still bypasses the engine-derived `clientLink`, so
`ap-channel-congestion` still paints a client fault the state does not contain.
Two functions and one caption, plus two render-level tests to close the
switch/AP coverage gap, would move this to verified.

---

## FINAL CORRECTION (completed)

The two P1 issues from the independent verification were fixed at source and
locked in by three new render-level tests. The suite now stands at 281/281 with
typecheck, lint, and build all green.

**P1-1 — printer visual/inspector contradiction.**
`printer.status()` now falls through to the neutral "Not ready" verdict until
`alarmChecked` is set, so the lab header and the on-device LCD can no longer
name "Jam" before the panel alarm is read. In `PrinterSvg` the "PAPER JAM"
caption and the red output-tray stroke are gated on the same flag. The red jam
lamp itself stays ungated, because the flashing indicator is the physical
symptom the ticket reports ("started flashing"), not a diagnostic conclusion.
Toner behaviour is untouched: `printer-low-toner` reports the toner message in
its ticket, so its amber lamp and "Low toner" header remain symptom-level
facts. The inspector side ("Alarm not read" / "Jam present") was already gated
in the first pass and is unchanged.

**P1-2 — AP client lamp bypasses `clientLink`.**
`accessPointVisuals.clientLed` now consumes the engine-derived `clientLink`:
green only when the derived path passes; dark until `assocChecked` otherwise;
then warn when the engine says the client is linked or associated but not
passing; dark when no client is associated. `ap-channel-congestion`, which
previously painted amber at t=0 beside an inspector reading "Not checked", now
stays neutral until the association check and then reads warn;
`ap-wrong-passphrase` reads dark rather than inheriting congestion's verdict;
`ap-client-addressing` derives its warn from `clientLink` instead of the raw
association bit. The lamp names no root cause — the specific verdicts remain in
the gated status line and inspector rows — and no new state vocabulary was
introduced.

**New render tests** (`equipmentExpansion.test.tsx`, "final correction" block):

1. `printer-paper-jam`: before `check-panel` the LCD reads "Not ready", no
   "PAPER JAM" text exists, the tray stroke is neutral, and the inspector says
   "Alarm not read"; after the check the LCD reads "Jam", the caption and red
   tray stroke appear, and the inspector shows "Jam present" with the Jam
   evidence row.
2. `switch-vlan-mismatch`: the trunk badge prints masked "? ? ?" in muted fill
   until `check-trunk`, then prints the carried VLANs in warning fill.
3. `ap-poe-port-disabled`: the "PoE SW" lamp is neutral before `assocChecked`
   and turns warning after the drop inspection (seed `upstreamPoeCapable:false`).

**Validation.** typecheck ✓ · lint ✓ · test 281/281 ✓ · build ✓ (six lazy
`*Stage` chunks, entry 1,431.86 kB); 61 scenarios intact; zero legacy printer
vocabulary (`online`/`tonerLow`/`paperJam`) in family or SVG; `ScenarioPage`
untouched; no dependency changes; no browser/E2E.
