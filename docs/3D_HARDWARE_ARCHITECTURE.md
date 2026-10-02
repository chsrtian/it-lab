# 3D Hardware Architecture — Phase 9

**Status:** 9A (research/feasibility) complete → 9B (prototype) next
**Date:** 2026-09-25
**Supersedes nothing:** the SVG `HardwareLab.tsx` remains the permanent fallback and accessibility-equivalent surface.

---

## 1. Goals (Phase 9 mandate)

- Lazy-loaded React Three Fiber scene of an open desktop PC on a workbench, recognizable as real hardware (ATX board, socket, cooler+fan, DIMMs, GPU, PCIe, PSU grille/rocker, 24-pin, EPS, SATA, storage, FP header, power button, case fans, chassis, rear I/O, MB LEDs).
- The 3D scene is a **visual representation of simulation state** — every visible change derives from `run.world` (`bench.*`), never from local 3D-only state.
- Restrained virtual workbench: work surface, quiet lighting, contact shadows. No neon, bloom, holo, rainbow, cyberpunk.
- Environment-first UI: the scene is the dominant environment; inspection callouts are contextual, never permanent label spam.
- Fallback first: if WebGL is unavailable, motion reduction is requested, the chunk fails, or the device is underpowered → the SVG workbench renders instead.

## 2. Dependencies (license-audited, free/open-source only)

| Package | Version | License | Why |
|---------|---------|---------|-----|
| `three` | 0.186.1 | MIT | renderer core |
| `@react-three/fiber` | 9.8.1 | MIT | React reconciler (React 19 supported) |
| `@react-three/drei` | 2.2.21 | MIT | OrbitControls, ContactShadows, Html |
| `@types/three` | 0.186.0 | MIT (DefinitelyTyped) | TS types |

All are dev-time-free, no paid APIs, no telemetry. Installed **only** as dependencies of the lazy 3D chunk — they must never appear in the entry chunk (verified via build chunk report).

**Deliberately NOT used:**
- `@react-three/postprocessing` (bloom etc.) — mandate forbids glow/bloom look.
- drei `<Environment preset>` — presets fetch HDRI files from a CDN at runtime (violates local-only). Lighting is hand-built (ambient + 2 directional + optional fill), no network fetches.
- `@react-three/rapier` — no physics needed.
- Any third-party GLTF/model files — see §7.

## 3. Lazy loading & mount (implemented)

```
ScenarioPage → EnvironmentRenderer (category === "hardware")
  → <HardwareLabView>                  (small wrapper, entry chunk)
      ├ capability gate: supportsWebGL() + prefers-reducedMotion() + stored 2D/3D preference
      │  (resolveInitialView: no WebGL → 2D, stored wins, else reduced → 2D, else 3D)
      ├ React.lazy(() => import("./hardware3d/HardwareScene"))   ← three/fiber/drei land here only
      ├ <Suspense fallback="Loading 3D workbench…"> (inside the stage area)
      └ <SceneErrorBoundary onError → force 2D>     ← chunk/runtime failure → SVG
      └ passes stage/stageActions/selected/onSelect into <HardwareLab> (SVG chrome reused)
```

- The wrapper (`HardwareLabView`) and the shared chrome (`HardwareLab`: power chain, indicators,
  inspector dock, bench steps, legend) live in the entry chunk; `three`, `fiber`, `drei` and all
  scene code live in the lazy chunk (verified: entry bundle contains no `WebGLRenderer`).
- The 3D stage is slotted into `HardwareLab` via its `stage` prop, so chain/inspector/legend are
  shared with the SVG view — selection state is controlled (`selected`/`onSelect`) across both.
- Fallback nesting note: the stage cannot render a full `HardwareLab` inside itself, so the
  Suspense fallback is a text placeholder and the error boundary drops `stage` to `undefined`,
  which makes `HardwareLab` render the SVG chassis immediately.
- `prefers-reduced-motion` does not ban 3D outright — it disables continuous animation (fan spin,
  camera ease, cable seating ease jump instead) and defaults new users to 2D; the "3D" toggle
  remains available.
- WebGL test: offscreen canvas, `webgl2` → `webgl` → `experimental-webgl`; on failure the chunk
  is never fetched (2D always).

## 4. Camera

- Perspective, `fov ≈ 38`, initial preset `FULL_PC`.
- drei `OrbitControls`: `enableDamping`, `dampingFactor ≈ 0.08`, `enablePan` limited, `minDistance`/`maxDistance` clamp, `maxPolarAngle ≈ 88°` (never below work surface), target clamped to bench volume.
- Presets (animated ease, skipped under reduced motion → jump): `FRONT`, `MOTHERBOARD`, `POWER_SUPPLY`, `CABLES`, `FRONT_PANEL`, `FULL_PC`; plus `Reset`.
- Preset buttons are DOM (toolbar of the environment), not 3D text — keeps a11y and small-screen layout simple.

## 5. Scene structure

```
<Canvas dpr={[1,2]} frameloop="demand" gl={{ antialias, alpha }}>   {/* no shadow maps */}
  BenchSurface            work mat (dark anti-static), receives contact shadow
  Chassis                 open case: tray, rear panel w/ I/O cutout, drive bays, standoffs,
                          front panel (power button depress, FP header), side panel leaned aside
  MotherboardGroup        ATX plate (305×244 ratio) + rear I/O block + chipset heatsink
    SocketGroup           socket body + lever + latch
    CoolerGroup           tower heatsink (fin stack = instanced planes) + fan (spins when fansSpin)
    DimmGroup ×2          latched slots; module seats when ramSeated
    GpuGroup              PCB + dual fans + PCIe bracket; seats when gpuSeated
    PcieSlots, M2Slot     empty/expansion context
    OnboardLeds           POST/status LEDs driven by bench.posted / bench.beepCode
  PsuGroup                body, fan grille (instanced), rocker (rotates with bench.psuToggle),
                          rear mains inlet (glows per bench.powerSwitchAtWall)
  Cables                  24-pin + EPS (clip lights with bench.psuOutputOk), SATA loom —
                          tube-geometry curves with connector housings
  PowerStrip              wall strip + outlets + live LED (bench.powerSwitchAtWall)
  MainsCable              wall → PSU inlet; eases into place with bench.powerCableSeated
  StorageGroup            2.5" SSD + SATA data/power connectors
  CaseFans ×2             spin when bench.fansSpin
  FrontPanelGroup         power button (depress on power event), FP pin comb (bench.frontPanelConnector)
  Lighting                ambient 0.35 + key directional + cool fill; NO environment map fetch
  ContactShadows          drei, frames=1 re-render on state change (cheap)
  Selection/Hover         emissive/intensity lift + cursor, see §6
```

- Geometry is **original procedural** (box/cylinder/tube/extrude composed in TSX), built to believable proportions, low/mod poly. Shared geometries/materials via `useMemo` (R3F does not deduplicate declarative children).
- Instancing: cooler fins, PSU grille holes, rear I/O ports, DIMM/PCIe pin rows, case screws.
- No permanent 3D text labels in the scene; names appear only in hover tooltip / inspector.

## 6. Interaction model

| Event | Behavior |
|-------|----------|
| Hover part | highlight (emissive lift ≤ subtle), `cursor: pointer`, tooltip with part name (DOM overlay via drei `Html` or absolutely-positioned div — one tooltip, not per-part labels) |
| Click part | select → contextual inspector strip below/over environment: part name, state readouts bound to world, available contextual actions (engine `availableActions` filtered by part tag) |
| Click empty | deselect (`onPointerMissed`) |
| Keyboard/a11y | equivalent control list outside the canvas: every selectable part exists as a focusable button in the inspector's part list (accessible equivalent — 3D mouse is never the only path to evidence) |

- Pointer handlers call `e.stopPropagation()`; click-vs-drag distinguished by `event.delta` (orbit drag must not select).
- Hover/selection are React state (discrete); continuous motion (fan spin) is `useFrame` mutating refs, multiplied by `delta`, allocated outside the frame loop.

## 7. State bindings (single source of truth = engine world)

Read from `run.world.bench` (keys observed in `HardwareLab.tsx` / engine):

| World key | 3D visual |
|-----------|-----------|
| `psuToggle` | rocker switch angle (off/on) |
| `powerSwitchAtWall` | strip live LED + PSU inlet indicator (mains path) |
| `powerCableSeated` | mains cable eases into/out of the PSU inlet (loose = pulled away) |
| `psuOutputOk` | 24-pin/EPS connector clip lights green (readiness reaches the board) |
| `fansSpin` | CPU cooler, case and GPU fans rotate (reduced motion: stopped) |
| `ledsOn` | board status LEDs + front-panel power LED emissive |
| `posted` | POST state on board LEDs (lit pattern) + inspector "Healthy after POST" |
| `ramSeated` / `gpuSeated` | module/GPU seat height eased between raised and seated |
| `frontPanelConnector` | FP pin comb + cable clip: green seated / red loose (mirrors SVG) |
| `beepCode` | evidence-only (inspector text; no fake visual — mirrors SVG's beep text as DOM evidence) |
| `monitorPower` / `videoCableToGpu` / `displayOk` | evidence-only (no monitor modeled in either renderer) |
| `lastPowerEvent` | evidence-only (text descriptor — the button-depress trigger from the original plan is **not** implemented; documented limitation) |

Animation of discrete changes (cable seat ease, rocker flip) uses short eased lerps in `useFrame`;
under reduced motion all changes are instant jumps.

## 8. Asset licensing

- **All geometry is original** — no third-party GLTF/GLB is downloaded or embedded. Research decision (see `ATTRIBUTION.md`):
  - `brickshow/pc-anatomy` (MIT): code *patterns* reference only; its `public/models/*.glb` provenance is not independently documented → **not used**.
  - `ky1rie1/SiliconWiki` (procedural PC models, excellent techniques): **no LICENSE file → excluded** from copying; inspiration only (procedural geometry approach, render budget concept, documented publicly).
  - Any future model import requires a clear license recorded here and in `ATTRIBUTION.md` first.
- Skills consulted: `agents-inc/skills` `web-3d-react-three-fiber` (MIT) — critical requirements applied (refs-not-state in frame loop, delta-scaled motion, Suspense above loaders, shared GPU resources, `stopPropagation`, clamped dpr).

## 9. Performance budget (measured at 9B)

- Chunk: `three` + `fiber` + `drei` land in a **separate lazy chunk**; entry chunk carries no 3D deps
  (verified: entry bundle has no `WebGLRenderer`). Measured: entry `index-*.js` **948.14 kB
  (263.04 kB gzip)** vs 943.83 kB before 9B; lazy `HardwareScene-*.js` **954.51 kB
  (251.44 kB gzip)**. Revised target: **≤ 1 MB minified / ≤ 300 kB gzip** for the 3D chunk
  (the earlier <700 kB raw target was unachievable — three.js core alone floors it; drei is
  tree-shaken to `OrbitControls` + `ContactShadows` only).
- `dpr={[1, 2]}`; 3 lights (ambient + key + fill), no shadow maps (baked `ContactShadows`
  with `frames={1}`), no post-processing.
- `frameloop="demand"` everywhere: world changes → root `useFrame` invalidation via
  `InvalidateOnRender`; animations (fan spin, easing) self-chain `invalidate()` per frame
  while active, then stop. Reduced motion: no continuous invalidation at all.
- Draw calls: original procedural geometry, shared materials, instancing for fin/pin/screw
  repeats; low/mod poly per part.

## 10. Fallback matrix (SVG wins whenever…)

| Condition | Result |
|-----------|--------|
| No WebGL context | SVG, 3D chunk never fetched |
| Chunk load failure / runtime error | SVG via error boundary |
| `prefers-reduced-motion` | 3D static (no continuous anim) or SVG (configurable); SVG default if user picks 2D |
| Low-power heuristic (deviceMemory, tiny screen) | **deferred post-9K**; no WebGL covers the hard-fail case today |
| User toggles "2D view" | SVG persists (preference stored in `localStorage`, key `itlab.hardwareView`) |
| `shell === "none"` scenarios unaffected | hardware-bench scenarios always have a scene |

The SVG `HardwareLab.tsx` keeps all `bench.*` bindings and is exercised by the same world state — both renderers are projections of one state, so neither is "decorative".

## 11. Verification (no browser E2E)

1. `npx tsc -p tsconfig.app.json --noEmit`
2. `npm run lint`
3. `npm run test` — 69 engine tests untouched + 7 new (`hardware3d/logic.test.ts`:
   `resolveInitialView` gate matrix, camera preset coverage, `buildBenchHotspot` world-state parity)
4. `npm run build` — confirm 3D code in separate chunk, entry chunk not regressed
   (9B result: entry clean of three; `HardwareScene` lazy chunk emitted)
5. Manual user pass (user-driven screenshots): flagship `pc-no-power`
