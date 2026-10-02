# Environment Architecture

How domain-native simulation environments represent the deterministic world state.

## Principles

1. **Environment is the primary learning interface** — not panels of metrics.
2. **Visual state derives from `run.world` only** — never a second simulation.
3. **Terminal is a dock, one tool** — mounted in the scenario tool dock, opens only
   on request (`hideTrigger` when dock-mounted); shown only when `shell !== "none"`
   and not explicitly hidden (e.g. `pc-no-power` has `shell: "none"` → no button).
4. **World Inspector is developer-only** — behind Diagnostics toggle; learners never see raw JSON.
5. **Engine is preserved** — environments call `onInspect(actionId)` → existing `applyAction` / `recordCommand` pipeline.
6. **Workspace is simulation-first (Phase 9E)** — ScenarioPage = compact
   `sim-topbar` (objective/status/verify/hint) → dominant `sim-stage`
   (≥60% of attention, environment fills it) → `sim-dock` with contextual drawers
   (open only on request, one at a time). No rails, no permanent side columns;
   score stays folded in Disclosure (Journal drawer).
7. **Grammar-bound environments (Phase 9H)** — every lab follows
   `docs/DOMAIN_GRAMMAR.md`: shared product rules (R1–R10), domain-specific
   stage shapes, evidence tier discipline, Checks-only in-lab tools, and the
   `docs/UI_ANTI_SLOP_RULES.md` checklist before any UI change ships.

## Environment interface

All labs receive the same props (via `EnvironmentRenderer`):

```ts
interface LabProps {
  scenario: Scenario;
  run: RunState;                 // world + appliedActions + actionLog
  onInspect: (actionId: string) => void;  // → ScenarioPage.apply → applyAction
  onOpenKb?: (articleId: string) => void;
}
```

Conversation is no longer stacked under the primary environment. `hasCustomerConversation()` (`features/environments/hasCustomerConversation.ts`) gates a `customer` dock tool in ScenarioPage, which mounts SupportLab inside the tool drawer (excluded for `support`/`mixed` categories, where SupportLab remains the environment itself).

## World-state → visual-state relationship

| Domain | World keys | Visual system |
|--------|------------|---------------|
| Network | `hosts[]`, `network.faults`, `dnsZones`, `diagnostics` | Stage-first ops map (Phase 9F): topology fills the lab surface; equipment-silhouette nodes; **evidence-driven health** (`netState.ts` reads only probe flags + locally observable facts — raw faults never shown); edge marks `?/✓/!/✗`; probe chain strip; contextual `aside.net-inspector` only while selected; route highlight + dimming |
| Hardware | `bench.*` | 3D ATX workbench (lazy R3F chunk; capability-gated) with SVG open-chassis fallback (ATX plate, socket/cooler fins, latched DIMMs, GPU+bracket, PSU grille/rocker, EPS/24-pin runs, FP header, case fans); power chain wall→PSU→MB→FP→POST; contextual inspector overlay on selection |
| Equipment | `printer.*`, `router.*`, `switch.*`, `ap.*`, `ups.*`, `patch.*` | EquipmentLab (Phase 11): shared chrome + per-family 2D SVG (hotspot ids == component ids) + lazy capability-gated 3D stage (`EquipmentLabView`); engine causality via `deriveEquipment()`; spoiler-gated evidence rows in the shared InspectDock; legend chips = keyboard path |
| Database | `db.*`, `services`, `network.faults`, `logs` | Stage-first causal **rack ladder** (Phase 9G): app → pool → TCP connection channel → host ⊃ service → port → database → storage; **evidence-driven layer states** (`dbState.ts` — service/port/database stay `UNTESTED` until checks record evidence; positive state visible, failures gated); systemd unit block + journal overlay on request; contextual `aside.db-inspector` only while selected; no status-card grid |
| Windows | `boot`, `logs`, `services`, `disks` | MMC-style console (Phase 9H): conditional tabs (only when the world key exists — Event Viewer reads `logs`, Services rows selectable → contextual CTA, Storage renders `disks` with % thresholds); Checks strip = `isDiagnostic`; no ungated action rail; values via `formatValue` |
| Linux | `fs`, `users`, `services`, `logs`, `perms` | Filesystem-first views (Phase 9H): conditional views (Filesystem tree with `ls -l` columns, Processes, Services, Packages — only when data exists); file selection → detail block + contextual CTA; Checks strip = `isDiagnostic`; journal/process truth via terminal; values via `formatValue` |
| Security | `mail`, `identity` | SOC evidence board (Phase 9H): Checks (`isDiagnostic`) + gated fact rows (`mail.analyzed` → sender/link; `identity.failedAttempts`) + applied-action findings (`evidenceGain ?? feedback`); evidence section renders only when non-empty; no JSON, no catch-all world iteration |
| Support | `printer`, `identity`, conversation | Ticket + customer chat + device/account state strip |

`deriveWorld()` continues to recompute hardware bench causality and equipment causality (`deriveEquipment()`, Phase 11) after every patch. Non-hardware environments read world keys directly; condition evaluation remains engine-side.

## Component interaction model

Conceptual primitives (implemented per-lab or as shared UI):

- **Component** — clickable/hoverable entity (PSU, gateway node, service row)
- **Connection** — visual link (cable, edge, chain arrow) colored by health
- **Control** — learner-actionable affordance (PSU switch, start service) → `onInspect`
- **Indicator** — passive state light/badge (LED, POST, port listen)
- **Evidence** — key/value observation surfaced after inspect
- **Fault** — explicit broken marker (icon + label + color)

Hotspot pattern (from pc-anatomy research): click component → contextual inspection panel (`.hw-inspector`, bottom-right of the stage, only while a part is selected; legend chips are the keyboard-equivalent selection path) shows identity, state summary, evidence rows, related action. The network lab mirrors this with `.net-inspector` (device/link inspector with status, facts, path hops, evidence, available actions) and `.net-chips` quick-select for keyboard parity. The database lab mirrors it with `.db-inspector` (layer status line, systemd unit block for the service layer, facts, evidence rows, available actions) — its rows are native `<button>` elements, so the ladder itself is the keyboard selection path. Selection-light domains (Phase 9H): Windows/Linux select a row/path → inline detail + contextual `btn-secondary` (available `isFix`/`isDiagnostic` only); Security has no object selection — its two-column board is the inspection surface. Grammar binding all of these: `docs/DOMAIN_GRAMMAR.md`.

## Routing (`EnvironmentRenderer`)

Priority (updated Phase 11):

1. `kind === "equipment-bench"` or `environment.deviceFamily` set → EquipmentLabView (must precede the hardware-bench catch, because equipment scenarios are `category: "hardware"`)
2. `category === "hardware"` or `kind === "hardware-bench"` → HardwareLab
3. `category === "networking"` → NetworkLab (stage-first; `key={scenario.id}` resets selection per scenario)
4. `category === "database"` → DatabaseLab (stage-first rack ladder, Phase 9G; `key={scenario.id}` resets selection per scenario)
5. `category === "windows"` or `kind === "windows-panel"` → WindowsLab
6. `category === "linux"` or `kind === "linux-terminal"` → LinuxLab
7. `category === "sysadmin"` → WindowsLab if `shell === "windows"` else LinuxLab
8. `category === "security"` → SecurityLab
9. `category === "support"` or `kind === "mixed"` → domain visual (printer/identity strip) + SupportLab
10. Fallback → SupportLab

Customer conversation is provided via the ScenarioPage `customer` dock drawer (see above) instead of `withSupport()` stacking.

## Lazy loading strategy

- NetworkTopology: already lazy (`React.lazy`) — keep. MiniMap removed (P0 black-rectangle fix).
- DatabaseLab / future heavy views: lazy if >~30KB.
- HardwareScene (R3F): lazy + capability-gated (Phase 9) — WebGL/reduced-motion
  gate falls back to SVG; chunk `HardwareScene-*.js` ≤1 MB min / ≤300 kB gzip.
- Equipment 3D stages (Phase 11): six per-family `React.lazy` chunks
  (`PrinterStage-*`, `RouterStage-*`, …) imported only by `EquipmentLabView`;
  no equipment stage code and no `three` in the initial bundle; the capability
  gate mounts the 2D SVG when WebGL/reduced-motion is unavailable.
- Main bundle: no `three` in entry; measure after each phase.

## Accessibility strategy

- Status: color + icon + text always (StatusBadge / StatusDot).
- Hotspots: real `<button>` or focusable `<g role="button">` with aria-label; keyboard order = visual order. 3D selection never mouse-only: legend chips + 2D SVG keyboard path provide every inspection.
- Focus rings global (`:focus-visible`).
- `prefers-reduced-motion`: disable cable/pulse animations; instant camera preset jumps; capability gate prefers 2D (2D remains the full fallback).
- Topology legend for HEALTHY/DEGRADED/FAILED/UNKNOWN.
- Touch targets: mobile tiers — `.sim-btn`/`.dock-btn` 40px, `.lab-tab`/`.lab-row` 36px, `.chip` 32px (`@media max-width:639px`); desktop toolbars use 30px density. Tab bars use `gap-1.5`; tool strips are `role="status" aria-label="Diagnostic checks"` (parity with probes/checks strips).

## 2D/3D decision

**Phase 8: interactive 2D SVG/CSS only.** **Phase 9: 3D hardware workbench added
(lazy, capability-gated) with the SVG bench as mandatory fallback** — see
`docs/3D_HARDWARE_ARCHITECTURE.md` for the binding budget and decision log.
**Phase 11: same contract for the equipment lab** — six lazy family stages
behind the same capability gate (`docs/IT_EQUIPMENT_ARCHITECTURE.md`); the 2D
family SVG is the full fallback and the keyboard path.

Phase 8 rationale (kept for history): pc-anatomy (MIT) uses Three.js/R3F for
education; SVG gives crisp hotspots, keyboard access, reduced-motion, zero asset
licensing risk. Phase 9 kept every SVG guarantee and added depth only where the
scenario benefits (spatial part recognition inside the case).

## Reusable primitives (src/components/ui + src/features/env/)

| Primitive | File | Role |
|-----------|------|------|
| Panel | `components/ui/Panel.tsx` | Surface + header |
| StatusBadge / StatusDot | `components/ui/StatusBadge.tsx` | Non-color status |
| Disclosure | `components/ui/Panel.tsx` | Progressive disclosure |
| IncidentBanner | `components/IncidentBanner.tsx` | Ticket context |
| DevDiagnostics | `features/scenario/DevDiagnostics.tsx` | Debug drawer |
| LabSection | `features/env/LabSection.tsx` | Environment chrome (Phase 8A) |
| Hotspot / InspectDock | `features/env/Hotspot.tsx` | Component click → inspect panel |
| ChainStep / ChainArrow | `features/env/Chain.tsx` | Causal path visualization |
| Indicator | `features/env/Indicator.tsx` | LED/port/status light |
| formatValue | `features/env/formatValue.ts` | World values → readable `key: value` lines (Phase 9H; never `JSON.stringify` in learner UI) |
