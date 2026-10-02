# UI Design Review — Foundation Reconstruction (P0)

**Date:** 2026-09-24  
**Gate:** Visual/product-quality review (FAILED → redesign)  
**Scope:** ScenarioPage architecture, terminal, network topology obstruction, hardware physical environment  
**Mode:** Product/workspace (not marketing, not dashboard)

---

## 1. Visual problems (evidence from source)

### 1.1 ScenarioPage — card-grid architecture

| Evidence | Location | Issue |
|----------|----------|-------|
| `lab-grid` = equal 3-column card stack (280px \| 1fr \| 280px) | `index.css:274–291`, `ScenarioPage.tsx:402–645` | Uniform card columns; environment is not visually dominant |
| Left aside: Hypotheses Panel + Actions Panel + Hints Disclosure + KB Disclosure | `ScenarioPage.tsx:405–504` | Four stacked bordered containers; tools buried in chrome |
| Center: EnvironmentRenderer + LearningLoopPanel (panel) + Terminal (panel) | `ScenarioPage.tsx:508–537` | Three equal-feeling panels; learning loop competes with environment |
| Right aside: Session log Panel + Score Disclosure + Concepts Panel + Diagnostics | `ScenarioPage.tsx:541–643` | Score/diagnostics/readout as peer panels — violates hierarchy (score should be tertiary) |
| Pre-start: full `panel` header with chips + objectives + buttons | `ScenarioPage.tsx:303–334` | Generic onboarding card |

**Hierarchy violation vs. required priority**  
Environment should dominate; score and raw diagnostics must not sit as first-class peer panels.

### 1.2 Terminal — always-open black slab

| Evidence | Location | Issue |
|----------|----------|-------|
| Host always `min-h-[140px]`, expand only toggles to 420px | `SimTerminal.tsx:249–257` | No true collapsed state; default is open |
| Parent always renders `<section className="panel">` when `showTerminal` | `ScenarioPage.tsx:523–537` | Terminal is a permanent block in the center column |
| Header: “Simulated terminal” + status dot + 3 icon buttons | `SimTerminal.tsx:210–248` | Chrome above empty/content area even when idle |

**Requirement:** collapsed default with trigger `Terminal · Linux [open]`; open ≈180–280px; no giant empty black rectangle; no terminal at all when `shell === "none"` (already gated at `ScenarioPage.tsx:290–292`).

### 1.3 Network topology — opaque black rectangle

| Evidence | Location | Issue |
|----------|----------|-------|
| Viewport wrapper hard-coded `background: "#0b1220"` + fixed `h-64` | `NetworkTopology.tsx:358` | Large near-black slab; fixed height vs. content |
| `MiniMap` with `maskColor="rgba(11,18,32,0.7)"` | `NetworkTopology.tsx:377–388` | Classic cause of an opaque dark rectangle over the map in constrained panels (mask + minimap surface) |
| Outer `section.panel overflow-hidden` nested inside NetworkLab `Panel` + padded body | `NetworkTopology.tsx:344`, `NetworkLab.tsx:87–154` | Double chrome; React Flow inside padded card can mis-size |
| Nodes are generic rounded translucent boxes | `NetworkTopology.tsx:65–86` | Not equipment silhouettes; feels like flowchart-in-a-box |

**Root cause (code inspection, not guess):** fixed `#0b1220` viewport + MiniMap mask overlay inside a nested panel = large opaque black/dark rectangle covering the topology area. Not a browser E2E claim — structural DOM/CSS issue.

### 1.4 HardwareLab — schematic boxes, not a physical PC

| Evidence | Location | Issue |
|----------|----------|-------|
| MB rect `x=210 y=40 w=180 h=200`, CPU socket rect, DIMM rects, GPU rect | `HardwareLab.tsx` MotherboardGroup | Abstract `<rect>` + labels; not recognizable ATX layout |
| Chassis as flat SVG frame + power chain | ChassisSvg / post-PSU SVG | Reads as block diagram, not open case on workbench |
| CPU = square + fan circle; RAM = bars; GPU = bar | MotherboardGroup | No socket latch, DIMM latches, heatsink fins, PCIe bracket, PSU body, cable textures |

**Requirement:** open desktop PC on workbench with case, motherboard, CPU/socket/cooler, RAM, GPU, PSU (fan/switch), 24-pin, CPU EPS, SATA, front-panel header, case fans, MB LEDs, expansion slots, rear I/O — physical proportions; state-driven LEDs/fans/POST.

### 1.5 Global AI-slop patterns present

- Cards-everything: `.panel` / `.disclosure` as default container for every region (`index.css:96–271`)
- Equal three-column symmetry with equal gutters
- Uppercase tracking-wider mini-labels on every subsection (panel headers, score, concepts)
- Status chips in rows without strong spatial context
- Rounded-lg (8px) uniform radii — soft SaaS look, not technical workbench
- Cyan/sky accent used liberally on links, borders, selection — neon-adjacent density
- Learning loop as another full panel card under the environment

---

## 2. Skills used (design review gate)

| Skill | Source | License | Why selected |
|-------|--------|---------|--------------|
| **ui-ux-pro-max** | local `.opencode/skills/` | local skill | Design-system search, UX/anti-pattern checklist, contrast/focus/reduced-motion gates |
| **frontend-design** (orchestrator) | local `.agents/skills/` | project skill | Evaluation loop, brief-driven direction, “would a human design this?” discipline |
| **frontend-design** (Junaid-PK) | [Junaid-PK/frontend-design-skill](https://github.com/Junaid-PK/frontend-design-skill) | Apache-2.0 | Anti-AI-boilerplate: one primary intent/screen, hierarchy not volume, cards only for meaningful grouping, restrained color |
| **frontend-design** (PracticalSwan) | [PracticalSwan/agent-skills](https://github.com/PracticalSwan/agent-skills) `frontend-design/` | MIT + Apache-2.0 | Product/workspace mode router; universal quality rules; component review rubric; anti-patterns (no default heroes/cards/gradients/glass) |

**Rejected from research (not applied as style):** HUD/Cyberpunk neon glow styles from ui-ux-pro-max style DB — accessibility + “no neon/glowing borders” mandate.

---

## 3. External references (patterns only, license-checked)

| Resource | License | Used for | Copied? |
|----------|---------|----------|---------|
| [brickshow/pc-anatomy](https://github.com/brickshow/pc-anatomy) | MIT | Hardware hotspot/inspection interaction ideas; component identity affordances | No assets/code |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | MIT | Topology library already in use | Dependency only |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | ISC | Icons | Dependency only |
| [agents-inc/skills](https://github.com/agents-inc/skills) | MIT | R3F/three skill inventory consulted for 3D option (deferred) | Not installed |
| Junaid-PK / PracticalSwan frontend-design SKILL.md | Apache-2.0 / MIT | Review criteria above | Criteria applied, not vendored |

**3D decision (P0):** remain on interactive **2D isometric/technical SVG** workbench. Rationale: bundle (~940KB main already), no model assets with clear license in-tree, keyboard/a11y parity, state wiring simpler. 3D (R3F) deferred to later phase if spatial cable routing is required; recorded in ENVIRONMENT_ARCHITECTURE 2D/3D section.

---

## 4. Design direction (visual thesis)

> **Industrial technical workbench** — a quiet, dense operations surface where the simulated machine/network/console *is* the UI chrome; cards become structural rails, drawers, and equipment panels.

### Tokens (extend `@theme`, shared)

| Token | Direction |
|-------|-----------|
| Radius | **4px** structural (`--radius-lab: 4px`); kill soft 12px card feel |
| Surfaces | Workbench: `#0b1220` canvas zones; panel `#0f172a`; rail dividers 1px `#1e293b` |
| Accent | Keep `--color-lab-accent` sky for focus/selection only — reduce decorative use |
| Type | Fira Sans body / Fira Code data (already paired via ui-ux-pro-max); headings sentence case, not uppercase chrome everywhere |
| Density | High density, fewer boxed regions; section = top rule + label, not always a bordered card |

### Layout architecture (ScenarioPage)

```
┌ toolbar: Exit · title · mode · Hint · Verify · Restart ─────────────┐
├ incident strip (ticket, not a floating card — full-bleed rail) ─────┤
├ left RAIL (tools)     │ environment CANVAS (dominant)  │ evidence RAIL │
│  hypotheses (inline)  │  EnvironmentRenderer           │ session log   │
│  actions (list)       │  [terminal dock: collapsed →]   │ concepts (dim)│
│  hints (disclosure)   │  learning feedback (inline strip) │ score (fold) │
└───────────────────────┴────────────────────────────────┴───────────────┘
```

- **Environment** ≥50% visual weight; columns are rails with separators, not peer cards.
- **Score** remains Disclosure, default closed; never a hero metric.
- **Diagnostics** stays dev-only.

### Terminal architecture

| State | UI |
|-------|-----|
| **collapsed** (default) | Single row: `Terminal · Linux` + `[open]` + shell name; no body |
| **open** | Body **220px** (clamp 180–280); chrome: clear/copy/collapse |
| **expanded** | Body **min(420px, 50vh)**; same chrome + expand icon |
| **fullscreen** | Optional overlay (same component, `fixed inset-0` class path) |
| **absent** | `shell === "none"` or `showTerminal === false` — no DOM node |

### Topology architecture

- Remove MiniMap (P0 fix for opaque mask rectangle).
- Viewport: transparent over lab surface (not hard `#0b1220` slab); height `min-h-[320px] h-[42vh]`.
- Single panel border (drop double panel nesting).
- Nodes: equipment silhouettes (rack/unit rects, port strips) with health color+icon+label; links as path traces with traffic idle/fault states.
- Inspector: contextual popover/side strip on select — not a second giant card.

### Hardware environment architecture

- **Scene:** workbench mat → open chassis (isometric-ish top/front) → motherboard plate with real relative placement (ATX: rear I/O top-left, PCIe lower, 24-pin right edge, EPS top, DIMM right of socket, SATA lower-right).
- **Parts as paths/groups with silhouettes:** latched DIMM slots, socket + lever, cooler with fin hints, GPU with bracket + fans, PSU with fan grille + rocker switch, HDD bay + SATA loom, front-panel header pin comb, cable runs as curves with connector housings.
- **State bind:** `bench.*` → LED colors, fan spin class, POST badge, cable presence opacity, switch position — all from world only.

---

## 5. Component / environment architecture (this phase)

| Component | Change |
|-----------|--------|
| `ScenarioPage.tsx` | Rails + dominant canvas; flatten left/right stacks; incident as strip; terminal dock collapsed |
| `SimTerminal.tsx` | 3-state (collapsed/open/expanded); content-sized body; no-shell unchanged (parent gate) |
| `NetworkTopology.tsx` | Remove MiniMap; fix viewport chrome; equipment nodes; taller canvas |
| `NetworkLab.tsx` | Thin wrapper; stop double-padding around topology |
| `HardwareLab.tsx` | Physical workbench SVG rebuild (groups keep world bindings) |
| `index.css` | Radius 4px; rail/section utilities; terminal dock; topology viewport; reduce card-hover glow |
| `LearningLoopPanel` | Inline feedback strip (not full peer card) in center column |
| `docs/ATTRIBUTION.md` | Record new skill licenses |

**Not in P0 (explicit):** Phase 8D DatabaseLab visual overhaul, Windows/Linux/Security/Support art directions, 3D, scenario expansion, engine changes.

---

## 6. Responsive strategy

- **≥1440px:** rails 300px / canvas 1fr / evidence 300px  
- **1024–1439px:** rails 260px / canvas 1fr / evidence 260px; incident single line wrap  
- **768–1023px:** canvas full width; tools and evidence become stacked sections below canvas (order: incident → environment → terminal dock → tools → evidence)  
- **<768px:** single column; toolbar actions wrap; terminal open height 180px; topology min-h 280px; no horizontal scroll  

Breakpoints driven by rail collapse, not device names.

---

## 7. Anti-AI-slop checklist (self-review gate)

- [ ] No card grid as default — rails, strips, dock, canvas  
- [ ] No glassmorphism / gradient orbs / glowing borders  
- [ ] No giant empty black terminal or topology slab  
- [ ] No decorative “SYSTEM / STATUS / ACTIVE” chrome  
- [ ] Score not primary; no KPI hero row  
- [ ] Varied structures: toolbar, strip, rail, canvas, dock, disclosure  
- [ ] Domain distinction: hardware = physical bench; network = ops map  
- [ ] Human-designer question: *Would a pro build this ops bench this way?* — if no, redesign  

---

## 8. Verification plan (no browser E2E)

1. `npm run typecheck`  
2. `npm run lint`  
3. `npm run test` (69 engine tests preserved)  
4. `npm run build` (chunk budget report)  
5. Manual user screenshot pass (user-driven; agent does not claim visual E2E)

---

## 9. Known limitations (pre-implementation honesty)

- Agent cannot open interactive browser to confirm MiniMap was the only overlay contributor; fix removes MiniMap + hard-coded slab + double nesting (structural fixes).  
- Hardware scene is original SVG geometry (no third-party model files) — proportions are schematic-realistic, not CAD-accurate.  
- Fullscreen terminal state may ship as expanded-only if overlay focus trap cost is high; will note in final report if cut.  

---

# Phase 9A — Environment-First Design Audit (ScenarioPage)

**Date:** 2026-09-25 · **Gate:** environment-first hierarchy review (PART 2–6 of Phase 9 mandate)

## A. Required hierarchy vs. current state

| # | Priority | Required | Current (P0 state) | Gap |
|---|----------|----------|--------------------|-----|
| 1 | Environment | Largest surface, dominant | `lab-canvas` holds EnvironmentRenderer but shares space with LearningLoopPanel + terminal dock; rails 280px each compress it on 1366px | Environment must own ≥50% and start higher (incident becomes compact strip) |
| 2 | Objective | Always visible, compact | IncidentBanner is a full block above grid (good) but competes in flow | Compress to full-bleed strip; objective states stay in it |
| 3 | Interaction/inspection | Contextual, in-environment | Actions live in left rail as a plain list; no part-level contextual selection | Selection model: contextual actions appear with the selected part/region |
| 4 | Evidence | Timeline/tray, not one panel | Right rail "Session log" = one scrolling mono list + feedback block | Becomes evidence tray with typed entries (log/measurement/LED/service/statement) |
| 5 | Conversation | Visually important drawer/side panel | Conversation renders *inside* environment via SupportLab below primary env (`EnvironmentRenderer.withSupport` stacks it) | Move to dedicated right-side drawer/panel with role grammar (customer/mentor/system evidence) |
| 6 | Tools | Compact dock → drawers | Tools = hypotheses/actions/hints/KB stacked as rail sections; terminal separate dock | Tool dock: Terminal/Logs/Conversation/Evidence/Notes/Knowledge/Hints as compact controls → contextual drawers |
| 7 | Hints | Disclosure (already folded) | Left-rail Disclosure — OK, stays folded | Keep; move under tool dock semantics |
| 8 | Score | Folded, never hero | Disclosure default-closed — OK | Keep folded; expose only in debrief/dock badge |
| 9 | Debug | Dev-only | DevDiagnostics gated — OK | Keep |

## B. Anti-slop findings to resolve in 9E

- Rails still read as three near-equal columns at 1366px (must verify dominance at 1366/1440/1920).
- `LearningLoopPanel` still renders as its own block below the environment — must become an inline contextual feedback strip (not a peer card).
- Left rail = four stacked `lab-rail-section` blocks (hypotheses/actions/hints/KB) → too close to "panel column"; actions need contextual binding to environment selection.
- Pre-start brief is acceptable (not a card grid) but must keep objectives + ticket context; modes row = buttons with `Play` icons — fine.
- Terminal dock (P0) is correct architecture; 9E adds: command hints, history indicator, fullscreen overlay, shell indicator in collapsed row.
- Debrief `md:grid-cols-3` three-column block with 10 numbered sub-blocks = dense but structured; keep as post-verification report (it is a report, not the lab).

## C. Domain visual grammar (PART 9 plan)

| Domain | Grammar direction |
|--------|-------------------|
| Hardware (`pc-no-power`) | Physical workbench: 3D scene (fallback SVG), parts, cables, LEDs — inspection by selection |
| Networking (`dns-some-sites-broken`) | Netops workspace: equipment silhouettes, paths, packet motion, link inspection |
| Database (`db-connection-refused`) | Data-path chain: App → pool → host → PG → :5432 → DB → tables |
| Windows / Linux / Security / Support | distinct tool chrome per lab (console manager / unix terminal / SOC timeline / service desk) sharing tokens |

All share `--color-lab-*` tokens, 4px radius, Fira pairing; distinction comes from structure and content, not per-domain recoloring.

## D. Tool dock architecture (9F)

```
[▶ Terminal·Linux] [Logs] [Conversation] [Evidence·n] [Notes] [Knowledge] [Hints]
      └ compact rows → open the matching contextual drawer; only one drawer open at a time
```
- Dock sits between environment and bottom edge (or right rail top on narrow screens).
- Drawers overlay the environment edge — never resize the scene (no re-layout jank); Escape closes; focus returns to trigger.
- Evidence drawer = timeline with typed icons (log line, measurement, LED, port, ping, statement…), each entry links back to its source (terminal scrollback, part selection, conversation).
- Conversation drawer = right side, visually weighty: customer (ticket voice), mentor (guidance), system evidence (neutral mono) — differentiated by rule/label/icon, not cartoon bubbles.


## Phase 9D/9E — Simulation-first ScenarioPage workspace (completed)

**Design directive (user):** 3D was visually acceptable but still embedded in the old
dashboard composition (rails + equal columns). The page had to become: compact
incident/objective toolbar → large dominant stage (60–75% of attention) → contextual
bottom dock. The simulation must be the first thing the eye lands on.

### Composition (after)

```
┌ sim-topbar ─────────────────────────────────────────────────────────────┐
│ Exit │ Title │ ticket-chip │ mode │ Objective…  │ Dev Hint Tools Verify Restart │  ~46px
├ sim-brief (only when ticket chip toggled) ──────────────────────────────┤
│ IncidentBanner · Objectives · Prerequisites                              │
├ sim-stage (flex:1, fills viewport minus header) ────────────────────────┤
│ ┌ LabSection: title + subtitle + [view toggle] ───────────────────────┐ │
│ │ power chain strip                                                    │ │
│ │ .hw-stage-wrap = 3D canvas (or SVG fallback)                         │ │
│ │   overlay: camera presets (top-left), legend chips (bottom-left,     │ │
│ │   only when nothing selected), contextual inspector (bottom-right,   │ │
│ │   only when selected)                                                │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ overlay: action review (.sim-feedback, top-right, dismissible)           │
├ sim-dock ───────────────────────────────────────────────────────────────┤
│ drawer (opens only on request; terminal mounts here with hideTrigger)    │
│ bar: [Terminal?] Actions Evidence Hints Learn Journal Dev · mode/actions │  ~44px
└─────────────────────────────────────────────────────────────────────────┘
height: calc(100dvh - 3.5rem) at ≥1024px; debrief + footer below the fold
```

- Rails (`lab-grid` / `lab-rail*` / `lab-canvas`), hardware side column, bench steps
  and permanent IncidentBanner are **removed** (CSS deleted, not just hidden).
- Score stays folded (Disclosure inside Journal drawer); hints/verify are one click
  from the topbar; `pc-no-power` (`shell: "none"`) shows no Terminal button at all.
- Feedback dismissal is identity-keyed (`dismissedFeedback !== learningLoop`) so a
  newly built card always resurfaces — no setState-in-effect.

### Design-review pass #2 (skill-driven: ui-ux-pro-max) — findings fixed

1. Empty drawer possible when Dev was toggled off while its drawer was open →
   `drawerOpen` guard (no empty panels).
2. Feedback overlay at top-right anchored at 2.6rem collided with the power-chain
   row at 1024px → moved to 5.6rem (below header + chain, empty stage corner).
3. Touch targets: `.sim-btn`/`.dock-btn` are 30px (desktop density); mobile <640px
   now gets 40px height and a wrapping topbar (no horizontal overflow at 375px).
4. Terminal body (`min(420px,50vh)`) exceeded the drawer's max-height → forced to
   `min(340px, calc(44vh - 76px))` inside `.sim-dock-drawer` (no inner scrollbar).
5. `.sim-stage` had `aria-label` on a plain div (not exposed) → added `role="region"`.
6. Z-index audit: KbOverlay (z-50) > feedback (5) > inspector (4) > legend (3) >
   camera toolbar (2); header sticky z-20 unaffected; skip-link z-50 focus-only.
7. Button cascade: `.sim-btn` (defined after `.btn-*`, same layer/specificity)
   correctly wins over `.btn-*` min-height 40px; global `:focus-visible` outline and
   `a,button { cursor: pointer }` verified present.

### Anti-slop (B-section findings) resolution

- Three near-equal rails → gone; single dominant stage + top/bottom chrome.
- `LearningLoopPanel` peer block → floats over the stage as a dismissible review.
- Left rail stacks (hypotheses/actions/hints/KB) → all moved into dock drawers
  (open only on request; one drawer at a time).
- Terminal dock kept (P0 architecture), now compact inside the drawer.
- Debrief `md:grid-cols-3` kept — it is a post-verification report, not the lab.
- No emoji icons (lucide only), no gradients/glass, no hover-scale layout shift,
  color+text pairing on every state chip, transitions 120–150ms color-only.

### Verification (9D/9E)

- `npx tsc -p tsconfig.app.json --noEmit` ✓
- `npm run lint` ✓ (0 problems; fixed react-hooks/set-state-in-effect by
  identity-keyed dismissal)
- `npm run test` ✓ 76/76 (6 files; 9 unchanged)
- `npm run build` ✓ entry `index-*.js` 952.93 kB / 264.06 kB gzip (no three);
  `HardwareScene-*.js` 954.89 kB / 251.55 kB gzip (lazy chunk, ≤1 MB / ≤300 kB
  gzip budget ✓); CSS 68.26 kB / 12.88 kB gzip.

### Phase 9F — Network operations laboratory (`networking/*` scenarios)

**Governing mandate:** "THE SIMULATION IS THE PRODUCT." The topology IS the
environment: dominant at 1366/1440/1920, no permanent hypotheses/actions/
inspector/score panels, equipment-like silhouettes, contextual inspection only,
progressive evidence (no premature root-cause reveal), multi-channel fault
visualization, dock tools open on request, compact terminal, responsive.

```
┌ LabSection "Network operations" ─────────────────────────────────────────┐
│ status: path unverified / degraded / fault proven / path healthy          │
├ .net-body ───────────────────────────────────────────────────────────────┤
│ ┌ .net-stage-wrap (fills the panel, min-height 340px) ─────────────────┐ │
│ │ [PROBES ⌐ top-left]                    xyflow Controls (top-right)   │ │
│ │  ✓ ping gateway  ? nslookup …                                        │ │
│ │                                                                      │ │
│ │        ●WORKSTATION═════●GATEWAY---···---●DNS  ┄┄┄┄●INTERNET          │ │
│ │              │             (LAN ✓ / DNS path ✗ edge marks)           │ │
│ │  [health legend + device quick-select chips — bottom-left]           │ │
│ │                                        [.net-inspector — bottom-right│ │
│ │                                          ONLY while selected]        │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
dock bar: [Terminal?] [Customer?] Actions Evidence Hints Learn Journal Dev
```

**Evidence-driven health model (`features/network/netState.ts`, 249 lines).**
Health reads ONLY `world.diagnostics` probe flags + locally observable facts
(APIPA address, empty gateway, ARP conflict). Raw `network.faults` is never
surfaced: gateway/dns/WAN start `UNTESTED · not probed` and only change once
`pingedGateway`/`ranNslookup`/`pingedPublicIp` record evidence — `ranNslookup`
is the DNS *reveal moment*. Rules are pure, shared by topology, inspector,
header status and tests.

**Structure changes.**
- `NetworkTopology.tsx` rewritten: logical node/link ids, static edge ids
  (`host-gateway`, `host-dhcp`, `gateway-dns`, `gateway-internet`), flat
  equipment silhouettes (no SaaS cards), edge state marks, route highlight +
  non-route dimming on node select, `Controls position="top-right"`,
  `nodesFocusable/edgesFocusable=false` (xyflow has no Enter-activation →
  quick-select chips are the keyboard path).
- `NetworkLab.tsx` rewritten as stage-first `.net-body`: probe strip
  (scenario `isDiagnostic` actions, ✓/pending), health legend + device chips
  (bottom-left), contextual `aside.net-inspector` (Status / Details / Path
  hops / Evidence / Available actions / Learn) rendered only on selection,
  with close button + pane-click clear.
- Removed: `.network-lab`, `.ops-*` status strip, `.topology-fault-pill`
  (leaked root cause at t=0), `.topology-legend` panel, `.net-inspect-split`,
  `.net-actions-rail`, `42vh` height clamp → topology now `position:absolute;
  inset:0` filling the lab panel (flat `#0b1220`, no radial gradient).
- Link metadata moved to `netState.ts` (`NET_LINK_META`/`netLinkEndpoints`/
  `netLinkShortLabel`) so NetworkLab never statically imports the lazy
  topology chunk (181.23 kB / 58.37 kB gzip stays code-split).
- Conversation de-stacked: `withSupport` wrapper removed from
  `EnvironmentRenderer` (it stacked SupportLab *under* the dominant stage);
  `hasCustomerConversation()` gates a new `customer` dock tool in ScenarioPage
  that mounts SupportLab in the drawer (excluded for `support`/`mixed`, where
  SupportLab remains the environment). `key={scenario.id}` on NetworkLab and
  HardwareLabView resets ephemeral selection across scenarios.

**Skill-driven design review (ui-ux-pro-max + frontend-design) — the 7 mandated questions, pass #2 (final code):**

| # | Question | Verdict |
|---|----------|---------|
| 1 | Looks like a network operations environment? | **Yes** — equipment silhouettes with port strips, mono labels, ops status vocabulary ("fault proven"), probe chain, dark ops palette `#0b1220`. |
| 2 | Topology is the primary visual object? | **Yes** — `net-stage-wrap` fills the panel (`flex:1`, min 340px), viewport is `absolute inset:0`; all four overlays are corner overlays only. |
| 3 | Learner can identify the fault path? | **Yes** — node select highlights WORKSTATION→GATEWAY→DNS/INTERNET route, dims the rest; inspector shows hop chain with per-hop link marks; evidence accumulates per selection. |
| 4 | Inspect devices without permanent panels? | **Yes** — inspector renders only while `sel !== null` (`aside` + close + pane-click clear); no "Click a device to inspect" placeholder exists. |
| 5 | Contextual, not dashboard? | **Yes** — ops-strip, fault-pill, inspect-split and actions-rail deleted; evidence and available actions (from `availableActions`, gated by `appliesWhen`) appear only inside the relevant inspector. |
| 6 | Unnecessary chrome? | **Mostly** — removed the four permanent chrome blocks; kept probe strip (evidence progression), legend (required for Q7), chips (keyboard parity), one-line factual subtitle (instructional subtitle was reworded to `workstation · gateway · dhcp · dns · internet`). |
| 7 | Usable without color alone? | **Yes** — edge marks `?/✓/!/✗` + health words (`UNTESTED/HEALTHY/DEGRADED/FAILED`) on nodes, legend and probes; `aria-pressed` on chips/hops; global `:focus-visible` outline. |

Review fixes applied in pass #2: legend/probe-label contrast bumped from
`lab-faint` (#64748b ≈ 3.6:1 on the stage) to `lab-muted` (#94a3b8 ≈ 6.4:1);
mobile <640px touch targets for `.net-chip/.net-probe/.net-hop` → 36px and
`.net-inspector-close` → 40px; imperative subtitle removed.

**Anti-slop:** no fault-pill/giant red overlay/glow (restrained edge colors
`#3fa66a/#c9973f/#d45b5b`, non-route `opacity .3`, dashed = untested); no
permanent root cause (faults only via proven evidence); no card grid (single
stage + corner overlays); no dashboard rails; no emoji (lucide only); no
gradient backgrounds; transitions 120ms color-only; `prefers-reduced-motion`
respects `sim-rise`/`sim-fade`.

### Verification (9F)

- `npx tsc -p tsconfig.app.json --noEmit` ✓
- `npm run lint` ✓ (0 problems; `hasCustomerConversation` moved out of the
  component file to keep react-refresh clean)
- `npm run test` ✓ 94/94 (7 files; +18 `netState.test.ts`: progressive-evidence
  reveal for all four networking scenarios, link meta/routes, probe strip)
- `npm run build` ✓ entry `index-*.js` 965.43 kB / 267.17 kB gzip (no three);
  `NetworkTopology-*.js` 181.23 / 58.37 gzip (lazy); `HardwareScene-*.js`
  954.90 / 251.52 gzip; CSS 71.42 + 11.14 kB gzip total ≤ budget.

### Known limitations (9F)

- Edge/route clicks rely on SVG hit areas sized in the topology; keyboard users
  reach link evidence through device inspectors (xyflow does not activate
  elements on Enter).
- `nodesFocusable=false` trades per-node tab stops for no focus-without-
  activation trap; quick-select chips provide selection parity.
- Probe strip shows the first four `isDiagnostic` actions; a scenario adding
  more diagnostics would need a scrollable strip.


### Phase 9G — Database operations laboratory (`database/*` scenarios)

**Governing mandate:** the database causal chain (APPLICATION → CONNECTION
POOL → DATABASE HOST → POSTGRESQL → PORT → DATABASE → STORAGE) becomes the
primary, spatially interactive environment. Shared design system with 9F
(dark ops stage, contextual inspector, evidence gates) but a deliberately
DIFFERENT domain grammar: systemd unit rows + journal instead of topology
nodes + probe chips. Root cause must not be visible at t=0 (only the public
ECONNREFUSED symptom); evidence progresses check service → service stopped,
check port → 5432 closed, logs → bind error, restart → RUNNING/LISTENING,
verify → connected. STOPPED/STARTING/RUNNING is world-driven (`unit.status`
→ `dbServicePhase`), never faked in the UI.

```
┌ LabSection "Database operations" ─────────────────────────────────────────┐
│ subtitle: app01 → db01:5432 · status: unverified / app connection refused  │
│           / postgresql failed / 5432 closed / app → db healthy             │
├ .db-body ─────────────────────────────────────────────────────────────────┤
│ ┌ .db-stage-wrap (fills the panel, min-height 460px, flat #0b1220) ─────┐ │
│ │ [CHECKS ⌐ top-left]                          [Journal ⌐ top-right]    │ │
│ │  ? Read logs  ? Check port  ? Check service                           │ │
│ │ ┌ .db-ladder (max-width 760, centered) ─────────────────────────────┐ │ │
│ │ │ [▣] API service            CLIENT        ✗ REFUSED   ECONNREF…   │ │ │
│ │ │ [▣] Connection pool        CLIENT        ✗ 0/UNAVAILABLE         │ │ │
│ │ │        ····· TCP 5432 → db01 · REFUSED (wire, dashed crit) ·····  │ │ │
│ │ │ [▣] db01                   SERVER        ✓ UP  answered TCP RST  │ │ │
│ │ │ └── [⚙] postgresql.service  UNIT          ? UNTESTED             │ │ │
│ │ │     [⌗] TCP 5432            SOCKET        ? UNTESTED             │ │ │
│ │ │     [🗄] appdb               INSTANCE      ? UNTESTED            │ │ │
│ │ │     [disk] Data directory   VOLUME        ✓ MOUNTED              │ │ │
│ │ └───────────────────────────────────────────────────────────────────┘ │ │
│ │ [journal overlay — on request]  [.db-inspector — bottom-right, ONLY    │ │
│ │                                 while a layer is selected]            │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
dock bar: [Terminal?] Actions Evidence Hints Learn Journal Dev
```

**Evidence-driven layer model (`features/database/dbState.ts`, 409 lines).**
Same principle as `netState.ts`: raw fault flags and unit status are not
surfaced until checks (or terminal commands mapped to them) record evidence.
At t=0 only the public symptom is visible: app `REFUSED`, pool
`0 / UNAVAILABLE`, wire `TCP 5432 → db01 · REFUSED`, host `UP · answered TCP
RST` (a TCP RST is itself proof the host answers), while service / port /
database stay `UNTESTED`. `db.credsChecked` gates the service failure and its
bind-error detail, `db.portChecked` gates `CLOSED`/`FILTERED`, `db.verified`
gates `CONNECTED`/`OPEN`/`ESTABLISHED`. Positive state (a live listener) is
observable without a check; failures are not — matching how probes work in 9F.

**Structure changes.**
- `DatabaseLab.tsx` rewritten (stage-first `.db-body`): causal rack ladder as
  DOM rows (native `<button>`, `aria-pressed`, global focus-visible) — NOT
  xyflow, so the two labs share a palette but not a visual grammar; indented
  containment bracket (`db01 ⊃ service/port/database/storage`) instead of
  node edges; connection channel as a physical wire segment with state label.
- Checks strip (top-left): scenario `isDiagnostic` actions; click applies the
  action (`onInspect`) AND selects the related layer (map: read-logs → app,
  check-port → port, check-service → service); ✓ marks recorded evidence.
- Journal overlay (top-right, on request): severity as a WORD
  (`FATAL/ERROR/WARN/INFO`) + category filter chips (connection, listener,
  startup, auth, storage, config) + source prefix; empty state per category.
- Contextual `.db-inspector` (bottom-right) renders only while a layer is
  selected: status line, systemd unit block (`Active: not checked` →
  `active (running)` + cleared errors), facts, evidence rows (applied actions
  matching `component`/`inspectTarget`), available actions
  (`availableActions` + `appliesWhen` gates), Open journal, Learn KB.
- Removed (previous DatabaseLab): status card grid (6 permanent cards),
  arrow-chain view, investigation-steps checklist (an action rail telling
  learners what to do — no discovery), permanent component inspector (leaked
  `failed`/bind error at t=0), duplicated unit/service information.
- Scenario `db-connection-refused` gained `db.host/db.port` identity,
  `db.portChecked` initial key, per-action `matchHints`
  (`ss -tuln`/`journalctl`/`systemctl restart postgresql`) and
  `component`/`inspectTarget` mapping for evidence grouping.
- `terminal.ts` `ss`/`netstat` is world-aware: for `world.db` worlds it emits
  `LISTEN 0.0.0.0:5432` only when `db.portListening`, plus an ESTABLISHED row
  only when `db.verified` — nothing fabricated, nothing leaked. Allowlist
  unchanged (ping, ss, systemctl, journalctl, help, ps — no psql/pg_isready).
- CSS: `.env-fill .panel > .db-body` added to the stage-fill selector; new
  `.db-*` block (ladder/rows/wire/contain/checks/journal/inspector, mobile
  <640px targets 36–40px); `.tone-*` colors scoped under `.db-stage-wrap`.

**Multi-fault architecture (not tied to one incident).** `dbAppFamily`
derives refused / filtered / auth / capacity / verified families from fault
flags + facts; storage `FULL` (diskFull), host `DOWN` (dbHostDown), port
`FILTERED` (portBlocked) are independent layer states; ladder rows, wire,
inspector and status badge all consume the same pure views — a future auth,
max-connections, disk-full or pool-exhaustion scenario only needs world keys.

**Skill-driven design review (ui-ux-pro-max) — the 9 mandated questions, pass #2 (final code):**

| # | Question | Verdict |
|---|----------|---------|
| 1 | Entering feels like a database operations lab? | **Yes** — systemd-style unit rows (CLIENT/SERVER/UNIT/SOCKET/INSTANCE/VOLUME role tags), TCP wire with state label, CHECKS strip, journal with severity words, `systemctl status`-like unit block. |
| 2 | Meaningfully different from NetworkLab? | **Yes** — DOM rack ladder + containment bracket vs xyflow node graph; journal overlay vs probe chips; no legend (state is written on each row); systemd/journal grammar vs topology grammar; same palette, different product. |
| 3 | Root cause hidden at t=0? | **Yes** — service/port/database `UNTESTED`; bind error only via journal (explicit open) or `check-service` (evidence gate); `dbStatus` shows the public symptom only; locked by `dbState.test.ts`. |
| 4 | Causal chain primary + spatially interactive? | **Yes** — seven layers top-to-bottom app→pool→wire→host⊃service→port→database→storage fill the stage; every row is selectable; wire sits between pool and host where the TCP connection actually is. |
| 5 | No permanent panels / empty states / action rails? | **Yes** — card grid, chain view, investigation steps and permanent inspector deleted; nothing renders empty-and-waiting (inspector/journal are conditional). |
| 6 | Evidence progression implemented? | **Yes** — t0 UNTESTED → check-port CLOSED → check-service FAILED(bind error) → restart RUNNING/LISTENING/READY (wire still refused) → verify CONNECTED/ESTABLISHED/healthy; phases map from `unit.status` (`inactive`→STOPPED, `activating`→STARTING, `active`→RUNNING). |
| 7 | Terminal integration? | **Yes** — allowlist unchanged; world-aware `ss`; matchHints link `ss -tuln`/`journalctl`/`systemctl restart` to actions; every check/fix reachable from strip, inspector buttons and terminal. |
| 8 | Multi-fault capable? | **Yes** — auth/capacity/filtered families + disk-full/host-down/pool-exhaustion flags tested as independent layer states. |
| 9 | Responsive + accessible? | **Yes** — <640px rows wrap, state row left-aligns, checks/journal/close 36–40px; `aria-pressed` on rows/chips, `aria-label` on overlays/wire; severity words + `✓ ! ✗ ?` marks mean color is never the only channel; DOM order = visual order; global `:focus-visible` + reduced-motion `sim-rise`. |

Bugs found by the new tests in pass #2 (fixed): `inactive (dead)` matched the
`active` regex → STOPPED misreported as RUNNING (regex order fixed: failed →
stopped → starting → running); `connection refused` log line classified INFO
(now `refused`/`no space` map to ERROR severity).

**Anti-slop:** no status-card grid, no investigation checklist (self-answering
rail), no permanent inspector, no duplicated unit info (contain label + card +
steps collapsed to one row + one inspector), no giant red banner / glow /
gradient / KPI widgets (pre-implementation style search rejected
"Real-Time Monitoring BI dashboard" and neon), no emoji (lucide only), no
xyflow re-skin of the network lab, transitions 120ms color-only.

### Verification (9G)

- `npx tsc -p tsconfig.app.json --noEmit` ✓
- `npm run lint` ✓ (0 problems)
- `npm run test` ✓ 118/118 (8 files; +24 `dbState.test.ts`: evidence gates,
  t0 root-cause hiding, causal progression, multi-fault families, phase
  mapping, log classification, structural contracts)
- `npm run build` ✓ entry `index-*.js` 976.38 kB / 270.72 kB gzip (no three);
  `NetworkTopology-*.js` 181.23 / 58.37 gzip (lazy); `HardwareScene-*.js`
  954.90 / 251.52 gzip; CSS 81.41 + 11.14 kB.

### Known limitations (9G)

- Checks strip shows the first four `isDiagnostic` actions (this scenario has
  three; a denser scenario would need a scrollable strip).
- Journal and inspector can overlap on very short stages (inspector z-4 above
  journal z-3; both are dismissible).
- Only one `category: "database"` scenario exists today; the ladder assumes
  PostgreSQL-shaped layers (service/port/database/storage) — a non-SQL
  database fault would need its own layer metadata, though `dbState` views
  are already keyed generically.
- Terminal has no psql/pg_isready by mandate; the "Run application
  connectivity check" step is a UI action (`verify-query`), not SQL.

## Phase 9H — Domain grammar + cross-lab consistency

Governance phase, not a redesign. Goal: ONE PRODUCT LANGUAGE, MULTIPLE
DOMAIN LANGUAGES — audit every lab against shared interaction principles,
define the grammar as binding docs, and fix only concrete violations.
Binding outputs: `docs/DOMAIN_GRAMMAR.md` (10 product rules, layout
selection criteria, 8 domain grammars, pairwise differentiation test) and
`docs/UI_ANTI_SLOP_RULES.md` (permanent NO/YES checklist).

### Audit method (code, not reports)

Direct reads + world dumps of all 7 labs and all 15 scenarios' worlds/actions
(`C:\Temps\opencode\dump2.js`), scored against the grammar fields: stage
shape, tab/view data sources, tool strip contents, evidence position,
inspector model, JSON usage, labeling, touch/a11y states.

### Violations found and fixed (P1–P3)

| # | Lab | Violation | Fix | Priority |
|---|-----|-----------|-----|----------|
| 1 | Windows | Event Viewer read `events ?? eventLog` — no world has those keys → empty pane (all 3 Windows scenarios) | falls back to `world.logs` | P1 |
| 2 | Windows | `world.disks` rendered nowhere → `clear-temp`/`purge-recycle` patches invisible (rule-5 consequence) | conditional Storage tab renders `world.disks` with % thresholds | P1 |
| 3 | Windows | permanent ungated "Workstation steps" rail duplicating dock Actions | Checks strip = `isDiagnostic` only | P1 |
| 4 | Windows | `JSON.stringify` in formatEvent/serviceList | shared `formatValue()` | P1 |
| 5 | Windows | Device Manager/Task Manager tabs empty in every scenario (no `devices`/`processes` keys) | conditional tab list (R5): tab only when data exists | P1 |
| 6 | Windows | "Services · click to inspect" instruction copy; `environment.kind` badge; dead `relatedToService` button | domain label "Services"; badge removed; CTA via `availableActions`+`isFix/isDiagnostic` and `inspectTarget: "ReportSvc"` wired in scenario | P3 |
| 7 | Windows | tabs without state semantics | `aria-pressed` | P2 |
| 8 | Linux | full ungated "Linux steps" rail | Checks strip = `isDiagnostic` | P1 |
| 9 | Linux | `JSON.stringify` on processes/packages/status objects | `formatValue()` | P1 |
| 10 | Linux | Process/Package tabs empty in both Linux scenarios; "Virtual filesystem · click a path"; "shell available" badge | conditional views (R5); header is domain text only | P1/P3 |
| 11 | Linux | contextual file button could promote wrong-path actions; non-`isFix/isDiagnostic` eligible | CTA filter `isFix \|\| isDiagnostic` from `availableActions` | P1 |
| 12 | Linux | tabs without state semantics | `aria-pressed` | P2 |
| 13 | Security | catch-all `Object.entries(run.world)` → raw JSON evidence + "No evidence collected yet." placeholder | evidence model: gated fact rows (`mail.analyzed` → sender/link; `identity.failedAttempts`) + applied-action rows (`evidenceGain ?? feedback`); section renders only when non-empty | P1 |
| 14 | Security | permanent full "Investigation steps" rail | Checks strip = `isDiagnostic` (+ Learn chips) | P1 |
| 15 | Security | permanent `selected` one-liner + meta ticket badge | removed (description via `title`); board header = surface name | P3 |
| 16 | all three | tool strips lacked the `role="status" aria-label="Diagnostic checks"` used by Network/DB probes | added for consistency | P2 |
| 17 | all three | tab bars `gap-1` (4px) under touch-spacing guidance | `gap-1.5` | P2 |
| 18 | index.css | `.lab-tab`/`.lab-row`/`.chip` had no mobile touch tier | `@media (max-width:639px)`: 36/36/32px (sim/dock stay 40px) | P2 |

### Files intentionally NOT changed (audited, satisfied the grammar)

`HardwareLab.tsx`/`HardwareLabView.tsx`/`hardware3d/*` (R3F pass: `frameloop="demand"`,
`dpr=[1,2]`, `powerPreference`, delta-`useFrame`, refs-not-state, reduced-motion →
2D gate), `NetworkLab.tsx`+`netState.ts` (probes already `isDiagnostic`,
conditional inspector, no JSON), `DatabaseLab.tsx`+`dbState.ts` (9G), `SupportLab.tsx`
(conversation is the environment), `ScenarioPage.tsx` (dock drawer canonical),
engine (`scenario.ts`/`evaluation.ts`/`terminal.ts`), all 15 scenarios except
two `inspectTarget` additions on `windows-app-crash` actions.

### Skills used (step 6)

- **ui-ux-pro-max** — `--domain ux` searches (accessibility/focus/contrast,
  touch target + spacing, disclosure/hierarchy, motion/reduced) and
  `--stack react` (derived state, keys, effects). Findings applied: focus ✓
  (global `:focus-visible`), cursor ✓ (global `cursor:pointer`), reduced-motion
  ✓, `role=status` parity, gap-1.5 spacing, mobile tiers. Accepted deviations:
  36px (not 44px) mobile tier — project tier system, WCAG 2.2 AA minimum 24px;
  12px mono data text — professional-tool density, ticket/instruction text is
  larger elsewhere.
- **frontend-design** — evaluation criteria (Design Quality / Originality /
  Craft / Functionality) applied as static code review. Verdict: identity =
  domain-native surfaces (bench/topology/ladder/console/board/chat), craft =
  consistent type/spacing tokens, functionality = native buttons + hover +
  focus + disabled states. Browser screenshot rounds skipped by project rule
  (no browser E2E; user inspects manually).
- **animations (R3F `three-d` rules)** — HardwareLab passes: lazy chunk,
  demand frameloop, dpr cap, delta motion, no per-frame state, reduced-motion
  → 2D, decorative canvas paired with HTML-equivalent info. No changes.

### Open-source research (step 7)

| Candidate | License | Activity | Real need? | Decision |
|---|---|---|---|---|
| `@radix-ui/react-tabs` 1.1.21 | MIT | active (Aug 2026 release, 19k stars) | marginal: 3 static tab bars of 2–5 toggles; native buttons + `aria-pressed` are keyboard-reachable; Radix adds 8 deps + ~53 kB for arrow-key roving | **not adopted**; revisit if tabs need orientation/manual-activation semantics |
| `react-window` (v2) | MIT | active | none: max list = 4 log rows, ≤8 files, ≤10 evidence rows — nothing near virtualization thresholds | **not adopted** |
| `react-virtualized` | MIT | stale (no commits in 6+ months, last release ~1 yr) | none (above) | **not adopted**; flagged as unmaintained |
| existing deps (xterm, @xyflow, lucide, three/R3F) | MIT | active | already cover terminal/topology/icons/3D | keep; no replacements |

No paid/mandatory-cloud services considered. `docs/ATTRIBUTION.md` unchanged
(no new dependencies).

### Verification (9H)

- `npx tsc -p tsconfig.app.json --noEmit` ✓
- `npm run lint` ✓ (0 problems)
- `npm run test` ✓ 118/118 (8 files — no engine/content tests weakened;
  only content change = 2 `inspectTarget` fields)
- `npm run build` ✓ entry `index-*.js` ~977 kB / ~271 kB gzip (no three);
  `NetworkTopology-*.js` 181.23 / 58.37 (lazy); `HardwareScene-*.js`
  954.90 / 251.52 (lazy); CSS 81.61 + 11.14 kB.

### Known limitations (9H)

- Tabs use `aria-pressed` toggle buttons rather than the full ARIA tablist
  pattern (no arrow-key roving) — deliberate, documented in research table.
- Windows inspector remains row-selection + contextual CTA (no full
  `aside` inspector like Network/DB); acceptable per domain grammar, revisit
  if service/task detail needs grow.
- Event Viewer pane has no virtualization (records ≤4 today); grammar guards
  against dumping large logs here.
- `linux-service-failing` journal lives only in the terminal (domain-correct);
  learners who never open the shell must rely on `journalctl-review` check
  feedback — by design.
- Skill-review screenshot rounds were not run (no browser E2E by mandate);
  user performs visual acceptance.

---

## Phase 9I — Adversarial anti-slop + product quality pass

Hostile code-level review of the redesigned product against
`DOMAIN_GRAMMAR.md` + `UI_ANTI_SLOP_RULES.md`. **Review gate, not make-work**:
implementation that already satisfies a rule was left untouched; only
P0/P1/P2 were fixed.

### Method (19-step mandate, condensed)

- **Code-first**: greps + reads over ScenarioPage, SimTerminal, all 7 labs,
  `index.css`, `scenarios/index.ts`, `package.json`; scripts in
  `C:\Temps\opencode\` (fix-gating scanner over all 15 scenarios, flagship
  action dump) — no engine/scenario redesign.
- **Root-cause leak audit** on the four mandated flagship scenarios
  (symptom → investigation → evidence → diagnosis → fix → verification).
- **Gates**: `tsc`, `eslint`, `vitest`, `vite build` (see Verification (9I)).
- No browser E2E by mandate — responsive verdicts are code analysis + manual
  checklist.

### Audit results by mandate area

| # | Area | Verdict |
|---|------|---------|
| 1 | Lab A–K review (primary object, dominance, no duplication, no state leak, believable tools) | PASS — stage dominates in every env; conversational support lives only in the dock (`hasCustomerConversation` excludes support-category envs → no double render); ephemeral selection remounts per scenario (`EnvironmentRenderer` key) |
| 2 | Terminal audit | PASS — single mount (`ScenarioPage` L552-560); `showTerminal` gates `shell !== "none"` and `SimTerminal` returns null for `none` (pc-no-power shows no terminal); heights bounded: doc ≈220px open / ≈min(420px, 50vh) expanded, drawer override `min(340px, calc(44vh - 76px))` with `min-height:160px`, drawer `max-height: min(44vh,440px)` scrollable |
| 3 | Inspector audit | PASS — contextual-only: network/DB/hardware asides render **only while selected** (`sel !== null`); no catch-all `Object.entries` dumps; `formatValue()` used everywhere in learner UI; `JSON.stringify` appears only in dev `WorldInspector`, storage internals, engine |
| 4 | Flagship root-cause flows | PASS — see table below |
| 5 | Domain confusion test | PASS — layouts/terminology/spatial metaphors differ per `DOMAIN_GRAMMAR` Part D; palette is intentionally shared, no state requires color-only reading |
| 6 | Card/panel audit | PASS — containers = meaningful boundaries (console panes, evidence boxes, dock drawers); no card grids; `sim-feedback` is a dismissible action-review card, not decoration |
| 7 | Status audit | PASS — ≥2 channels everywhere: StatusBadge icon+text+tone; lab "done" = text + disabled + emerald; net health = word + icon; disk % + bar; DB ladder = tone icon + state line + detail |
| 8 | Action audit | PASS — dock Actions = sole canonical list (`availableActions`); in-lab = `isDiagnostic` Checks strips only; contextual CTAs filtered `isFix || isDiagnostic`; all 11 `inspectTarget`s verified against their consumers (DB layer ids, hotspot ids, service names, fs paths); matchHints semantically tied |
| 9 | Evidence layers (visible → interpreted → repair) | PASS with documented deviations — 22/33 fixes properly gated; deviations below |
| 10 | A11y | PASS with documented deviations — global `:focus-visible`; `prefers-reduced-motion` (3 blocks + R3F 2D fallback); `role="status" aria-label="Diagnostic checks"` in all 5 check-strip labs; drawers are non-modal (no trap needed); native `title` tooltips; mobile touch tiers 40/36/32px; toggle-tab pattern documented |
| 11 | Responsive (1024/1366/1440/1920/mobile) | NEEDS REVIEW (manual) — code analysis passes (see below); visual confirmation remains a user checklist |
| 12 | Performance | PASS — lazy `NetworkTopology`/`HardwareScene` chunks intact; frameloop demand + reduced-motion fallback intact; no loading states removed; entry 977.13 kB / 270.99 gzip (within 1 MB budget) |
| 13 | Dependencies | PASS — **0 new dependencies** in 9I; `package.json` read in full: all MIT/open (R3F/drei/three, xterm, xyflow, zustand, zod, idb, lucide, router); no duplicates; `ATTRIBUTION.md` unchanged |
| 14 | Skills reviewed | see Skills used (9I) |

### Flagship root-cause flow (mandate section 4)

| Scenario | Symptom | Evidence visible before any check | Diagnosis gated | Fix gating | Verdict |
|---|---|---|---|---|---|
| `pc-no-power` | "no fans, no lights" + storm context (public) | physical bench state (switch position, cable seating) = observable | checks (`check-wall/cable/front-panel`) give derived observations | `press-power` gated on `bench.powerSwitchAtWall` etc. | PASS |
| `dns-some-sites-broken` | cached-vs-new URLs, "server not found" (public symptom) | topology + probe tools open (diagnostic tier) | probe feedback (ping/nslookup/tracert) | `fix-gateway` gated `diagnostics.pingedPublicIp`; verify gated `fixedGateway` | PASS |
| `db-connection-refused` | ECONNREFUSED in quoted app log (public reporter evidence) | ladder shows **"not checked"** honestly until probed | `check-port/check-service` set `portChecked/serviceChecked`; journal check | `restart-db` gated `db.credsChecked`; `verify-query` gated `serviceStarted` | PASS |
| `linux-permission-denied` | "Permission denied on /etc/myapp/config.yaml" (public) | **mode 600 root:root visible at t0** in the fs view (tier-1 observable) | `ls-config` feedback interprets ownership/mode | `verify-deploy` gated `perms.configFixed`; `fix-mode` itself open at t0 — documented below | PASS with deviation |

### Evidence layers per domain (mandate section 9)

| Domain | Visible BEFORE any check | Visible AFTER check | Interpreted AFTER check | Repair unlocked AFTER evidence |
|---|---|---|---|---|
| Hardware | bench physical state (switch position, cable seating, connector seating), ticket text | meter readings, fan/POST observations from `check-*` actions | derived flags (`psuOutputOk`, `posted`) surfaced in feedback + hotspot tone shifts to ok | `appliesWhen` on derived bench flags (`press-power` needs wall+cable+toggle) |
| Windows | event records / services / processes (machine state = tier-1 records) | `read-faulting-module` feedback (VC2010 missing → installing indicated) | hypothesis `h-dependency` starts `initiallyPlausible: false` — interpretation gated until the check | `install-dependency` gated on the check's patch flag; `verify-open-q3` gated on both fixes |
| Linux | fs mode/owner shown at t0 in the file view; `ls` output | `ls-config`/`whoami` feedback interprets ownership vs. deploy user | check "done" state + related-action CTA | `verify-deploy` gated `perms.configFixed`; `fix-mode` itself open at t0 (P4 note) |
| Network | topology, node addresses, ticket | probe results (ping / nslookup / tracert) | health labels derived by `netState` from **evidence keys only** (never `network.faults`) | `fix-gateway` gated `diagnostics.pingedPublicIp`; verify gated `fixedGateway` |
| Database | ladder rows honestly read **"not checked"** until probed; public ticket log quote | `check-port` / `check-service` set `portChecked` / `serviceChecked` → rows show real values | layer tone + state line + detail (evidence-driven) | `restart-db` gated `db.credsChecked`; `verify-query` gated `serviceStarted` |
| Security | `identity.failedAttempts` count (record) + raw mailbox | failed-logon review / mail analysis set `verifiedUser` / `mail.analyzed` | evidence-board rows appear only after the matching check (`rows.length > 0` gate) | `unlock-reset` gated `verifiedUser`; `report-phish` gated `mail.analyzed`; `educate-user` gated `mail.reported` |
| Support | reporter's own message (the symptom) | customer replies derived from world state | concepts revealed through conversation | n/a — no fix actions in support scenarios |
| Sysadmin | cross-cutting workspace routes to Linux/Windows by shell | inherits host-domain layers above | — | — |

**Fix-gating scan (all 15 scenarios, 33 `isFix` actions):** 22 GATED by
`appliesWhen` on evidence keys; 7 open at t0 (`reseat-ram`,
`start-service`, `fix-conf-mode`, `clear-temp`, `purge-recycle`, `fix-mode`
[state-weak], `verify-page`-style `value:false` gates that start true).
All seven are either (a) repairs whose target fault is already **observable
at t0** (fs modes 600/000, disk-full stated in the ticket, physical bench),
(b) partial steps that still cannot pass verification without evidence, or
(c) physically plausible first moves (reseat). None are highlighted or
marked correct by the UI — choosing correctly still requires domain
knowledge or a check. **Classified P4 (content-author decision), not
auto-fixed** — tightening gates = scenario mechanics, out of scope.

### Findings fixed (P1)

| ID | Finding | Fix |
|----|---------|-----|
| 9I-1 | **P1 — content clipping in console labs.** `.sim-workspace` is `overflow:hidden` (fixed height ≥1024px) and `WindowsLab`/`LinuxLab`/`SecurityLab` roots are plain `.panel` flex columns with **no scroll strategy** — at short viewports (e.g. 1024×640) tall content (checks strip, long event rows, fs + file preview) could overflow past the stage edge with no way to reach it. HW/NET/DB were unaffected (LabSection `overflow-hidden` + sized bodies). | Added `overflow-y-auto` to the three root sections (`WindowsLab`, `LinuxLab`, `SecurityLab`). Panel becomes the scroll container only when content exceeds it; layout unchanged when content fits. Confirmed by ui-ux-pro-max guideline ("Hidden overflow can clip important content … overflow-auto with scroll"). |
| 9I-2 | Regression coverage for the fix + the 9H Checks invariant | New `src/features/environments/consoleLabLayout.test.tsx` (3 tests): root carries `overflow-y-auto`; `role="status"` + accessible name `Diagnostic checks` present in all three labs. |

No P0 and no P2 findings were confirmed. Nothing else was changed.

### Findings documented, NOT fixed (P3/P4 — no scope expansion)

1. **DevDiagnostics toggle is always visible** in the scenario topbar; one
   click (then the Dev dock button) exposes `WorldInspector` — raw
   `run.world`, including hidden keys like `network.faults`. This complies
   with the written rule ("World Inspector remains developer-only —
   Diagnostics toggle"), but a hostile reading says the toggle itself is a
   permanent learner-facing answer channel. **P4:** gate rendering on
   `import.meta.env.DEV` or redact fault keys inside `WorldInspector`.
2. **Dead code** — `SimTerminal`'s trigger/hint/internal-open branches are
   unreachable (ScenarioPage always passes `expanded hideTrigger`);
   `InspectDock`'s `emptyHint` is unreachable (HardwareLab renders it only
   under `selectedHotspot`). **P4:** delete on next terminal pass.
3. **Entry-bundle chunk warning** — xterm enters the entry chunk via the
   static `ScenarioPage → SimTerminal` import chain. **P4:** lazy-load
   `SimTerminal` (likely largest remaining single win; do not touch the
   working mount architecture otherwise).
4. **`sim-feedback` floats top-right over the stage** and may cover a lab's
   top-right content until dismissed — by design (dismissible, identity-
   keyed); listed as a manual visual check at each breakpoint.
5. **ARIA tablist not used** — lab/workspace tabs are `aria-pressed`
   toggle buttons (no arrow-key roving). Documented deviation; the skills
   corpus returned no tablist guidance, so project grammar is authoritative.
6. **Event/process lists unvirtualized** (records ≤4 today) — kept from 9H.
7. **Hypothesis rail + ticket remain the only "instruction" surfaces** —
   audited: tickets state symptoms and public reporter evidence only
   (flagship four re-read verbatim); no ticket states the diagnosis.
8. **Scenario flag naming confusion** — `app.dependencyInstalled` is set by
   the *diagnostic* `read-faulting-module` (it really means
   "missing-dependency confirmed") and gates `install-dependency`. The flow
   works end-to-end (verified: check → flag → fix → verify), but the name
   reads backwards to maintainers. **P4 content rename** (would require
   engine test updates — deliberately not touched).
9. **Check descriptions exposed only via native `title`** (mouse-only in
   most browsers); visible labels are self-describing, so this is
   supplementary text. **P4:** `aria-description` or disclosure if the
   details matter for screen-reader users.

### Anti-slop scorecard (14 categories — pass / fail / needs review)

| Category | Result | Note |
|---|---|---|
| 1. Primary object dominance | PASS | stage-first in all envs |
| 2. Layout permanence (no permanent rails/duplicate lists) | PASS | drawers contextual; one canonical action list |
| 3. Inspector quality (no placeholder/JSON/catch-all) | PASS | dead `emptyHint` branch = P4 |
| 4. Terminal role, sizing, duplication, shell=none | PASS | single mount; trigger branches dead = P4 |
| 5. Evidence tier discipline + fix gating | PASS | 22/33 gated; 7 documented candidate repairs (P4) |
| 6. Action discoverability & distinction | PASS | inspectTarget integrity verified |
| 7. Card/panel discipline | PASS | containers = domain boundaries only |
| 8. Status channels (≥2, never color-only) | PASS | icon+text+disabled/shape everywhere |
| 9. Domain differentiation | PASS | per `DOMAIN_GRAMMAR` Part D |
| 10. Labels & chrome (domain nouns, no JSON/meta copy) | PASS | `formatValue`; no badges/instructions found |
| 11. Accessibility | PASS | focus-visible, reduced-motion, status regions, touch tiers; tablist deviation documented |
| 12. Responsive at 1024/1366/1440/1920/mobile | NEEDS REVIEW | code analysis passes; manual visual pass pending (user) |
| 13. Performance & motion | PASS | lazy chunks + frameloop demand intact; entry warning = P4 |
| 14. Dependencies & process | PASS | 0 new deps; no engine/scenario redesign |

**Skill/dependency recommendations explicitly rejected** (with reason):
44px universal touch targets (project's 40/36/32 tiers are grammar);
`@radix-ui/react-tabs` (8 deps for roving tabindex — buttons suffice);
`react-window` virtualization (max list = 4 rows); skeleton loaders
(world derivation is synchronous — no async shells exist); `role="alert"`
error modals (live `role="status"` feedback already in place); tablist
pattern (see deviations #5).

### Skills used (9I)

- **ui-ux-pro-max**: "scroll overflow long content panel layout" (validated
  9I-1 fix: hidden overflow clips content, overflow-auto preferred);
  "tabbed interface accessibility tablist" (no tablist guidance in corpus →
  documented deviation stands).
- **frontend-design** evaluation criteria (static): page-as-system,
  layout discipline, anti-anti-patterns — used as the pass/fail rubric for
  scorecard rows 1, 7, 10.
- **animations / R3F `three-d.md`**: unchanged verdict from 9H (demand
  frameloop, reduced-motion 2D fallback) — re-verified by build chunk graph.

### Verification (9I)

- `npx tsc -p tsconfig.app.json --noEmit` ✓
- `npm run lint` ✓ (0 problems)
- `npm run test` ✓ **121/121 (9 files)** — baseline 118 kept intact, +3 new
  console-lab layout/status tests; no test weakened
- `npm run build` ✓ `index-CLwiMICd.js` 977.13 kB / 270.99 gzip;
  `NetworkTopology-FF8XETlA.js` 181.23 / 58.37 (lazy);
  `HardwareScene-DKdyQAyP.js` 954.90 / 251.52 (lazy);
  CSS 81.61 + 11.14 kB — lazy split preserved, entry within budget

### Remaining manual checks (user — no browser E2E by mandate)

1. At **1024×640**: open Windows/Linux/Security scenarios, open terminal
   drawer — confirm lab content scrolls, checks strip reachable.
2. At **1366×768 / 1440×900 / 1920×1080**: no scrollbars appear where
   content fits; `sim-feedback` card doesn't block lab controls (it is
   dismissible).
3. Mobile (390×844): tab rows wrap, touch tiers (40/36/32), stage ≥55vh,
   drawer ≤44vh, terminal usable.
4. Reduced-motion emulation: hardware falls back to 2D, no transitions.
5. Keyboard-only pass: dock toggles, checks strips, inspector close
   buttons, xterm focus entry/exit.

### Known limitations (9I) & recommended next phase

- Findings 1–7 above are open-by-design (P3/P4) — none blocks acceptance.
- Responsive and keyboard passes remain manual (items 1–5).
- **Recommended next phase:** content-depth pass (9J candidate) — scenario
  copy richness + hint chains — **or** stop here if the product is accepted;
  no further UI restructure is indicated by this audit.

