# Domain Grammar — One Product Language, Multiple Domain Languages

Status: Phase 9H. This document is the binding grammar for every learning
environment in the IT simulator. It answers three questions: what every lab
shares (product grammar), what each domain expresses differently (domain
grammars), and how to tell a well-formed lab from a violation.

Companion checklist: `docs/UI_ANTI_SLOP_RULES.md` (permanent NO/YES rules).
Review log: `docs/UI_DESIGN_REVIEW.md` (Phase 9H section).

## Why

Learners move between labs inside one product. If chrome, interaction, and
evidence behave differently in every lab, the product feels like seven demos.
If all labs are forced into one template, each domain stops looking like the
real IT work it teaches. The resolution: **consistency from interaction
principles, typography, spacing, accessibility, feedback, contextual tools,
progressive disclosure, state representation, motion, navigation and
inspection — never from identical layouts.**

---

## Part A — Product-level grammar (10 rules)

**R1 — One product language, many domain languages.**
Shared: dark lab chrome, panel/tab/checks/row/chip components, type scale
(10px uppercase section labels, 12px mono data, 12-14px controls), spacing
rhythm (`p-2` chrome / `p-3` content), focus rings, lucide icons with
`aria-hidden`, feedback vocabulary (checks/probes, done, evidence). Domain-
specific: what the stage is, what is selectable, what "the tool" is, how
evidence appears, what the terminal means.

**R2 — Simulation-first.**
Every environment value derives from `run.world` or engine state. Labs never
invent status, metrics, progress numbers, or second sources of truth. Action
effects are visible: a fix that patches the world must change something a
learner can observe in the lab (or in the learning loop if it is a
ticket-plane change).

**R3 — Evidence discipline (position of every fact).**
Three tiers, in order:
1. *Persistent records and directly observable state* — visible on artifact
   surfaces without gating (event log rows, `ls -l` mode columns, disk usage,
   failed-logon count, topology device states already probed).
2. *Interpretations and verdicts* — gated behind diagnostic checks
   (`isDiagnostic` → applied), exactly like `dbState` UNTESTED layers:
   `mail.analyzed` reveals sender/link analysis; service/port state waits
   for the check that tested it.
3. *Fixes and wrong paths* — gated by `appliesWhen` / `availableActions`;
   learners reach them through the dock (R4).
Logs are artifacts, not verdicts: opening a log is investigation (deliberate
view), while the actionable conclusion stays gated.

**R4 — One canonical action list; in-lab tools are investigation.**
The ScenarioPage dock Actions drawer is the single full action list. Inside a
lab, only `isDiagnostic` actions may appear as a tool strip (the Checks
strip). Contextual buttons (next to a selected row/file/service) may promote
`isFix`/`isDiagnostic` actions **that are currently available**; wrong-path
traps never get promoted — they stay in the dock where their description can
warn.

**R5 — Progressive disclosure: no surface without a data source.**
A tab/view renders only when its world key exists and is non-empty
(Windows/Linux conditional tab lists; Storage appears only for `world.disks`).
Selection panels appear only with a selection. Inspectors appear only while
an object is selected. An empty placeholder for an *absent* key is a
violation; an empty state for a *present but empty* transient (a log cleared
mid-run) is allowed.

**R6 — Readable domain text, never raw data dumps.**
World values render through `formatValue()` (shared `features/env/formatValue`)
as `key: value` lines. `JSON.stringify`, `Object.entries(run.world)`
catch-alls, and developer-shaped blobs are banned from learner UI. The raw
World Inspector remains developer-only (Diagnostics toggle).

**R7 — Shared interaction kit.**
- Tabs/segments: `<button aria-pressed>` + `.lab-tab`; active = sky tint +
  border; tab bar has `gap-1.5`.
- List rows that are selectable: `<button aria-pressed>` + `.lab-row`.
- Tool strip: "Checks" block, `role="status" aria-label="Diagnostic checks"`,
  one button per `isDiagnostic` action, `disabled` + "done" when applied,
  `title` = description.
- Contextual action button: `btn-secondary`, full width, label only.
- Learn chips: `.chip` → KB article id (concept map), never decoration.
- Every interactive element is a native button (keyboard order = visual
  order); focus ring is global `:focus-visible`.
- Mobile touch tiers: `.sim-btn`/`.dock-btn` 40px, `.lab-tab`/`.lab-row`
  36px, `.chip` 32px (WCAG 2.2 target-size minimum is 24px; project tiers
  are deliberate).

**R8 — Honest labeling.**
Status = color **and** text (or icon). Labels use domain nouns and scenario
world names ("ReportSvc", "C:"), never implementation metadata
(`environment.kind`, "shell available", "panel only"). No instruction copy
inside panels ("click a path", "click to inspect") — affordance comes from
affordance (rows look/act like rows) plus aria attributes.

**R9 — Motion budget.**
State transitions only (150–500ms, color/opacity/transform). No decorative
loops, no shimmer, no bouncing affordances. `prefers-reduced-motion` honored
globally; R3F scenes follow `frameloop="demand"`, `dpr=[1,2]`, delta-based
`useFrame`, refs-not-state, and the reduced-motion → 2D gate.

**R10 — Domain realism over UI fashion.**
Each lab should be mistakable for the real professional tool of its domain.
Anti card-grid: environments are surfaces, not collections of equal tiles.
Icons are lucide SVG (`aria-hidden` when paired with text). No emoji. No new
dependency when a few lines of existing pattern suffice (see research log in
the 9H report).

---

## Part B — Layout selection criteria (no universal template)

Choose the stage by **what the domain's primary object is**:

| Primary object is… | Stage shape | Labs |
|---|---|---|
| Physical device with spatial parts | Full-bleed stage (3D lazy + 2D SVG) + contextual inspector | Hardware |
| Connected system of peers/nodes | Flow topology + side probes panel + contextual inspector | Network |
| Causal layered service stack | Vertical/horizontal ladder (rungs = layers) + contextual inspector | Database |
| OS record surfaces (GUI console) | Tabbed console + record pane + Checks strip | Windows |
| OS file/process/unit surfaces | Tabbed views + tree/list + Checks strip | Linux |
| Case artifacts (messages, identities, evidence) | Evidence board: Checks + Evidence columns | Security |
| Human conversation | Chat thread + inputs + state strip | Support |
| The ticketing workplace itself | ScenarioPage workspace: topbar → stage → dock (Actions/Terminal/Journal) | all (Sysadmin plane) |

Rules of thumb: physical → spatial; abstract causal → graph/ladder; records →
list/table with deliberate open; findings → board; people → conversation.
Selection always yields a contextual surface (inspector, detail block, or
contextual action) — never a modal for routine inspection.

---

## Part C — Domain grammars

### Hardware
- **Primary environment:** chassis/bench (3D R3F lazy, capability-gated; SVG fallback mandatory).
- **Core objects:** PSU, motherboard, CPU/cooler, RAM, GPU, storage, front panel, cables.
- **Interaction:** select parts (click, legend chips for keyboard) → contextual `.hw-inspector`.
- **State:** power chain wall→PSU→MB→FP→POST derived by `deriveWorld()` (engine-owned causality).
- **Evidence:** physical observability (switch position, latch, seating) + evidence rows in inspector.
- **Tools:** hardware `isDiagnostic` checks strip (legend + checks), fixes via dock.
- **Inspector:** bottom-right overlay while selected; legend = keyboard-equivalent path.
- **Terminal role:** none in-scene (`shell: "none"` scenarios); shell only if scenario declares one.
- **Learning role:** chips → component KB articles.
- **Failure/success:** chain indicators (wall power, standby, POST) + status text, never color-only.
- **Anti-patterns:** replacing the bench with spec cards; making 3D the only path to any fact.

### Equipment
- **Primary environment:** device bench — `EquipmentLab` shared chrome + per-family 2D SVG, with lazy capability-gated 3D stage (`EquipmentLabView`, Phase 11).
- **Core objects:** printer, router, switch, access point, UPS, patch panel; ports, LEDs, cables, keystone jacks; exactly one `environment.deviceFamily` per scenario, components listed in `environment.components`.
- **Interaction:** select component (SVG hotspot `g.hotspot` or legend chip) → shared InspectDock; 3D stage `PART_IDS` mirror component ids so selection/status/LEDs stay in lockstep across projections.
- **State:** engine causality via `deriveEquipment()` over `printer.*` / `router.*` / `switch.*` / `ap.*` / `ups.*` / `patch.*` (power, link, PoE, DHCP, path derived; initial seeds stable under `deriveWorld()`).
- **Evidence:** ticket symptoms, LEDs, and effect words always visible; configuration/hidden facts gated behind `*Checked` evidence flags (`when` on evidence entries — R5 progressive disclosure).
- **Tools:** `isDiagnostic` checks strip (`device-panel`, `inspection`, `cable-tracer` for patch); fixes and `*-wrong` traps via the dock only.
- **Inspector:** shared `.hw-inspector` (InspectDock) with identity, gated evidence rows, chain steps (`data-chain-step`); legend chips = keyboard-equivalent path.
- **Terminal role:** none (`shell: "none"`); the device panel and inspection tools are the lab.
- **Learning role:** chips → equipment KB articles (device basics, PoE basics, DHCP basics, structured cabling).
- **Failure/success:** family status + LED/link/path indicators with text; verify gates on family success conditions (`printer.printReady`, `router.clientPath`, `switch.ports[].link/path`, `ap.pathOk`, `ups.outputPresent`/`onUtility`, `patch.pathOk`).
- **Anti-patterns:** scenario-id branching in renderers (declarative chain only); showing gated config facts before a check records them; ghost components (SVG hotspots must match `environment.components`); making 3D the only path to any fact.

### Network
- **Primary environment:** topology stage (equipment silhouettes, edges) — `NetworkLab`.
- **Core objects:** hosts, gateway, DNS, links, zones, probe points.
- **Interaction:** select node/edge/link → `.net-inspector`; probes as `isDiagnostic` strip (`.net-probes`).
- **State:** evidence-driven health from `netState.ts` (probe flags + locally observable facts only; raw faults never rendered).
- **Evidence:** probe results (gated) + inspector evidence rows; positive-observable states visible at t0.
- **Tools:** probes (`ping`, `dns-query`, …) in-lab; fixes (restart resolver, change DHCP…) in dock.
- **Inspector:** contextual `aside.net-inspector`; `.net-chips` quick-select for keyboard.
- **Terminal role:** one dock tool; `nslookup`/`ping`-class commands world-aware (`netState`), confirmation layer for probes.
- **Learning role:** chips → networking KB.
- **Failure/success:** edge marks `?/✓/!/✗` + legend text; route highlight on evidence.
- **Anti-patterns:** dumping `network.faults` verbatim; showing unresolved fault names as labels.

### Database
- **Primary environment:** causal rack ladder — `DatabaseLab`.
- **Core objects:** application, connection pool, TCP channel, host ⊃ service → port → database → storage.
- **Interaction:** select rung → `.db-inspector`; unit block shows the service's systemd line.
- **State:** `dbState.ts` layer views (service/port/database UNTESTED until a check records evidence; positive states visible, failures gated; `dbServicePhase` mapping; `dbClassifyLog` categories).
- **Evidence:** journal overlay (artifact, opened deliberately) vs layer verdicts (gated) — the R3 reference for all labs.
- **Tools:** `isDiagnostic` checks (`.db-checks`); fixes via dock; no SQL shell (mandate: verification is a UI action).
- **Inspector:** contextual `aside.db-inspector` (rows are native buttons).
- **Terminal role:** dock tool only; `ss`/`netstat` world-aware (`world.db` LISTEN/ESTABLISHED).
- **Learning role:** chips → DB KB.
- **Failure/success:** rung tones + channel state; journal `ERROR/WARN/INFO` lines with icons.
- **Anti-patterns:** status-card grid for tiers; rendering bind failures as verdicts before any check.

### Windows
- **Primary environment:** MMC-style console — `WindowsLab`.
- **Core objects:** event log records, services, processes, disks, boot state.
- **Interaction:** switch console tabs; select a service row → contextual action button (available fix/diagnostic).
- **State:** tab lists are conditional on world keys (`logs`, `services`, `processes`, `disks`); pane shows records verbatim as readable lines via `formatValue`.
- **Evidence:** tier 1 (records) visible in panes; tier 3 (fixes) gated by `appliesWhen`; boot/app/storage verdicts surface through checks + learning loop.
- **Tools:** Checks strip = `isDiagnostic` (open-event-viewer, read-faulting-module, check-storage, boot-recovery, safe-mode…); all fixes and wrong paths in the dock.
- **Inspector:** no full aside; selection = row highlight + contextual `btn-secondary` action (matchHints/inspectTarget against available actions).
- **Terminal role:** dock tool when `shell === "windows"`; secondary confirmation surface.
- **Learning role:** "Learn event logs" links + chips → KB.
- **Failure/success:** service status words, log severity words (INFO/WARN/ERROR), disk percentages with amber threshold — all with text.
- **Anti-patterns:** permanent ungated action rails duplicating the dock; `JSON.stringify` events; empty tabs for absent keys; meta badges (`environment.kind`).

### Linux
- **Primary environment:** filesystem-centric console — `LinuxLab`.
- **Core objects:** fs tree (`ls -l` columns: mode/owner/group), systemd units, processes, packages, users/groups.
- **Interaction:** switch views (conditional on data); select file path → detail block + contextual action; terminal commands for journal/process truth.
- **State:** direct observation at t0 (perms are facts, like `ls -l`); service verdicts gated via checks (`systemctl-status`, `journalctl-review`); fixes (`fix-mode`, `fix-conf-mode`) gated.
- **Evidence:** fs facts tier 1; `evidenceGain` from applied checks; journal lives in the terminal (not a GUI tab) — the domain-correct distinction from Windows Event Viewer.
- **Tools:** Checks strip = terminal diagnostics; fixes in dock; wrong paths (chmod 777, reboot-blind) in dock only.
- **Inspector:** selection-conditional detail block (path, mode, lines, content) with contextual action.
- **Terminal role:** first-class dock tool — `whoami`/`ls`/`systemctl`/`journalctl` are world-aware; the shell is how a Linux admin investigates.
- **Learning role:** "Learn systemd services" + chips → KB.
- **Failure/success:** unit state words (active/failed), mode strings (`660 root:app`), deploy write test result — text-first.
- **Anti-patterns**: JSON packages/processes; permanent "Linux steps" rails; instructional copy; shell-availability badges.

### Security
- **Primary environment:** SOC evidence board — `SecurityLab`.
- **Core objects:** message artifacts (sender, link, subject), identity records (lockout, failed attempts), case actions.
- **Interaction:** run checks; board accumulates findings; chips → security KB.
- **State:** ticket-public facts (failed logon count) visible; interpretations (`mail.analyzed` → sender domain/link host) gated by checks; applied actions append finding rows.
- **Evidence:** the board *is* the evidence: gated fact rows + per-action rows (`evidenceGain ?? feedback`), readable text only.
- **Tools:** Checks = `isDiagnostic` (inspect-sender, inspect-link, check-recent-failures); report/educate/verify/wrong-path via dock.
- **Inspector:** no object selection in this domain; the board's right column appears only when evidence exists (Checks span the board until then).
- **Terminal role:** none required (mail/identity case); scenario shell decides.
- **Learning role:** concept chips map to phishing/least-privilege KB.
- **Failure/success:** report → quarantine/closed rows; wrong path (clicking the link) → coaching in the learning loop.
- **Anti-patterns:** catch-all `Object.entries(world)` JSON dumps; permanent "Investigation steps" rails; empty "No evidence collected yet." placeholders; visible-selection metadata lines.

### Support
- **Primary environment:** conversation — `SupportLab` (also `customer` dock drawer for other categories).
- **Core objects:** ticket thread, customer messages, inputs, device/account state strip.
- **Interaction:** read → compose/choose reply → customer responds (engine conversation).
- **State:** printer/identity facts in a strip; conversation progress is run state.
- **Evidence:** user-reported claims vs verified state (engine scoring decides).
- **Tools:** conversational actions in-thread; technical fixes still dock-registered.
- **Inspector:** state strip (no object inspector).
- **Terminal role:** only if the scenario's shell allows; customer context comes first.
- **Learning role:** chips → soft-skill/KB articles.
- **Failure/success:** tone/approach quality in debrief, not board metrics.
- **Anti-patterns:** rendering engine conversation internals; metrics tiles for "customer satisfaction" that do not exist in run state.

### Sysadmin (cross-cutting workspace)
- **Primary environment:** the ScenarioPage workspace itself (topbar → stage → dock).
- **Core objects:** ticket, objective, status, verify, hints, Actions drawer, Terminal drawer, Journal, hypotheses/debrief.
- **Interaction:** stage-first focus; drawers open only on request, one at a time; no permanent rails.
- **State:** engine `RunState` only; score folded into Journal.
- **Evidence:** learning-loop cards (`evidenceGain`) + lab surfaces per domain grammar.
- **Tools:** dock Actions = canonical list (R4).
- **Inspector:** delegated to the domain lab.
- **Terminal role:** dock tool, allowlisted commands, world-aware responses.
- **Learning role:** KB drawer + hypotheses + debrief (engine-owned).
- **Failure/success:** verify gate → debrief scoring (engine-owned).
- **Anti-patterns:** sidebars competing with the stage; duplicate action lists outside the dock; UI-computed scores.

---

## Part D — Pairwise differentiation test

"Could these two labs be confused?" — asked for every pair, with the
axis that separates them:

| Pair | Separated by |
|---|---|
| Hardware ↔ Network | Physical chassis/part selection vs abstract topology/link selection; 3D/SVG bench vs silhouette graph |
| Hardware ↔ Database | Physical causality (power chain) vs service causality (rack ladder); spatial vs layered |
| Hardware ↔ Windows | Selecting parts vs switching record tabs |
| Hardware ↔ Linux | Chassis vs filesystem tree |
| Hardware ↔ Security | Parts vs case artifacts (no physical objects) |
| Hardware ↔ Support | Objects vs conversation |
| Hardware ↔ Equipment | Chassis internals + power chain (`bench.*`) vs whole devices with ports/LEDs/link paths; single shared bench world vs six equipment namespaces |
| Network ↔ Equipment | Abstract topology graph + probe strip vs literal device faces inspected via panel/LEDs; NetworkLab's equipment silhouettes are read-only nodes, Equipment lab selects objects |
| Database ↔ Equipment | Service/ladder causality vs physical link/PoE/path causality; rungs vs device components |
| Windows ↔ Equipment | Record tabs vs device component selection; logs vs LEDs |
| Linux ↔ Equipment | Filesystem tree + shell vs device bench + inspection tools |
| Security ↔ Equipment | Case artifacts (messages/identity) vs physical devices (no artifacts) |
| Equipment ↔ Support | Support's printer strip is a passive state readout beside a conversation; Equipment lab is object selection (hotspots/legend/3D) with no conversation |
| Network ↔ Database | Peer graph + probe strip vs layered ladder + checks strip; equipment silhouettes vs rack rungs/units |
| Network ↔ Windows | Link health marks vs log/service records; probes vs console tabs |
| Network ↔ Linux | Topology vs fs tree; `ping`/`dns-query` vs `systemctl`/`journalctl` |
| Network ↔ Security | Devices/links vs messages/identity |
| Database ↔ Windows | Ladder layers vs tab panes; both show logs — DB journal is a deliberate overlay tied to a rung, Windows logs are a primary tab; DB has the unit block, Windows has service rows |
| Database ↔ Linux | Service ladder vs fs tree; DB has no SQL shell, Linux has a first-class shell |
| Database ↔ Security | Layer verdicts vs finding rows |
| Windows ↔ Linux | **Closest pair.** Console tabs + Event Viewer vs Filesystem-first views + terminal journal; GUI "Services" word-list vs systemd unit list with descriptions; Windows never shows a filesystem tree, Linux never shows an Event Viewer |
| Windows ↔ Security | Record panes vs evidence board; Windows inspects machine, Security inspects case artifacts |
| Windows ↔ Support | Records vs conversation |
| Linux ↔ Security | fs/systemd vs mail/identity; Linux evidence = command output, Security evidence = board rows |
| Linux ↔ Support | Console vs chat |
| Security ↔ Support | Deterministic artifact board vs human thread with engine-scored replies |
| Support ↔ all others | Only lab whose primary interaction is natural language |

Pass criterion: for every pair, at least two independent axes differ (stage
shape + tool vocabulary + evidence source). Closest pair (Windows/Linux)
differs by default view, record types, and terminal weight.

---

## Part E — Enforcement

1. **Static gates:** `tsc`, `eslint`, `vitest`, `vite build` on every phase.
2. **Checklist:** `docs/UI_ANTI_SLOP_RULES.md` — run before claiming any lab done.
3. **Audit:** phases 9I+ must re-run the code-level audit (this grammar's
   Part C fields) when touching environments; "no violations found" is a
   valid outcome.
4. **Explicit non-goals:** engine, ScenarioPage layout, and scenario
   mechanics are out of scope for UI grammar work; grammar changes that
   would require engine changes must be proposed as engine phases first.
