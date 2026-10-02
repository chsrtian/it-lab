# Database Lab Architecture

How `/lab/db-connection-refused` and future `category: "database"` scenarios
render a database operations laboratory. Phase 9G; complements
`ENVIRONMENT_ARCHITECTURE.md` (shared lab contract) and `SIMULATION_ARCHITECTURE.md`
(engine, untouched).

## Purpose

The environment teaches one skill: **follow a connection failure down the
actual causal stack instead of guessing.** The stack itself is the UI — not a
diagram of it, not a checklist about it.

## Visual grammar (deliberately distinct from NetworkLab)

| | NetworkLab (9F) | DatabaseLab (9G) |
|---|---|---|
| Primary object | xyflow logical topology (nodes/edges) | DOM rack ladder (rows + containment bracket) |
| Structure | graph routes | vertical order = request path |
| Health vocabulary | probe chips + edge marks + legend | state word written on every layer row (no legend needed) |
| Investigation | probe strip → `.net-inspector` | CHECKS strip → `.db-inspector` + journal overlay |
| Root-cause artifact | diagnostic probe flags | systemd unit block + journal lines |
| Grammar | equipment silhouettes, routes, hops | systemd unit rows, sockets, wires, journal severity |

Shared: dark ops stage (`#0b1220`), lab panel chrome (`LabSection`),
contextual bottom-right inspector rendered only while selected, corner
overlays, evidence gates, restrained tones (`#86efac/#fbbf24/#f87171`), no
glow/gradient/card grids.

## Causal model — the ladder

```
app        CLIENT   API service            symptom lives here (public)
pool       CLIENT   Connection pool        dial state follows app
   ·····   wire     TCP {port} → {host}    connection channel, state on the wire
host       SERVER   {db01}                 ⊃ everything below (bracket)
  service  UNIT     postgresql.service     systemd state
  port     SOCKET   TCP 5432               listener state
  database INSTANCE {appdb}                serving state
  storage  VOLUME   Data directory         space state
```

Every row is a native `<button>` (`aria-pressed`, global `:focus-visible`)
rendering `icon + id + role` and `✓/!/✗/? + STATE + factual detail`. Click
toggles the contextual inspector for that layer.

## Evidence model (`src/features/database/dbState.ts`)

Pure functions, shared by ladder, wire, inspector, header status and tests —
mirrors `netState.ts`.

| World key | Gate | Effect |
|---|---|---|
| `db.credsChecked` | service evidence | service `UNTESTED` → `FAILED`/`RUNNING` etc.; unit `Active:` and errors shown |
| `db.portChecked` | port evidence | port `UNTESTED` → `CLOSED`/`FILTERED` (a positive listener is observable without it) |
| `db.verified` | fix evidence | app `CONNECTED`, pool `OPEN`, wire `ESTABLISHED`, status healthy |
| `network.faults.*` | consumed as families | `dbServiceDown`/`portBlocked`/`authFailed`/`maxConnections`/`diskFull`/`dbHostDown` → layer states only through the views above |
| `services[].status` | always world-driven | `dbServicePhase`: failed→FAILED, inactive→STOPPED, activating→STARTING, active→RUNNING — the UI never animates a fake progression |

t=0 contract (enforced by tests): symptom `ECONNREFUSED` visible, host `UP ·
answered TCP RST` (an RST proves the host answers), everything causal
`UNTESTED`, `dbStatus` = `app connection refused`. The bind error exists only
in `world.logs` (journal, opened on request) and behind the service check.

## Interaction map

| Surface | Behavior |
|---|---|
| Layer row | toggle select → `.db-inspector` (status line, facts, evidence, available actions, unit block for service, Open journal, Learn) |
| CHECKS strip (top-left) | applies the diagnostic (`onInspect` → `applyAction`, idempotent) and selects its related layer: `read-logs→app`, `check-port→port`, `check-service→service`; ✓ once applied |
| Journal toggle (top-right) | opens overlay: severity word + category chips (`connection, listener, startup, auth, storage, config`) + `source: text`; empty state per category |
| Wire | passive indicator: dashed muted = untested, dashed red = refused/filtered, solid green = established |
| Terminal (dock) | same world: `ss`/`netstat` world-aware, `systemctl`/`journalctl` already world-driven; commands map to actions via `matchHints` (`ss -tuln`, `journalctl -u postgresql`, `systemctl restart postgresql`) |
| LabSection status | `dbStatus`: unverified / app connection refused / postgresql failed / 5432 closed / app → db healthy |

Actions carry `component` (which layer the action belongs to) and
`inspectTarget` (which layer it investigates) — both feed inspector grouping
(`layerActions` via `availableActions`, `layerEvidence` via `appliedActions`).

## Terminal integration

- Allowlist unchanged: `ping, ss, systemctl, journalctl, help, ps` — no
  `psql`/`pg_isready` (no database engine is simulated).
- `ss`/`netstat` in `engine/terminal.ts` branch on `world.db`: listener rows
  only exist when `db.portListening`; ESTABLISHED only when `db.verified`.
  Non-db worlds keep the legacy static rows.
- `recordCommand` → `matchActionByText` connects command text to scenario
  actions (token overlap + `matchHints`), respecting `appliesWhen` gates —
  the engine pipeline is unchanged.

## Multi-fault extensibility

`dbAppFamily()` classifies refused / filtered / auth / capacity / verified
from fault flags and facts; storage `FULL`, host `DOWN` and port `FILTERED`
are independent. Adding a future scenario (wrong endpoint, max connections,
disk full, slow query, replication lag, pool exhaustion) requires:

1. world keys (`network.faults.*` or `db.*` flags) — no engine changes;
2. scenario actions with `component`/`inspectTarget`/`matchHints`;
3. only extend `dbState.ts` if a new **layer** or **family** is needed
   (existing layers are generic).

## Responsive & accessibility

- Stage: `.db-stage-wrap` fills the lab panel (min-height 460px,
  `overflow-y:auto`); ladder max-width 760px centered.
- <640px: rows wrap with the state line left-aligned; checks/log categories/
  journal toggle 36px, close buttons 40px.
- Non-color status: state word + `✓ ! ✗ ?` mark on every row; severity is a
  word; `aria-pressed` on rows/chips/toggles; `aria-label` on overlays, wire
  and lab region; DOM order = visual order; `prefers-reduced-motion` disables
  `sim-rise`.
- Inspector/journal are dismissible (close buttons); no keyboard trap (all
  interactive elements are buttons in normal flow).

## Testing

`src/features/database/dbState.test.ts` (24 tests) — pure layer/view
functions:

- evidence gates (t0 all-unrecorded; each check records only its own flag);
- t0 root-cause hiding (service/port/database `UNTESTED`, status = symptom);
- causal progression (check-port → CLOSED → check-service → FAILED with bind
  error → restart → RUNNING/LISTENING/READY, wire still refused → verify →
  CONNECTED/OPEN/ESTABLISHED/healthy);
- multi-fault families (auth/capacity/filtered/disk-full/host-down);
- `dbServicePhase` word mapping (incl. `inactive` not matching `active`);
- log classification (severity + category) and journal source parsing;
- structural contracts (7 layers, tone marks, uppercase states).

Gates: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`,
`npm run test`, `npm run build`. No browser E2E (by mandate).

## Out of scope / non-goals

- No real shell, database, sockets or network I/O — everything derives from
  `run.world`.
- No xyflow in the database lab (deliberate grammar difference; bundle stays
  out of this lab).
- No permanent hypothesis/action/step/status panels; no instruction prose in
  the environment (feedback lives in the learning-loop card).
- No KPI widgets, dashboards, glows, gradients or emoji (see
  `UI_DESIGN_REVIEW.md` Phase 9G anti-slop list).
