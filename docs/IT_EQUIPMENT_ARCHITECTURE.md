# IT Equipment Lab Architecture — Phase 11

How the equipment lab represents printers, routers, switches, access points,
UPS units, and patch panels as one declarative device-family architecture:
content model, engine causality, spoiler-gating, shared chrome, and the 2D/3D
projections.

## Scope and constraints (Phase 11 mandate)

- Content + device model + simulation only. **`ScenarioPage` untouched.**
- No UI redesign: equipment reuses the existing workspace, LabSection chrome,
  InspectDock, chain strip, and Checks strip.
- **No scenario-id branching in renderers.** One declarative chain:
  `world → environment.components → focusTarget → shared world-derived state →
  3D + 2D projections`. Every decision comes from the scenario schema or the
  world, never from an id check.
- No ghost components: every 2D hotspot and 3D part id must correspond to a
  listed `environment.components` entry (guarded by tests).
- Equipment code adds no `three` to the initial bundle; the 2D SVG is the full
  fallback and the keyboard path.

## Inventory

100 scenarios total = 69 non-equipment (30 baseline/Phase 10 + 39 Phase 12–13) + **31 equipment** (kind
`equipment-bench`, category `hardware`, ticket ids `HD-1028`–`HD-1058`):

| Family | `environment.deviceFamily` | Scenarios | Scenario ids |
|--------|---------------------------|-----------|--------------|
| Printer | `printer` | 5 | printer-queue-paused, printer-paper-jam, printer-network-unreachable, printer-low-toner, printer-ip-conflict |
| Router | `router` | 6 | router-wan-misconfigured, router-dhcp-exhausted, router-cable-loose-wan, router-nat-disabled, router-upstream-outage, router-lan-link-down |
| Switch | `switch` | 5 | switch-port-shutdown, switch-vlan-mismatch, switch-uplink-down, switch-port-faulty, switch-poe-overload |
| Access point | `access-point` | 6 | ap-poe-port-disabled, ap-drop-unplugged, ap-wrong-passphrase, ap-channel-congestion, ap-radio-disabled, ap-client-addressing |
| UPS | `ups` | 5 | ups-battery-expired, ups-overload, ups-outlet-group-dead, ups-input-unplugged, ups-breaker-tripped |
| Patch panel | `patch-panel` | 4 | patch-keystone-loose, patch-crossconnect-mislabelled, patch-switch-port-disabled, patch-lead-not-seated |

Types: FOUNDATIONAL_DIAGNOSIS 8, CONFIGURATION_ERROR 10, COMPONENT_FAILURE 6,
RESOURCE_EXHAUSTION 3, DEPENDENCY_FAILURE 2, EVIDENCE_DISCRIMINATION 2.
Difficulty: foundational 8, beginner 5, intermediate 17, advanced 1.
Every scenario has `availableTools: ["device-panel", "inspection"]` (patch adds
`"cable-tracer"`), `shell: "none"`, and no conversation script.

## Content model

Equipment scenarios add three schema fields (Phase 11 schema edit):

- `environment.kind: "equipment-bench"`
- `environment.deviceFamily: "printer" | "router" | "switch" | "access-point" | "ups" | "patch-panel"`
- `environment.components: string[]` — component ids rendered as hotspots/parts
  (subsets are allowed, e.g. the queue-only printer scenario lists 3 of 4
  components; the renderer must not draw what is not listed)
- `environment.focusTarget: { componentId, cameraPreset }` — seeds the shared
  inspector + the 3D camera preset

Content lives in `src/content/scenarios/equipment/{printer,router,switch,accessPoint,ups,patch}.ts`,
wired through `src/content/scenarios/index.ts`. KB articles added:
`vlan-basics`, `poe-power-basics`, `ups-runtime-basics`,
`network-cabling-basics` (16 articles total).

## Device-family model

Each family is one `FamilyDef` (`src/features/environments/equipment/types.ts`),
registered in `src/features/environments/equipment/registry.ts`:

```ts
interface FamilyDef {
  id: DeviceFamilyId;
  worldKey: string;              // "printer" | "router" | "switch" | "ap" | "ups" | "patch"
  label: string;
  components: ComponentMeta[];   // id, label, identity, description, evidence[]
  chainSteps: ChainStepView[];
  status(state): FamilyStatus;
  visual(state): …;              // family projection inputs (LED/link/tone values)
  cameraPresets: CameraView[];
  svg: ComponentType<SvgProps>;  // 2D projection
}
```

Evidence entries are three kinds (all support optional `when` gating):
`string` path, `{ path, when }`, and computed `{ label, value(state),
tone(state), when? }` — computed rows exist so 2D, 3D, and the inspector can
never disagree on a derived value.

**Polarity rule:** raw boolean evidence rows render `true → "ok"` (green).
Fault flags (`queuePaused`, `jamPresent`) are therefore expressed as computed
rows with explicit polarity ("Paused"/"Flowing", "Present"/"Clear").

## World model and engine causality

`deriveWorld()` (engine, called after every `applyAction`/`recordCommand`)
recomputes `deriveEquipment()` in `src/engine/conditions.ts`:

| Family | Derived keys (derived, never content-seeded) |
|--------|----------------------------------------------|
| printer | `powerOk`, `netLink`, `printReady` |
| router | `powerOk`, `wanLink`, `wanReachable`, `lanLink`, `dhcpServing`, `clientPath` |
| switch | `powerOk`, `uplinkLink`, `ports[i].link`, `ports[i].path`, `poeBudgetOk` |
| access point | `poePowered`, `radioUp`, `clientLink`, `pathOk` |
| UPS | `onUtility`, `outputPresent`, `loadOk` (`loadPct <= 80`) |
| patch panel | `panelMatch`, `pathOk` |

`createRun()` does **not** call `deriveWorld()`, so equipment seeds in
`initialWorld` must be consistent with the derivations — `deriveWorld(initial)`
is a no-op for every equipment scenario (asserted by test).

Switch port link rule (Phase 11 engine addition):

```
port.link = powerOk && cableSeated && enabled !== false && faulty !== true
            && (port.poe !== true || port.poePowered !== false)
```

`poePowered` is a content input that defaults to powered when absent, so PoE
scenarios can seed an unpowered port without changing healthy scenarios.

## Spoiler-gating policy

Split every fact into:

- **Always visible:** config/hidden facts stay hidden, but LEDs, effect words,
  and anything the ticket states are visible at t0. Benign truths (e.g. a
  healthy upstream) may stay hidden when no action reveals them.
- **Gated:** configuration and diagnostic truths reveal only after a check
  records its flag (`appliesWhen` + evidence `when`).

| Family | Reveal flags |
|--------|--------------|
| printer | `queueChecked`, `alarmChecked`, `pathInspected`, `neighborChecked`, `tonerChecked`, `addressChecked` |
| router | `wanChecked`, `dhcpChecked`, `natChecked`, `probeDone`, `lanChecked` |
| switch | `portChecked`, `uplinkChecked`, `trunkChecked`, `poeChecked` |
| access point | `assocChecked` |
| UPS | `batteryChecked`, `loadChecked`, `outletChecked`, `inputChecked`, `breakerChecked` |
| patch panel | `jackTraced`, `horizontalTraced`, `patchChecked` |

`buildEquipmentHotspot` (`equipment/hotspot.ts`) gates both plain-path and
computed entries with the same `when` semantics.

## Rendering chain

```
EnvironmentRenderer
  kind === "equipment-bench" || deviceFamily   (priority 1 — precedes the
                                                 hardware-bench catch)
        ↓ key={scenario.id}
EquipmentLabView  (capability gate: WebGL + reduced-motion → 2D only)
  ├─ ViewToggle 2D/3D (hidden when capability gate fails)
  ├─ 3D: STAGES[family] — six React.lazy stage chunks, boundary-wrapped,
  │      focus-seeded selection/preset, camera toolbar + Reset
  └─ EquipmentLab (shared chrome, props: scenario, run, onInspect,
         stage/stageActions/selected/onSelect injection)
        ├─ ticket, hypotheses, chain strip (data-chain-step), status
        ├─ 2D family SVG — hotspot ids == component ids, filtered by
        │      environment.components
        └─ InspectDock ("Inspecting <label>") — evidence rows, gated facts
```

Shared world-derived state (family `visual(state)` + `status(state)`) feeds
both projections; neither projection computes its own truth.

## 2D layer

- `equipment/svg/palette.ts` + `shared.tsx` primitives; one SVG component per
  family (`PrinterSvg`, `RouterSvg`, `SwitchSvg`, `AccessPointSvg`, `UpsSvg`,
  `PatchPanelSvg`).
- Hotspots are `g.hotspot` with `role="button"` and an `aria-label`
  (`svgLabel`); ids equal the family component ids.
- No new CSS: reuses `.hw3d-stage`, `.hw3d-toolbar`, `.hw3d-tip`,
  `.hw3d-fallback`, `.hotspot` from `src/index.css`.

## 3D layer

- `equipment/3d/stageTypes.ts` — `EquipmentStageProps` (three-free, importable
  by the view).
- `equipment/3d/core.tsx` — `StageFrame` (Canvas `frameloop="demand"`, reduced
  motion, `ContactShadows` keyed per family), `Controls` (preset tween with
  reduced-motion snap, OrbitControls distance clamp), `Cable` (unseated =
  pulled-back gap), `Led`, `Interactive`, `Lights`, `InteractCtx`/`MotionCtx`.
- Six stages in `equipment/3d/stages/` each export `PART_IDS` (must equal the
  family component ids) and gate every visual group with the same
  `environment.components` visibility used by the 2D SVG.
- Camera presets scale near the origin (0.4–0.9 m framing) and are shared with
  the family `cameraPresets` used by `focusTarget`.

## Accessibility

- 3D is never the only path: legend chips + 2D SVG hotspots provide every
  inspection; ViewToggle is absent when the capability gate fails.
- Status is color + icon + text; chain steps carry `data-chain-step`.
- `prefers-reduced-motion`: instant camera jumps, capability gate prefers 2D.

## Tests and guards

| File | Asserts |
|------|---------|
| `src/features/environments/equipment/logic.test.ts` (22) | registry↔schema sync; 31/100 catalog + per-family counts; focus/component validity; seed stability (`deriveWorld` no-op); derivation rules incl. switch PoE/VLAN/faulty/admin-down; gating contracts; switch-PoE fix progression; hotspot smoke over every scenario × component |
| `src/features/environments/equipmentExpansion.test.tsx` (13) | routing (equipment before hardware, hardware non-regression); 2D visibility counts; 3D `PART_IDS` parity; capability gate; focus inspector; hotspot/legend selection; chain/status gating |
| `src/engine/simulation.test.ts` | count guard = **100** |
| `src/engine/contentQuality.test.ts` | all 100 satisfy hints/evaluation/debrief/trap invariants |
| `src/content/scenario.test.ts` | schema, knowledgeLinks, curriculum references |

## Measured build (Phase 11 gates)

- `npm run typecheck` → 0 errors; `npm run lint` → 0 errors / 0 warnings;
  `npm test` → **261 passed (20 files)**; `npm run build` → success.
- Entry `index-*.js` **1430.11 kB (375.61 kB gzip)** — grows with content (31
  scenarios + families + 2D SVGs); verified contains **no `WebGLRenderer` /
  PerspectiveCamera** (three.js stays out of entry, per
  `docs/3D_HARDWARE_ARCHITECTURE.md`).
- Equipment 3D is split into six lazy stage chunks
  (`PrinterStage` 3.60 kB, `RouterStage` 2.44 kB, `SwitchStage` 2.41 kB,
  `AccessPointStage` 1.80 kB, `UpsStage` 3.57 kB, `PatchPanelStage` 3.71 kB —
  0.71–1.09 kB gzip each) + shared `core-*.js` 5.14 kB (2.16 kB gzip); the
  three/drei vendor chunk is shared with the Phase 9 workbench
  (`ContactShadows-*.js` 928.14 kB / 246.01 kB gzip — within the ≤1 MB / ≤300 kB
  gzip budget; `HardwareScene-*.js` shrank to 27.67 kB).

## File map

```
src/content/scenarios/equipment/{printer,router,switch,accessPoint,ups,patch}.ts
src/features/environments/{EquipmentLab.tsx, EquipmentLabView.tsx}
src/features/environments/equipment/{types,registry,hotspot,logic.test}.ts
src/features/environments/equipment/families/{printer,router,switch,accessPoint,ups,patchPanel}.ts
src/features/environments/equipment/svg/{palette,shared,PrinterSvg,RouterSvg,SwitchSvg,AccessPointSvg,UpsSvg,PatchPanelSvg}.tsx
src/features/environments/equipment/3d/{stageTypes.ts,core.tsx,stages/*.tsx}
src/engine/conditions.ts   (deriveEquipment, switch PoE link rule)
docs/{SCENARIO_CATALOG.md, SCENARIO_ENVIRONMENT_MATRIX.md, ENVIRONMENT_ARCHITECTURE.md, DOMAIN_GRAMMAR.md}
```

Related: `docs/3D_HARDWARE_ARCHITECTURE.md` (budget/gate precedent),
`docs/DATABASE_LAB_ARCHITECTURE.md` (gated-evidence precedent).
